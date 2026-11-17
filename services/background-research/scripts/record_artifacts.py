from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    base = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Write checkpoint metadata only; never copies weight files.")
    parser.add_argument("--models", type=Path, default=base / "config" / "models.json")
    parser.add_argument("--cache", type=Path, default=base / "models" / "rembg" / "models")
    parser.add_argument("--output", type=Path, default=base / "config" / "model-artifacts.json")
    args = parser.parse_args()
    specs = json.loads(args.models.read_text(encoding="utf-8"))
    entries = []
    for spec in specs:
        model_name = spec.get("rembg_model")
        if not model_name:
            continue
        model_dir = args.cache / model_name
        for file in sorted(model_dir.glob("*.onnx")):
            entries.append({
                "id": spec["id"],
                "artifact": file.name,
                "bytes": file.stat().st_size,
                "sha256": digest(file),
                "weights_source": spec["weights_source"],
                "source": spec["source"],
                "license_status": spec["license_status"],
            })
    if not entries:
        raise SystemExit("no downloaded checkpoints found under the local ignored cache")
    payload = {"schema_version": 1, "note": "Metadata only; actual checkpoint files are ignored and not committed.", "artifacts": entries}
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"recorded {len(entries)} checkpoint hashes in {args.output}")


if __name__ == "__main__":
    main()
