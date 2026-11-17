from __future__ import annotations

import csv
import importlib.metadata
import json
import os
import platform
import subprocess
import threading
import time
from urllib.parse import urlsplit
from pathlib import Path
from typing import Any

import numpy as np
import psutil
from PIL import Image

from .adapters import create_adapter
from .dataset import load_manifest, open_sample, sha256
from .metrics import score
from .summarize import summarize


class PeakRss:
    def __enter__(self):
        self.process = psutil.Process()
        self.peak = self.process.memory_info().rss
        self.stop = threading.Event()

        def sample():
            while not self.stop.wait(0.05):
                try:
                    self.peak = max(self.peak, self.process.memory_info().rss)
                except psutil.Error:
                    return

        self.thread = threading.Thread(target=sample, daemon=True)
        self.thread.start()
        return self

    def __exit__(self, *_):
        self.peak = max(self.peak, self.process.memory_info().rss)
        self.stop.set()
        self.thread.join()


def _nvidia_smi() -> str | None:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.used,memory.total,temperature.gpu,driver_version", "--format=csv,noheader,nounits"],
            check=True, capture_output=True, text=True, timeout=3,
        )
        return result.stdout.strip().splitlines()[0]
    except (OSError, subprocess.SubprocessError, IndexError):
        return None


def _gpu_sample() -> dict[str, float] | None:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.used,memory.total,temperature.gpu,utilization.gpu", "--format=csv,noheader,nounits"],
            check=True, capture_output=True, text=True, timeout=3,
        )
        fields = [field.strip() for field in result.stdout.strip().splitlines()[0].split(",")]
        if len(fields) != 4 or any(value in {"N/A", "[Not Supported]"} for value in fields):
            return None
        return dict(zip(("memory_used_mib", "memory_total_mib", "temperature_c", "gpu_utilization_percent"), map(float, fields)))
    except (OSError, ValueError, subprocess.SubprocessError, IndexError):
        return None


class GpuTelemetry:
    """Samples system-wide nvidia-smi counters; values are not process-attributed."""
    def __init__(self, interval_seconds: float = 0.5):
        self.interval_seconds = interval_seconds
        self.samples: list[dict[str, float]] = []
        self.stop_event = threading.Event()
        self.thread: threading.Thread | None = None

    def _sample(self):
        value = _gpu_sample()
        if value:
            self.samples.append(value)

    def start(self):
        self._sample()

        def poll():
            while not self.stop_event.wait(self.interval_seconds):
                self._sample()

        self.thread = threading.Thread(target=poll, daemon=True)
        self.thread.start()

    def stop(self) -> dict[str, Any]:
        self._sample()
        self.stop_event.set()
        if self.thread:
            self.thread.join()
        keys = self.samples[0].keys() if self.samples else ()
        return {
            "sample_count": len(self.samples),
            "scope": "system-wide nvidia-smi; not attributable to this process",
            "peak": {key: max(sample[key] for sample in self.samples) for key in keys},
            "first": self.samples[0] if self.samples else None,
            "last": self.samples[-1] if self.samples else None,
        }


def _select_items(items: list[dict[str, Any]], limit: int | None, sample_ids: list[str] | None):
    if sample_ids is not None:
        if len(sample_ids) != len(set(sample_ids)):
            raise ValueError("sample IDs must be unique")
        by_id = {item["id"]: item for item in items}
        missing = set(sample_ids) - by_id.keys()
        if missing:
            raise ValueError(f"unknown sample IDs: {sorted(missing)}")
        items = [by_id[sample_id] for sample_id in sample_ids]
    if limit is not None:
        if limit < 1:
            raise ValueError("limit must be at least 1")
        items = items[:limit]
    return items


def _model_artifacts(
    cache_dir: Path,
    spec: dict[str, Any],
    inventory_path: Path | None = None,
) -> tuple[list[dict[str, Any]], str | None, str | None, bool, str]:
    inventory_path = inventory_path or Path(__file__).resolve().parents[1] / "config" / "model-artifacts.json"
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    expected = next((entry for entry in inventory.get("artifacts", []) if entry.get("id") == spec.get("id")), None)
    expected_name = (expected or {}).get("artifact") or Path(urlsplit(spec.get("weights_source", "")).path).name
    expected_hash = (expected or {}).get("sha256")
    if not expected_name:
        return [], None, expected_hash, False, "no_expected_artifact"
    matches = sorted(path for path in cache_dir.rglob("*.onnx") if path.name == expected_name)
    artifacts = [{"filename": path.name, "bytes": path.stat().st_size, "sha256": sha256(path)} for path in matches]
    if not matches:
        return artifacts, expected_name, expected_hash, False, "artifact_missing"
    if len(matches) != 1:
        return artifacts, expected_name, expected_hash, False, "artifact_ambiguous"
    if expected is None or not expected.get("sha256") or not expected.get("bytes"):
        return artifacts, expected_name, expected_hash, False, "expected_hash_or_size_missing"
    if artifacts[0]["sha256"] != expected["sha256"] or artifacts[0]["bytes"] != expected["bytes"]:
        return artifacts, expected_name, expected_hash, False, "artifact_hash_or_size_mismatch"
    return artifacts, expected_name, expected_hash, True, "verified"


def run(
    manifest_path: Path,
    models_path: Path,
    output_dir: Path,
    limit: int | None = None,
    provider: str | None = None,
    sample_ids: list[str] | None = None,
    profile: bool = False,
) -> list[dict[str, Any]]:
    items = _select_items(load_manifest(manifest_path), limit, sample_ids)
    models = json.loads(models_path.read_text(encoding="utf-8"))
    dataset_root = manifest_path.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, Any]] = []
    metadata = {
        "schema_version": 2,
        "started_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "python": platform.python_version(),
        "platform": platform.platform(),
        "cpu_count_logical": os.cpu_count(),
        "ram_total_bytes": psutil.virtual_memory().total,
        "ram_available_bytes_at_start": psutil.virtual_memory().available,
        "nvidia_smi_before": _nvidia_smi(),
        "manifest_sha256": sha256(manifest_path),
        "requested_items": len(items),
        "paired_sample_ids": [item["id"] for item in items],
        "requested_provider": provider,
        "profiling_requested": profile or provider == "CUDAExecutionProvider",
        "packages": {name: _package_version(name) for name in ("numpy", "Pillow", "psutil", "rembg", "onnxruntime")},
    }
    (output_dir / "run-environment.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    for spec in models:
        model_dir = output_dir / spec["id"]
        (model_dir / "masks").mkdir(parents=True, exist_ok=True)
        (model_dir / "cutouts").mkdir(parents=True, exist_ok=True)
        row_start = len(rows)
        telemetry = GpuTelemetry()
        telemetry.start()
        adapter = None
        load_seconds = None
        warmup_seconds = None
        load_peak = None
        providers: list[str] = []
        model_input_shape = None
        artifacts: list[dict[str, Any]] = []
        failure_stage = "load"
        try:
            effective_spec = {**spec, **({"expected_provider": provider} if provider else {})}
            effective_provider = effective_spec.get("expected_provider", "CPUExecutionProvider")
            profile_prefix = model_dir / "onnx-profile" if profile or effective_provider == "CUDAExecutionProvider" else None
            adapter = create_adapter(effective_spec, provider, profile_prefix)
            started = time.perf_counter()
            with PeakRss() as memory:
                adapter.load()
            load_seconds = time.perf_counter() - started
            providers = adapter.providers or []
            load_peak = memory.peak
            model_input_shape = getattr(adapter, "model_input_shape", None)
            cache_dir = Path(__file__).resolve().parents[1] / "models" / "rembg"
            artifacts, expected_artifact, expected_artifact_hash, artifact_verified, artifact_status = _model_artifacts(cache_dir, spec)
            if items:
                failure_stage = "warmup"
                warmup_image, _ = open_sample(dataset_root, items[0])
                started = time.perf_counter()
                adapter.predict(warmup_image)
                warmup_seconds = time.perf_counter() - started
        except Exception as exc:
            rows.append({"model_id": spec["id"], "status": f"model_{failure_stage}_error", "error": f"{type(exc).__name__}: {exc}"})

        if adapter is not None and warmup_seconds is not None:
            for index, item in enumerate(items):
                base = {
                    "model_id": spec["id"],
                    "sample_id": item["id"],
                    "evaluation_group": item.get("evaluation_group", "unspecified"),
                    "category": item["category"],
                    "status": "ok",
                    "ground_truth_type": item.get("ground_truth_type", "continuous_alpha_matte" if item.get("ground_truth") else "none"),
                }
                try:
                    image, truth_image = open_sample(dataset_root, item)
                    started = time.perf_counter()
                    with PeakRss() as memory:
                        prediction = adapter.predict(image)
                    elapsed = time.perf_counter() - started
                    alpha = Image.fromarray(np.round(prediction * 255).astype(np.uint8), mode="L")
                    alpha_path = model_dir / "masks" / f"{item['id']}.png"
                    cutout_path = model_dir / "cutouts" / f"{item['id']}.png"
                    alpha.save(alpha_path)
                    rgba = image.convert("RGBA")
                    rgba.putalpha(alpha)
                    rgba.save(cutout_path)
                    metrics: dict[str, Any] = {}
                    if truth_image is not None:
                        truth = np.asarray(truth_image, dtype=np.float32) / 255.0
                        metrics = score(prediction, truth)
                    rows.append({
                        **base,
                        "inference_seconds": elapsed,
                        "timing_scope": "adapter end-to-end (encode, preprocessing, runtime, mask decode/resize)",
                        "load_seconds": load_seconds if index == 0 else None,
                        "warmup_seconds": warmup_seconds if index == 0 else None,
                        "provider": ",".join(providers),
                        "requested_provider": provider or spec.get("expected_provider", "CPUExecutionProvider"),
                        "profiling_requested": bool(profile or effective_provider == "CUDAExecutionProvider"),
                        "model_input_shape": json.dumps(model_input_shape),
                        "expected_model_artifact": expected_artifact,
                        "expected_model_artifact_sha256": expected_artifact_hash,
                        "model_artifact_verified": artifact_verified,
                        "model_artifact_status": artifact_status,
                        "original_size": f"{image.width}x{image.height}",
                        "mask_output_size": f"{alpha.width}x{alpha.height}",
                        "metric_scope": item.get("ground_truth_type", "continuous_alpha_matte") if truth_image is not None else "not_scored_no_ground_truth",
                        "model_artifacts": json.dumps(artifacts, sort_keys=True),
                        "rss_peak_bytes": memory.peak,
                        "load_rss_peak_bytes": load_peak if index == 0 else None,
                        "system_gpu_memory_at_model_start": _nvidia_smi() if index == 0 else None,
                        "prediction_sha256": sha256(alpha_path),
                        **metrics,
                    })
                except Exception as exc:
                    rows.append({**base, "status": "inference_error", "error": f"{type(exc).__name__}: {exc}"})

        profile_result = {"profile_status": "not_supported_by_adapter"}
        if adapter is not None and hasattr(adapter, "finish_profile"):
            try:
                profile_result = adapter.finish_profile()
            except Exception as exc:
                profile_result = {"profile_status": "error", "profile_error": f"{type(exc).__name__}: {exc}"}
        gpu_result = telemetry.stop()
        for row in rows[row_start:]:
            row.update({
                "active_providers": providers,
                "cuda_execution_confirmed": profile_result.get("provider_node_events", {}).get("CUDAExecutionProvider", 0) > 0,
                "model_input_shape": row.get("model_input_shape", json.dumps(model_input_shape)),
                **profile_result,
                "gpu_telemetry": json.dumps(gpu_result, sort_keys=True),
            })

    (output_dir / "results.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    columns = sorted({key for row in rows for key in row})
    with (output_dir / "results.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
    summary = summarize(rows)
    summary["_run"] = {
        "requested_items": len(items),
        "paired_sample_ids": [item["id"] for item in items],
        "manifest_sha256": metadata["manifest_sha256"],
        "requested_provider": provider,
        "nvidia_smi_before": metadata["nvidia_smi_before"],
        "nvidia_smi_after": _nvidia_smi(),
    }
    (output_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return rows


def _package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None
