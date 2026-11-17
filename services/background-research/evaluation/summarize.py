from __future__ import annotations

import statistics
from typing import Any

import numpy as np


METRICS = (
    "mae", "mse", "sad", "precision@0.5", "recall@0.5", "f1@0.5", "iou@0.5",
    "boundary_f1@2px", "gradient_mae",
)


def _stats(rows: list[dict[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {"n": len(rows)}
    times = [row["inference_seconds"] for row in rows if isinstance(row.get("inference_seconds"), (int, float))]
    if times:
        result.update({
            "mean_seconds": statistics.mean(times),
            "median_seconds": statistics.median(times),
            "p95_seconds": float(np.percentile(times, 95)),
        })
    for metric in METRICS:
        values = [row[metric] for row in rows if isinstance(row.get(metric), (int, float))]
        if values:
            result[f"mean_{metric.replace('@','_').replace('.','_')}"] = statistics.mean(values)
    return result


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    summary: dict[str, Any] = {}
    model_ids = sorted({row["model_id"] for row in rows if row.get("model_id")})
    for model_id in model_ids:
        model_rows = [row for row in rows if row.get("model_id") == model_id]
        valid = [row for row in model_rows if row.get("status") == "ok"]
        model_summary = _stats(valid)
        model_summary["successful"] = len(valid)
        model_summary["failed"] = len(model_rows) - len(valid)
        model_summary["provider"] = valid[0].get("provider") if valid else None
        model_summary["peak_rss_bytes"] = max((row.get("rss_peak_bytes", 0) for row in valid), default=None)
        model_summary["by_category"] = {}
        for category in sorted({row.get("category") for row in valid if row.get("category")}):
            group = [row for row in valid if row.get("category") == category]
            model_summary["by_category"][category] = _stats(group)
        summary[model_id] = model_summary
    return summary
