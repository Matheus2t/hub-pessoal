from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
import os
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


@dataclass
class RembgAdapter:
    model_spec: dict[str, Any]
    session: Any = None
    providers: list[str] | None = None

    def load(self) -> None:
        model_cache = Path(__file__).resolve().parents[1] / "models" / "rembg"
        model_cache.mkdir(parents=True, exist_ok=True)
        os.environ.setdefault("U2NET_HOME", str(model_cache))
        from rembg import new_session

        import onnxruntime as ort

        expected = self.model_spec.get("expected_provider", "CPUExecutionProvider")
        available = __import__("onnxruntime").get_available_providers()
        if expected not in available:
            raise RuntimeError(f"required ONNX provider is unavailable: {expected}")
        options = ort.SessionOptions()
        options.intra_op_num_threads = min(2, os.cpu_count() or 1)
        options.inter_op_num_threads = 1
        options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        self.session = new_session(self.model_spec["rembg_model"], providers=[expected], sess_opts=options)
        self.providers = list(self.session.inner_session.get_providers())
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


def create_adapter(model_spec: dict[str, Any]):
    adapter = model_spec.get("adapter")
    if adapter == "rembg":
        return RembgAdapter(model_spec)
    raise ValueError(f"unsupported adapter: {adapter}")
