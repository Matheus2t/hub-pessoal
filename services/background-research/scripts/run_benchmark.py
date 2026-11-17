from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from evaluation.runner import run


def main() -> None:
    base = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=base / "data" / "manifest.json")
    parser.add_argument("--models", type=Path, default=base / "config" / "models.json")
    parser.add_argument("--output", type=Path, default=base / "results" / "run")
    parser.add_argument("--limit", type=int, help="use the first N manifest items (deterministic)")
    parser.add_argument("--model", action="append", help="limit execution to one or more model IDs")
    parser.add_argument("--sample-id", action="append", dest="sample_ids", help="select explicit paired sample IDs; repeat as needed")
    parser.add_argument("--provider", choices=["CPUExecutionProvider", "CUDAExecutionProvider"], help="override provider for every selected model; CUDA is verified with ORT profiling")
    parser.add_argument("--profile", action="store_true", help="record per-node ONNX Runtime provider events")
    args = parser.parse_args()
    specs = json.loads(args.models.read_text(encoding="utf-8"))
    if args.model:
        specs = [spec for spec in specs if spec["id"] in args.model]
        missing = set(args.model) - {spec["id"] for spec in specs}
        if missing:
            parser.error(f"unknown model IDs: {sorted(missing)}")
        temp = args.output / "selected-models.json"
        temp.parent.mkdir(parents=True, exist_ok=True)
        temp.write_text(json.dumps(specs, indent=2), encoding="utf-8")
        models_path = temp
    else:
        models_path = args.models
    try:
        rows = run(args.manifest, models_path, args.output, args.limit, args.provider, args.sample_ids, args.profile)
    except ValueError as exc:
        parser.error(str(exc))
    ok = sum(row.get("status") == "ok" for row in rows)
    gpu_confirmed = sum(row.get("cuda_execution_confirmed") is True for row in rows)
    print(f"benchmark recorded {ok} successful inferences ({gpu_confirmed} with CUDA node events); results: {args.output}")


if __name__ == "__main__":
    main()
