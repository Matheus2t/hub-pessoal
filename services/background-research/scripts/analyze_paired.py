from __future__ import annotations

import argparse
import json
from pathlib import Path

from evaluation.paired import analyze_paired


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze paired per-image results; never compares unpaired samples.")
    parser.add_argument("results", type=Path, help="results.json from a benchmark run")
    parser.add_argument("--metric", default="boundary_f1@2px")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    rows = json.loads(args.results.read_text(encoding="utf-8"))
    report = analyze_paired(rows, args.metric)
    output = args.output or args.results.with_name(f"paired-{args.metric.replace('@', '-at-').replace('.', '-')}.json")
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"paired comparisons: {len(report['comparisons'])}; report: {output}")


if __name__ == "__main__":
    main()
