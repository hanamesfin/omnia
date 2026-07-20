"""
Evolution Engine — §5.8
Z-score anomaly detection + plain-language suggestion generation.
100% statistical — no ML, no training data.
"""
from __future__ import annotations

import math
import statistics
from dataclasses import dataclass
from typing import Optional

Z_SCORE_THRESHOLD = 2.0   # flag when score < mean - 2σ
MIN_SAMPLES = 5           # need at least this many evals before flagging


@dataclass
class EvolutionCheckResult:
    should_flag: bool
    z_score: float
    rolling_mean: float
    rolling_std: float
    offending_score: float
    suggestion: str


def check_for_anomaly(
    recent_scores: list[float],
    new_score: float,
) -> EvolutionCheckResult:
    """
    §5.8 anomaly detection:
    Flag when new_score < mean − 2σ of recent_scores.
    Honest about uncertainty when sample size is small.
    """
    if len(recent_scores) < MIN_SAMPLES:
        return EvolutionCheckResult(
            should_flag=False,
            z_score=0.0,
            rolling_mean=0.0,
            rolling_std=0.0,
            offending_score=new_score,
            suggestion="",
        )

    mean = statistics.mean(recent_scores)
    std = statistics.stdev(recent_scores) if len(recent_scores) > 1 else 0.0

    if std == 0.0:
        z = 0.0
    else:
        z = (new_score - mean) / std

    should_flag = z < -Z_SCORE_THRESHOLD

    return EvolutionCheckResult(
        should_flag=should_flag,
        z_score=round(z, 4),
        rolling_mean=round(mean, 4),
        rolling_std=round(std, 4),
        offending_score=round(new_score, 4),
        suggestion=_generate_suggestion(z, mean, std, new_score) if should_flag else "",
    )


def _generate_suggestion(z: float, mean: float, std: float, score: float) -> str:
    """
    Pattern-match on the magnitude of the drop to produce a plain-language suggestion.
    This is string-template logic, not a model call — deterministic.
    """
    drop = mean - score
    severity = "significantly" if abs(z) > 3 else "notably"
    return (
        f"This agent's quality score ({score:.2f}) dropped {severity} below its baseline "
        f"(mean {mean:.2f}, σ {std:.2f}, z = {z:.2f}). "
        f"Consider reviewing the latest prompt version for contradictions or scope creep. "
        f"Check evaluation history for patterns in which interaction types triggered the drop."
    )


def correlate_versions_with_scores(
    version_history: list[dict],  # [{version_number, created_at, avg_score}]
) -> str:
    """
    §5.8 suggestion generation: correlate prompt version deltas with score changes.
    Returns a plain-language observation for the Evolution UI.
    """
    if len(version_history) < 2:
        return "Not enough version history to identify patterns yet."

    best = max(version_history, key=lambda v: v.get("avg_score", 0))
    worst = min(version_history, key=lambda v: v.get("avg_score", 0))

    lines = [
        f"Across {len(version_history)} versions, quality ranged from "
        f"{worst['avg_score']:.2f} (v{worst['version_number']}) to "
        f"{best['avg_score']:.2f} (v{best['version_number']}).",
    ]

    # Check for monotonic trends
    scores = [v.get("avg_score", 0) for v in sorted(version_history, key=lambda x: x["version_number"])]
    if len(scores) >= 3:
        recent_trend = scores[-3:]
        if all(recent_trend[i] < recent_trend[i - 1] for i in range(1, len(recent_trend))):
            lines.append("Quality has been declining across the last 3 versions — consider reverting to a previous prompt.")
        elif all(recent_trend[i] > recent_trend[i - 1] for i in range(1, len(recent_trend))):
            lines.append("Quality has been improving across the last 3 versions — current direction is positive.")

    return " ".join(lines)
