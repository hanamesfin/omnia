"""
Adaptive scoring — blend registry capability with observed performance.

Feature-flagged: when ADAPTIVE_ROUTING is off, returns pure registry scoring.
Confidence grows with sample size so static metadata dominates early.
"""
from __future__ import annotations

from typing import Any

from config import settings
from engines.intelligence.stats_cache import ModelStats, get_stats_cache
from engines.intelligence.telemetry import get_telemetry
from engines.model_selection.registry import MODEL_BY_NAME


# Target blend when confidence is high (matches the user's proposed formula)
ADAPTIVE_WEIGHTS = {
    "registry": 0.25,
    "task_match": 0.25,
    "historical_success": 0.20,
    "latency": 0.10,
    "cost": 0.10,
    "user_rating": 0.05,
    "provider_health": 0.05,
}


def adaptive_enabled() -> bool:
    return bool(getattr(settings, "ADAPTIVE_ROUTING", False))


def observation_confidence(samples: int) -> float:
    """
    0 at 0 samples → ~1 at 50+ samples.
    Keeps registry dominant until enough data exists.
    """
    if samples <= 0:
        return 0.0
    return min(1.0, samples / 50.0)


def blend_score(
    *,
    model_name: str,
    registry_score: float,
    task_type: str = "general",
) -> tuple[float, dict[str, float]]:
    """
    Combine static registry score (0–1) with observed stats.
    Returns (final_score, breakdown).
    """
    if not adaptive_enabled():
        return registry_score, {"registry": registry_score, "adaptive": 0.0}

    stats = get_stats_cache().get(model_name)
    row = MODEL_BY_NAME.get(model_name) or {}
    provider = str((stats.provider if stats else None) or row.get("provider") or "unknown")

    conf = observation_confidence(stats.samples if stats else 0)

    # Observed components (normalize to 0–1)
    hist_success = (stats.success_rate if stats else 0.85)
    # Latency: lower is better; map 400–15000ms → 1–0
    lat = stats.avg_latency_ms if stats else float(row.get("avg_latency_ms") or 1500)
    latency_score = max(0.0, min(1.0, 1.0 - (lat - 400) / 14600))
    # Cost: free/cheaper better
    cost = stats.avg_cost if stats and stats.avg_cost > 0 else float(row.get("cost_per_1k") or 0.001)
    cost_score = max(0.0, min(1.0, 1.0 - min(cost, 0.05) / 0.05))
    rating = ((stats.avg_rating / 5.0) if stats and stats.rating_count else 0.7)
    health = get_telemetry().health_score(provider)

    # Task match from observed strengths vs registry
    task_key = {
        "coding": "observed_coding",
        "debugging": "observed_coding",
        "reasoning": "observed_reasoning",
        "research": "observed_reasoning",
        "creative_writing": "observed_writing",
        "writing": "observed_writing",
        "vision": "observed_vision",
    }.get(task_type, "observed_reasoning")
    observed_cap = float(getattr(stats, task_key, 0) if stats else 0) / 10.0
    registry_cap = {
        "observed_coding": float(row.get("coding_score") or row.get("reasoning_score") or 7) / 10,
        "observed_reasoning": float(row.get("reasoning_score") or 7) / 10,
        "observed_writing": float(row.get("creativity_score") or 7) / 10,
        "observed_vision": float(row.get("vision_score") or 0) / 10,
    }.get(task_key, registry_score)
    task_match = observed_cap if conf > 0.2 and observed_cap > 0 else registry_cap

    w = ADAPTIVE_WEIGHTS
    learned = (
        w["registry"] * registry_score
        + w["task_match"] * task_match
        + w["historical_success"] * hist_success
        + w["latency"] * latency_score
        + w["cost"] * cost_score
        + w["user_rating"] * rating
        + w["provider_health"] * health
    )

    # Interpolate: low confidence → mostly registry; high → full adaptive blend
    final = (1 - conf) * registry_score + conf * learned
    breakdown = {
        "registry": round(registry_score, 4),
        "task_match": round(task_match, 4),
        "historical_success": round(hist_success, 4),
        "latency": round(latency_score, 4),
        "cost": round(cost_score, 4),
        "user_rating": round(rating, 4),
        "provider_health": round(health, 4),
        "confidence": round(conf, 4),
        "final": round(final, 4),
    }
    return final, breakdown
