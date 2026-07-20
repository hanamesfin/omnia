"""
Marketplace Ranking Engine
- §2.3 Engineering Spec: Bayesian AQS-prior rank_score
- §5.9 legacy: Wilson lower bound (kept for binary recommend analytics)
"""
from __future__ import annotations

import math


def marketplace_rank_score(
    aqs: float,
    avg_rating: float,
    rating_count: int,
    k: float = 10.0,
) -> float:
    """
    §2.3
    usage_score = (rating_count · avg_rating_norm + K · AQS) / (rating_count + K)
    rank_score  = 0.6 · AQS + 0.4 · usage_score

    avg_rating is on a 1–5 scale and is normalized to [0,1].
    K = how many real ratings before usage outweighs the static AQS prior.
    Cold start (rating_count=0) → usage_score = AQS → rank_score = AQS.
    """
    a = max(0.0, min(1.0, float(aqs)))
    n = max(0, int(rating_count))
    avg_norm = max(0.0, min(1.0, float(avg_rating) / 5.0)) if avg_rating else 0.0
    usage = (n * avg_norm + k * a) / (n + k)
    return round(0.6 * a + 0.4 * usage, 6)


def wilson_score(recommend_count: int, total_count: int, confidence: float = 0.95) -> float:
    """
    Wilson score lower bound for a binomial proportion.

    This prevents a listing with 2 five-star ratings from outranking
    one with 200 ratings at 4.8 stars — the lower bound naturally
    discounts small sample sizes.

    Args:
        recommend_count: number of "would recommend" responses
        total_count: total number of reviews
        confidence: statistical confidence level (0.95 → z=1.96)

    Returns:
        Lower bound of the confidence interval on the true recommend rate.
        Range: [0, 1]. Higher = better ranking signal.
    """
    if total_count == 0:
        return 0.0

    # z-score for the given confidence level
    # 0.95 → 1.96, 0.99 → 2.576
    z_map = {0.90: 1.645, 0.95: 1.96, 0.99: 2.576}
    z = z_map.get(confidence, 1.96)

    p_hat = recommend_count / total_count   # observed proportion
    n = total_count

    lower = (
        p_hat + (z * z) / (2 * n)
        - z * math.sqrt((p_hat * (1 - p_hat) + (z * z) / (4 * n)) / n)
    ) / (1 + (z * z) / n)

    return round(max(0.0, min(1.0, lower)), 6)


def bayesian_average(
    rating_sum: float,
    rating_count: int,
    platform_mean: float,
    prior_weight: int = 10,
) -> float:
    """
    Bayesian average pulls small-sample listings toward the platform mean.
    Alternative to Wilson score for 1–5 star ratings (not binary).

    score = (C * m + Σrating) / (C + n)
    where C = prior weight, m = platform mean.
    """
    return (prior_weight * platform_mean + rating_sum) / (prior_weight + rating_count)
