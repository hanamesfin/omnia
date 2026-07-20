"""
Evaluation Engine — §5.7
All metrics directly measured or computed from measurements.
No training data required.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Optional

from openai import AsyncOpenAI
from config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY or "sk-unset")

# ─── Composite score weights ──────────────────────────────────────────────────
# SEED_CONFIG — design decisions, tune from real satisfaction data later.
COMPOSITE_WEIGHTS = {
    "reliability":    0.35,
    "satisfaction":   0.30,
    "cost_eff":       0.20,
    "latency":        0.15,
}

# Reference maxima for normalization — SEED_CONFIG
MAX_LATENCY_MS = 10_000   # 10 s is the practical worst case for this system
MAX_COST_USD   = 0.05     # $0.05 per response is high


@dataclass
class EvaluationInput:
    latency_ms: int
    success: bool
    schema_valid: bool
    user_rating: Optional[float]  # 1–5 or None
    tokens_used: int
    cost_usd: float
    rolling_success_rate: float   # computed by caller from history
    judge_score: Optional[float]  # 1–5, from LLM-as-judge (optional)


@dataclass
class CompositeScore:
    composite: float          # 0–1
    reliability: float
    satisfaction: float
    cost_efficiency: float
    latency_score: float
    breakdown: dict


def compute_composite(ev: EvaluationInput) -> CompositeScore:
    """
    §5.7: weighted sum of normalized metrics.
    Every value here is measurable from the running system — no labels needed.
    """
    # Reliability = rolling success rate (already 0–1)
    reliability = ev.rolling_success_rate

    # Satisfaction: prefer explicit user rating; fall back to judge score; else mid
    if ev.user_rating is not None:
        satisfaction = (ev.user_rating - 1) / 4.0  # normalize 1–5 → 0–1
    elif ev.judge_score is not None:
        satisfaction = (ev.judge_score - 1) / 4.0
    else:
        satisfaction = 0.5  # no signal yet

    # Cost efficiency: 1 - normalized cost
    cost_normalized = min(1.0, ev.cost_usd / MAX_COST_USD)
    cost_efficiency = 1.0 - cost_normalized

    # Latency score: 1 - normalized latency
    latency_normalized = min(1.0, ev.latency_ms / MAX_LATENCY_MS)
    latency_score = 1.0 - latency_normalized

    composite = (
        COMPOSITE_WEIGHTS["reliability"] * reliability +
        COMPOSITE_WEIGHTS["satisfaction"] * satisfaction +
        COMPOSITE_WEIGHTS["cost_eff"]    * cost_efficiency +
        COMPOSITE_WEIGHTS["latency"]     * latency_score
    )
    composite = round(min(1.0, max(0.0, composite)), 4)

    return CompositeScore(
        composite=composite,
        reliability=round(reliability, 4),
        satisfaction=round(satisfaction, 4),
        cost_efficiency=round(cost_efficiency, 4),
        latency_score=round(latency_score, 4),
        breakdown={
            "reliability":   round(reliability, 4),
            "satisfaction":  round(satisfaction, 4),
            "cost_efficiency": round(cost_efficiency, 4),
            "latency_score": round(latency_score, 4),
        },
    )


# ─── LLM-as-judge (optional, sampled 1-in-5) ─────────────────────────────────

JUDGE_SYSTEM_PROMPT = """\
You are an AI quality evaluator. Given an agent's system prompt, a user message, \
and the agent's response, score the response 1–5 on the following rubric:
5: Excellent — fully follows constraints, stays in scope, tone matches
4: Good — minor lapses but mostly correct
3: Acceptable — one clear issue
2: Poor — multiple issues or significant scope deviation
1: Failing — ignores constraints or system prompt

Return ONLY valid JSON: {"score": <integer 1-5>, "reason": "<one sentence>"}"""


async def llm_judge(
    system_prompt: str,
    user_message: str,
    agent_response: str,
) -> Optional[float]:
    """
    Optional LLM-as-judge. Returns 1–5 score or None on failure.
    Called only on a sampled subset to control cost.
    """
    try:
        response = await client.chat.completions.create(
            model=settings.LLM_FAST_MODEL,
            messages=[
                {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                {"role": "user", "content": (
                    f"AGENT SYSTEM PROMPT:\n{system_prompt}\n\n"
                    f"USER MESSAGE:\n{user_message}\n\n"
                    f"AGENT RESPONSE:\n{agent_response}"
                )},
            ],
            temperature=0.1,
            max_tokens=200,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        score = float(result.get("score", 3))
        return max(1.0, min(5.0, score))
    except Exception:
        return None
