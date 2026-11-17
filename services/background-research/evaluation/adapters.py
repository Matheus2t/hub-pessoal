from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
import json
import os
from pathlib import Path
from collections import Counter
from typing import Any

import numpy as np
from PIL import Image


@dataclass
class RembgAdapter:
    model_spec: dict[str, Any]
    provider_override: str | None = None
    profile_prefix: Path | None = None
    session: Any = None
    providers: list[str] | None = None
    model_input_shape: Any = None

    def load(self) -> None:
        model_cache = Path(__file__).resolve().parents[1] / "models" / "rembg"
        model_cache.mkdir(parents=True, exist_ok=True)
        os.environ.setdefault("U2NET_HOME", str(model_cache))
        from rembg import new_session

        import onnxruntime as ort

        expected = self.provider_override or self.model_spec.get("expected_provider", "CPUExecutionProvider")
        available = __import__("onnxruntime").get_available_providers()
        if expected not in available:
            raise RuntimeError(f"required ONNX provider is unavailable: {expected}")
        if expected == "CUDAExecutionProvider":
            preload = getattr(ort, "preload_dlls", None)
            if preload is None:
                raise RuntimeError("CUDA provider is present but this ONNX Runtime has no preload_dlls support")
            preload(directory="")
        options = ort.SessionOptions()
        options.intra_op_num_threads = min(2, os.cpu_count() or 1)
        options.inter_op_num_threads = 1
        options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        if self.profile_prefix is not None:
            self.profile_prefix.parent.mkdir(parents=True, exist_ok=True)
            options.enable_profiling = True
            options.profile_file_prefix = str(self.profile_prefix)
        self.session = new_session(self.model_spec["rembg_model"], providers=[expected], sess_opts=options)
        inner = self.session.inner_session
        self.providers = list(inner.get_providers())
        inputs = inner.get_inputs()
        self.model_input_shape = inputs[0].shape if inputs else None
        if expected not in self.providers:
            raise RuntimeError(f"requested provider {expected} was not activated; active providers: {self.providers}")

    def predict(self, image: Image.Image) -> np.ndarray:
        if self.session is None:
            raise RuntimeError("adapter was not loaded")
        from rembg import remove

        buffer = BytesIO()
        image.save(buffer, format="PNG")
        result = remove(buffer.getvalue(), session=self.session, only_mask=True)
        if isinstance(result, Image.Image):
            mask = result.convert("L")
        else:
            mask = Image.open(BytesIO(result)).convert("L")
        if mask.size != image.size:
            mask = mask.resize(image.size, Image.Resampling.BILINEAR)
        return np.asarray(mask, dtype=np.float32) / 255.0

    def finish_profile(self) -> dict[str, Any]:
        if self.session is None or self.profile_prefix is None:
            return {"profile_status": "not_requested"}
        profile_path = Path(self.session.inner_session.end_profiling())
        try:
            events = json.loads(profile_path.read_text(encoding="utf-8"))
            counts = Counter(
                str(event.get("args", {}).get("provider"))
                for event in events
                if event.get("cat") == "Node" and event.get("args", {}).get("provider")
            )
            total = sum(counts.values())
            return {
                "profile_status": "ok" if total else "no_provider_events",
                "profile_file": profile_path.name,
                "profile_node_events": total,
                "provider_node_events": dict(counts),
                "cuda_node_share": counts.get("CUDAExecutionProvider", 0) / total if total else None,
            }
        except (OSError, ValueError, TypeError) as exc:
            return {"profile_status": "parse_error", "profile_error": f"{type(exc).__name__}: {exc}"}


def create_adapter(
    model_spec: dict[str, Any],
    provider_override: str | None = None,
    profile_prefix: Path | None = None,
):
    adapter = model_spec.get("adapter")
    if adapter == "rembg":
        return RembgAdapter(model_spec, provider_override, profile_prefix)
    raise ValueError(f"unsupported adapter: {adapter}")
