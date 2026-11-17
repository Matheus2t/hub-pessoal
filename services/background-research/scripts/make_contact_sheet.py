from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


def _checker(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGB", size, (225, 225, 225))
    draw = ImageDraw.Draw(image)
    tile = 18
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if ((x // tile) + (y // tile)) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(175, 175, 175))
    return image


def _composite(source: Image.Image, alpha: Image.Image, background: tuple[int, int, int] | Image.Image) -> Image.Image:
    if isinstance(background, Image.Image):
        base = background.convert("RGBA")
    else:
        base = Image.new("RGBA", source.size, (*background, 255))
    foreground = source.convert("RGBA")
    foreground.putalpha(alpha)
    return Image.alpha_composite(base, foreground).convert("RGB")


def _edge_crop(source: Image.Image, alpha: Image.Image) -> tuple[Image.Image, Image.Image]:
    mask = alpha.convert("L")
    bounds = mask.point(lambda value: 255 if 12 < value < 243 else 0).getbbox() or mask.getbbox()
    if not bounds:
        return source.copy(), mask.copy()
    left, top, right, bottom = bounds
    pad = max(48, int(max(source.size) * 0.06))
    bounds = (max(0, left - pad), max(0, top - pad), min(source.width, right + pad), min(source.height, bottom + pad))
    return source.crop(bounds), mask.crop(bounds)


def main() -> None:
    base = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Create blinded visual comparisons and a separate evaluator score sheet.")
    parser.add_argument("sample_id")
    parser.add_argument("--manifest", type=Path, default=base / "data" / "manifest.json")
    parser.add_argument("--run", action="append", dest="runs", help="benchmark run folder; repeat to compare separate runs")
    parser.add_argument("--output", type=Path, default=base / "results" / "review-gallery")
    parser.add_argument("--key-output", type=Path, help="separate restricted location for model-name mapping")
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    item = next((row for row in manifest["items"] if row["id"] == args.sample_id), None)
    if item is None:
        parser.error(f"unknown sample ID: {args.sample_id}")
    specs = json.loads((base / "config" / "models.json").read_text(encoding="utf-8"))
    run_dirs = [Path(value) for value in args.runs] if args.runs else [base / "results" / "run"]
    candidates = [
        (spec, run_dir)
        for spec in specs
        for run_dir in run_dirs
        if (run_dir / spec["id"] / "masks" / f"{args.sample_id}.png").is_file()
    ]
    if not candidates:
        parser.error("no model outputs exist for this sample")
    order_seed = int(hashlib.sha256(args.sample_id.encode("utf-8")).hexdigest()[:16], 16)
    random.Random(order_seed).shuffle(candidates)
    args.output.mkdir(parents=True, exist_ok=True)
    key_root = args.key_output or args.output.parent / "blind-keys"
    key_root.mkdir(parents=True, exist_ok=True)
    labels = [f"Candidate {chr(65 + index)}" for index in range(len(candidates))]
    key = {
        label: {"model_id": spec["id"], "run": str(run_dir)}
        for label, (spec, run_dir) in zip(labels, candidates)
    }
    (key_root / f"{args.sample_id}-key.json").write_text(json.dumps(key, indent=2), encoding="utf-8")

    source = ImageOps.exif_transpose(Image.open(args.manifest.parent / item["image"])).convert("RGB")
    image_rotation = int(item.get("rotation_degrees", 0) or 0)
    if image_rotation:
        source = source.rotate(image_rotation, expand=True)
    has_truth = bool(item.get("ground_truth"))
    panels: list[tuple[str, Image.Image]] = [("Original", source)]
    if has_truth:
        truth = ImageOps.exif_transpose(Image.open(args.manifest.parent / item["ground_truth"])).convert("L")
        mask_rotation = int(item.get("mask_rotation_degrees", image_rotation) or 0)
        if mask_rotation:
            truth = truth.rotate(mask_rotation, expand=True)
        panels.append(("Reference mask", truth.convert("RGB")))
    else:
        panels.append(("No ground truth", Image.new("RGB", source.size, (48, 48, 48))))

    for label, (spec, run_dir) in zip(labels, candidates):
        alpha = Image.open(run_dir / spec["id"] / "masks" / f"{args.sample_id}.png").convert("L")
        if alpha.size != source.size:
            alpha = alpha.resize(source.size, Image.Resampling.BILINEAR)
        edge_source, edge_alpha = _edge_crop(source, alpha)
        panels.extend([
            (f"{label} · checker", _composite(source, alpha, _checker(source.size))),
            (f"{label} · white", _composite(source, alpha, (255, 255, 255))),
            (f"{label} · black", _composite(source, alpha, (0, 0, 0))),
            (f"{label} · gray", _composite(source, alpha, (128, 128, 128))),
            (f"{label} · edge zoom", _composite(edge_source, edge_alpha, _checker(edge_source.size))),
        ])
    # Keep a fixed canvas for all panels; labels expose only randomized candidate IDs.
    tile_w, tile_h = 320, 250
    columns = 5
    rows = (len(panels) + columns - 1) // columns
    sheet = Image.new("RGB", (tile_w * columns, tile_h * rows), (18, 18, 18))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (label, panel) in enumerate(panels):
        x, y = (index % columns) * tile_w, (index // columns) * tile_h
        draw.text((x + 8, y + 7), label, fill=(245, 245, 245), font=font)
        panel = panel.copy()
        panel.thumbnail((tile_w - 16, tile_h - 38), Image.Resampling.LANCZOS)
        sheet.paste(panel, (x + 8 + (tile_w - 16 - panel.width) // 2, y + 30 + (tile_h - 38 - panel.height) // 2))
    output = args.output / f"{args.sample_id}-blind.png"
    sheet.save(output)
    score_path = args.output / f"{args.sample_id}-scores.csv"
    with score_path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=["sample_id", "candidate", "integrity_0_5", "fine_detail_0_5", "boundary_0_5", "transparency_0_5", "halos_0_5", "background_residue_0_5", "consistency_0_5", "notes"])
        writer.writeheader()
        for label in labels:
            writer.writerow({"sample_id": args.sample_id, "candidate": label})
    print(f"blind gallery: {output}; blank score sheet: {score_path}; keep {key_root} inaccessible to the reviewer")


if __name__ == "__main__":
    main()
