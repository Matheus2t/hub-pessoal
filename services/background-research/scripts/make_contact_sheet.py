from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def main() -> None:
    base = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Create a blinded, local visual comparison for one benchmark item.")
    parser.add_argument("sample_id")
    parser.add_argument("--manifest", type=Path, default=base / "data" / "manifest.json")
    parser.add_argument("--run", action="append", dest="runs", help="benchmark run folder; repeat to compare separate runs")
    parser.add_argument("--output", type=Path, default=base / "results" / "contact-sheets")
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    item = next((row for row in manifest["items"] if row["id"] == args.sample_id), None)
    if item is None:
        parser.error(f"unknown sample ID: {args.sample_id}")
    specs = json.loads((base / "config" / "models.json").read_text(encoding="utf-8"))
    run_dirs = [Path(value) for value in args.runs] if args.runs else [base / "results" / "run"]
    models = [
        (spec, run_dir)
        for spec in specs
        for run_dir in run_dirs
        if (run_dir / spec["id"] / "masks" / f"{args.sample_id}.png").is_file()
    ]
    if not models:
        parser.error("no model outputs exist for this sample")
    args.output.mkdir(parents=True, exist_ok=True)
    order = ["Original", "Ground truth"] + [f"Candidate {index}" for index in range(1, len(models)+1)]
    key = {f"Candidate {index}": {"model_id": spec["id"], "run": str(run_dir)} for index, (spec, run_dir) in enumerate(models, start=1)}
    key_path = args.output / f"{args.sample_id}-blind-key.json"
    key_path.write_text(json.dumps(key, indent=2), encoding="utf-8")
    source = Image.open(args.manifest.parent / item["image"]).convert("RGB")
    truth = Image.open(args.manifest.parent / item["ground_truth"]).convert("L").convert("RGB")
    panels = [("Original", source), ("Ground truth", truth)]
    for index, (spec, run_dir) in enumerate(models, start=1):
        alpha = Image.open(run_dir / spec["id"] / "masks" / f"{args.sample_id}.png").convert("L")
        checker = Image.new("RGB", source.size, (220, 220, 220))
        tile = 16
        draw = ImageDraw.Draw(checker)
        for y in range(0, source.height, tile):
            for x in range(0, source.width, tile):
                if ((x // tile) + (y // tile)) % 2:
                    draw.rectangle((x, y, x+tile-1, y+tile-1), fill=(175,175,175))
        cutout = source.copy().convert("RGBA")
        cutout.putalpha(alpha)
        composite = Image.alpha_composite(checker.convert("RGBA"), cutout).convert("RGB")
        panels.append((f"Candidate {index}", composite))
    panel_w, panel_h = 360, 310
    sheet = Image.new("RGB", (panel_w * 2, panel_h * ((len(panels)+1)//2)), (18,18,18))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (label, panel) in enumerate(panels):
        x, y = (index % 2) * panel_w, (index // 2) * panel_h
        panel.thumbnail((panel_w-16, panel_h-42), Image.Resampling.LANCZOS)
        draw.text((x+8, y+8), label, fill=(245,245,245), font=font)
        sheet.paste(panel, (x+8+(panel_w-16-panel.width)//2, y+30+(panel_h-42-panel.height)//2))
    output = args.output / f"{args.sample_id}-blind.png"
    sheet.save(output)
    print(f"created blinded review sheet: {output}; model mapping saved separately")


if __name__ == "__main__":
    main()
