#!/usr/bin/env python3
"""Generate private Russian dialogue segments with the pinned local TeraTTS ONNX release."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: teratts_local.py <private-model-dir> <segments.json>")

    release = Path(sys.argv[1]).resolve()
    request_file = Path(sys.argv[2]).resolve()
    work_dir = request_file.parent
    jobs = json.loads(request_file.read_text(encoding="utf-8"))
    if not isinstance(jobs, list) or not jobs:
        raise ValueError("segment list must be a non-empty JSON array")
    for job in jobs:
        if not isinstance(job, dict) or not job.get("text") or job.get("voice") not in {"ru_f1", "ru_m5"}:
            raise ValueError("each segment needs text and one of the pinned Russian Tera voices")
        output = Path(job["output"]).resolve()
        if not output.is_relative_to(work_dir):
            raise ValueError("audio output must stay inside the private work directory")

    sys.path.insert(0, str(release))
    from teratts import generate_speech, load_model, write_wav

    model = load_model(
        release,
        model="distilled",
        provider="CPUExecutionProvider",
        threads=4,
        russian_stress=True,
        ruaccent_mode="dictionary",
    )
    for job in jobs:
        text = job["text"].strip()
        voice = job["voice"]
        seed = int.from_bytes(hashlib.sha256(f"{voice}\0{text}".encode("utf-8")).digest()[:4], "big")
        waveform = generate_speech(model, f"<ru>{text}</ru>", voice, duration_scale=1.0, seed=seed)
        output = Path(job["output"]).resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        write_wav(output, waveform)
        if not output.exists() or output.stat().st_size < 2048:
            raise RuntimeError(f"TeraTTS produced an invalid segment: {output.name}")


if __name__ == "__main__":
    main()
