from __future__ import annotations

import statistics
from typing import Any

import numpy as np


METRICS = (
    "mae", "mse", "sad", "precision@0.5", "recall@0.5", "f1@0.5", "iou@0.5",
    "boundary_f1@2px", "gradient_mae",
)


def _stats(rows: list[dict[str, Any]], include_metrics: bool = True) -> dict[str, Any]:
    result: dict[str, Any] = {"n": len(rows)}
    times = [row["inference_seconds"] for row in rows if isinstance(row.get("inference_seconds"), (int, float))]
    if times:
        result.update({
            "mean_seconds": statistics.mean(times),
            "median_seconds": statistics.median(times),
            "p95_seconds": float(np.percentile(times, 95)),
            "std_seconds": statistics.stdev(times) if len(times) > 1 else 0.0,
        })
    if include_metrics:
        for metric in METRICS:
            values = [row[metric] for row in rows if isinstance(row.get(metric), (int, float))]
            if values:
                result[f"mean_{metric.replace('@','_').replace('.','_')}"] = statistics.mean(values)
                result[f"median_{metric.replace('@','_').replace('.','_')}"] = statistics.median(values)
                result[f"std_{metric.replace('@','_').replace('.','_')}"] = statistics.stdev(values) if len(values) > 1 else 0.0
    return result


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    summary: dict[str, Any] = {}
    model_ids = sorted({row["model_id"] for row in rows if row.get("model_id")})
    for model_id in model_ids:
        model_rows = [row for row in rows if row.get("model_id") == model_id]
        valid = [row for row in model_rows if row.get("status") == "ok"]
        evaluation_groups = sorted({str(row.get("evaluation_group", "unspecified")) for row in valid})
        reference_types = sorted({str(row.get("metric_scope")) for row in valid if row.get("metric_scope") not in {None, "not_scored_no_ground_truth"}})
        can_aggregate_metrics = len(evaluation_groups) <= 1 and len(reference_types) <= 1
        model_summary = _stats(valid, include_metrics=can_aggregate_metrics)
        model_summary["aggregate_metric_scope"] = {
            "evaluation_group": evaluation_groups[0] if len(evaluation_groups) == 1 else None,
            "reference_type": reference_types[0] if len(reference_types) == 1 else None,
            "aggregated": can_aggregate_metrics,
        }
        model_summary["successful"] = len(valid)
        model_summary["failed"] = len(model_rows) - len(valid)
        model_summary["provider"] = valid[0].get("provider") if valid else None
        model_summary["peak_rss_bytes"] = max((row.get("rss_peak_bytes", 0) for row in valid), default=None)
        model_summary["by_evaluation_group"] = {}
        for evaluation_group in evaluation_groups:
            group_rows = [row for row in valid if str(row.get("evaluation_group", "unspecified")) == evaluation_group]
            group_types = sorted({str(row.get("metric_scope")) for row in group_rows if row.get("metric_scope") not in {None, "not_scored_no_ground_truth"}})
            group_summary = _stats(group_rows, include_metrics=len(group_types) <= 1)
            group_summary["by_category"] = {}
            for category in sorted({row.get("category") for row in group_rows if row.get("category")}):
                category_rows = [row for row in group_rows if row.get("category") == category]
                category_types = {str(row.get("metric_scope")) for row in category_rows if row.get("metric_scope") not in {None, "not_scored_no_ground_truth"}}
                group_summary["by_category"][category] = _stats(category_rows, include_metrics=len(category_types) <= 1)
            group_summary["by_reference_type"] = {}
            for reference_type in group_types:
                reference_rows = [row for row in group_rows if row.get("metric_scope") == reference_type]
                group_summary["by_reference_type"][reference_type] = _stats(reference_rows)
            model_summary["by_evaluation_group"][evaluation_group] = group_summary
        if len(evaluation_groups) == 1:
            only_group = model_summary["by_evaluation_group"][evaluation_groups[0]]
            model_summary["by_category"] = only_group["by_category"]
            model_summary["by_reference_type"] = only_group["by_reference_type"]
        summary[model_id] = model_summary
    return summary
