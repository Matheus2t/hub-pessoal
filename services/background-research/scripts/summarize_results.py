from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from evaluation.summarize import summarize


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("run_dir", type=Path)
    args = parser.parse_args()
    rows = json.loads((args.run_dir / "results.json").read_text(encoding="utf-8"))
    summary = summarize(rows)
    (args.run_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"summarized {len(rows)} rows to {args.run_dir / 'summary.json'}")


if __name__ == "__main__":
    main()
