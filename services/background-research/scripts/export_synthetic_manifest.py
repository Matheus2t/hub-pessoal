from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    base = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Export metadata only; images and model outputs stay ignored locally.")
    parser.add_argument("--manifest", type=Path, default=base / "data" / "manifest.json")
    parser.add_argument("--output", type=Path, default=base / "config" / "synthetic-80-manifest.json")
    args = parser.parse_args()
    payload = json.loads(args.manifest.read_text(encoding="utf-8"))
    items = [item for item in payload["items"] if item["source_id"].startswith("synthetic-seed-")]
    if not items:
        raise SystemExit("no generated synthetic rows were found")
    exported = {
        "schema_version": 1,
        "dataset": "2T deterministic synthetic background-removal stress set",
        "data_location": "generated locally by scripts/generate_synthetic.py; image files are intentionally not committed",
        "count": len(items),
        "counts_by_category": {key: sum(item["category"] == key for item in items) for key in sorted({item["category"] for item in items})},
        "items": items,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(exported, indent=2), encoding="utf-8")
    print(f"exported metadata for {len(items)} synthetic samples to {args.output}")


if __name__ == "__main__":
    main()
