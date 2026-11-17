from __future__ import annotations

from itertools import combinations
from typing import Any

import numpy as np


LOWER_IS_BETTER = {"mae", "mse", "sad", "gradient_mae"}
HIGHER_IS_BETTER = {"precision@0.5", "recall@0.5", "f1@0.5", "iou@0.5", "boundary_f1@2px"}


def analyze_paired(rows: list[dict[str, Any]], metric: str, resamples: int = 5000, seed: int = 20261117) -> dict[str, Any]:
    if metric not in LOWER_IS_BETTER | HIGHER_IS_BETTER:
        raise ValueError(f"unsupported metric: {metric}")
    if resamples < 1:
        raise ValueError("resamples must be at least 1")
    models = sorted({row.get("model_id") for row in rows if row.get("model_id")})
    indexed: dict[str, dict[str, float]] = {}
    for model in models:
        indexed[model] = {
            row["sample_id"]: float(row[metric])
            for row in rows
            if row.get("model_id") == model
            and row.get("status") == "ok"
            and isinstance(row.get(metric), (int, float))
            and np.isfinite(row[metric])
        }
    comparisons = []
    rng = np.random.default_rng(seed)
    for left, right in combinations(models, 2):
        common = sorted(indexed[left].keys() & indexed[right].keys())
        deltas = np.array([indexed[left][sample] - indexed[right][sample] for sample in common], dtype=np.float64)
        if len(deltas):
            mean = float(deltas.mean())
            boot_means = np.mean(rng.choice(deltas, size=(resamples, len(deltas)), replace=True), axis=1)
            ci = [float(value) for value in np.percentile(boot_means, [2.5, 97.5])]
            better = deltas < 0 if metric in LOWER_IS_BETTER else deltas > 0
            ties = deltas == 0
            wins_left = int(np.count_nonzero(better))
            wins_right = int(np.count_nonzero(~better & ~ties))
            median = float(np.median(deltas))
        else:
            mean = median = None
            ci = None
            wins_left = wins_right = 0
        comparisons.append({
            "model_left": left,
            "model_right": right,
            "delta_definition": f"{left} minus {right}; {'lower' if metric in LOWER_IS_BETTER else 'higher'} is better",
            "metric": metric,
            "paired_n": len(common),
            "sample_ids": common,
            "mean_delta": mean,
            "median_delta": median,
            "bootstrap_95_ci": ci,
            "wins_left": wins_left,
            "wins_right": wins_right,
            "ties": len(common) - wins_left - wins_right,
            "interpretation_limit": "descriptive only; no significance claim, especially for small n",
        })
    return {"schema_version": 1, "metric": metric, "seed": seed, "resamples": resamples, "comparisons": comparisons}
