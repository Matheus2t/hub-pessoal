from __future__ import annotations

import csv
import importlib.metadata
import json
import os
import platform
import subprocess
import threading
import time
from pathlib import Path
from typing import Any

import numpy as np
import psutil
from PIL import Image

from .adapters import create_adapter
from .dataset import load_manifest, open_pair, sha256
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
            ["nvidia-smi", "--query-gpu=name,memory.used,memory.total", "--format=csv,noheader,nounits"],
            check=True, capture_output=True, text=True, timeout=3,
        )
        return result.stdout.strip().splitlines()[0]
    except (OSError, subprocess.SubprocessError, IndexError):
        return None


def run(manifest_path: Path, models_path: Path, output_dir: Path, limit: int | None = None) -> list[dict[str, Any]]:
    items = load_manifest(manifest_path)
    if limit:
        items = items[:limit]
    models = json.loads(models_path.read_text(encoding="utf-8"))
    dataset_root = manifest_path.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, Any]] = []
    metadata = {
        "schema_version": 1,
        "started_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "python": platform.python_version(),
        "platform": platform.platform(),
        "cpu_count_logical": os.cpu_count(),
        "ram_total_bytes": psutil.virtual_memory().total,
        "ram_available_bytes_at_start": psutil.virtual_memory().available,
        "nvidia_smi_before": _nvidia_smi(),
        "manifest_sha256": sha256(manifest_path),
        "requested_items": len(items),
        "packages": {name: _package_version(name) for name in ("numpy", "Pillow", "psutil", "rembg", "onnxruntime")},
    }
    (output_dir / "run-environment.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    for spec in models:
        model_dir = output_dir / spec["id"]
        (model_dir / "masks").mkdir(parents=True, exist_ok=True)
        (model_dir / "cutouts").mkdir(parents=True, exist_ok=True)
        row_start = len(rows)
        load_seconds = None
        providers: list[str] = []
        try:
            adapter = create_adapter(spec)
            started = time.perf_counter()
            with PeakRss() as memory:
                adapter.load()
            load_seconds = time.perf_counter() - started
            providers = adapter.providers or []
            load_peak = memory.peak
            cache_dir = Path(__file__).resolve().parents[1] / "models" / "rembg"
            artifacts = [
                {"filename": path.name, "bytes": path.stat().st_size, "sha256": sha256(path)}
                for path in sorted(cache_dir.rglob("*.onnx"))
            ]
        except Exception as exc:
            rows.append({"model_id": spec["id"], "status": "model_load_error", "error": f"{type(exc).__name__}: {exc}"})
            continue
        warmup_seconds = None
        if items:
            try:
                warmup_image, _ = open_pair(dataset_root, items[0])
                started = time.perf_counter()
                adapter.predict(warmup_image)
                warmup_seconds = time.perf_counter() - started
            except Exception as exc:
                rows.append({"model_id": spec["id"], "status": "model_warmup_error", "error": f"{type(exc).__name__}: {exc}"})
                continue
        for index, item in enumerate(items):
            base = {"model_id": spec["id"], "sample_id": item["id"], "category": item["category"], "status": "ok"}
            try:
                image, truth_image = open_pair(dataset_root, item)
                started = time.perf_counter()
                with PeakRss() as memory:
                    prediction = adapter.predict(image)
                elapsed = time.perf_counter() - started
                truth = np.asarray(truth_image, dtype=np.float32) / 255.0
                metrics = score(prediction, truth)
                alpha = Image.fromarray(np.round(prediction * 255).astype(np.uint8), mode="L")
                alpha_path = model_dir / "masks" / f"{item['id']}.png"
                cutout_path = model_dir / "cutouts" / f"{item['id']}.png"
                alpha.save(alpha_path)
                rgba = image.convert("RGBA")
                rgba.putalpha(alpha)
                rgba.save(cutout_path)
                rows.append({
                    **base,
                    "inference_seconds": elapsed,
                    "load_seconds": load_seconds if index == 0 else None,
                    "warmup_seconds": warmup_seconds if index == 0 else None,
                    "provider": ",".join(providers),
                    "model_artifacts": json.dumps(artifacts, sort_keys=True),
                    "rss_peak_bytes": memory.peak,
                    "load_rss_peak_bytes": load_peak if index == 0 else None,
                    "system_gpu_memory_at_model_start": _nvidia_smi() if index == 0 else None,
                    "prediction_sha256": sha256(alpha_path),
                    **metrics,
                })
            except Exception as exc:
                rows.append({**base, "status": "inference_error", "error": f"{type(exc).__name__}: {exc}"})
    (output_dir / "results.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    columns = sorted({key for row in rows for key in row})
    with (output_dir / "results.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
    summary = summarize(rows)
    summary["_run"] = {"requested_items": len(items), "nvidia_smi_after": _nvidia_smi()}
    (output_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return rows


def _package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None
