"""
AI Model Selection Engine — §5.4
Weighted multi-criteria scoring with min-max normalisation.
Returns a ranked list with scores — the UI shows WHY a model was picked.

Catalog lives in registry.py (100+ models). This module owns scoring only.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from engines.model_selection.registry import (
    MODEL_BY_NAME,
    MODEL_TABLE,
    catalog_public,
    openrouter_id_for,
    openrouter_model_map,
    resolve_model_name,
)

__all__ = [
    "MODEL_TABLE",
    "MODEL_BY_NAME",
    "WEIGHT_PROFILES",
    "DOMAIN_TO_TASK_TYPE",
    "ScoredModel",
    "get_model",
    "select_model",
    "detect_task_type",
    "catalog_public",
    "openrouter_id_for",
    "openrouter_model_map",
    "resolve_model_name",
]

WEIGHT_PROFILES: dict[str, dict[str, float]] = {
    "coding": {
        "reasoning": 0.25,
        "coding": 0.35,
        "cost": 0.15,
        "latency": 0.10,
        "creativity": 0.05,
        "privacy": 0.05,
        "vision": 0.05,
    },
    "creative_writing": {
        "reasoning": 0.10,
        "coding": 0.05,
        "cost": 0.15,
        "latency": 0.15,
        "creativity": 0.40,
        "privacy": 0.10,
        "vision": 0.05,
    },
    "customer_facing_support": {
        "reasoning": 0.20,
        "coding": 0.05,
        "cost": 0.20,
        "latency": 0.30,
        "creativity": 0.10,
        "privacy": 0.15,
        "vision": 0.00,
    },
    "sensitive_data": {
        "reasoning": 0.15,
        "coding": 0.05,
        "cost": 0.10,
        "latency": 0.10,
        "creativity": 0.05,
        "privacy": 0.50,
        "vision": 0.05,
    },
    "research": {
        "reasoning": 0.40,
        "coding": 0.10,
        "cost": 0.10,
        "latency": 0.10,
        "creativity": 0.15,
        "privacy": 0.10,
        "vision": 0.05,
    },
    "vision": {
        "reasoning": 0.15,
        "coding": 0.05,
        "cost": 0.10,
        "latency": 0.15,
        "creativity": 0.10,
        "privacy": 0.10,
        "vision": 0.35,
    },
    "reasoning": {
        "reasoning": 0.50,
        "coding": 0.15,
        "cost": 0.05,
        "latency": 0.05,
        "creativity": 0.10,
        "privacy": 0.10,
        "vision": 0.05,
    },
    "automation": {
        "reasoning": 0.20,
        "coding": 0.20,
        "cost": 0.20,
        "latency": 0.25,
        "creativity": 0.05,
        "privacy": 0.10,
        "vision": 0.00,
    },
    "general": {
        "reasoning": 0.25,
        "coding": 0.15,
        "cost": 0.15,
        "latency": 0.15,
        "creativity": 0.15,
        "privacy": 0.10,
        "vision": 0.05,
    },
    "frontier": {
        "reasoning": 0.35,
        "coding": 0.20,
        "cost": 0.05,
        "latency": 0.05,
        "creativity": 0.20,
        "privacy": 0.05,
        "vision": 0.10,
    },
}

DOMAIN_TO_TASK_TYPE: dict[str, str] = {
    "coding": "coding",
    "content": "creative_writing",
    "customer_support": "customer_facing_support",
    "data_analysis": "coding",
    "research": "research",
    "general": "general",
    "automation": "automation",
}


@dataclass
class ScoredModel:
    name: str
    provider: str
    score: float
    score_breakdown: dict
    context_window: int
    display_name: str = ""
    capabilities: list[str] | None = None
    reason: str = ""


def _normalize(values: list[float]) -> list[float]:
    lo, hi = min(values), max(values)
    if hi == lo:
        return [1.0] * len(values)
    return [(v - lo) / (hi - lo) for v in values]


def get_model(name: str) -> dict[str, Any] | None:
    resolved = resolve_model_name(name) or name
    return MODEL_BY_NAME.get(resolved)


def detect_task_type(
    domain: str = "general",
    *,
    prompt: str = "",
    constraints: list[str] | None = None,
    frontier: bool = False,
) -> str:
    if frontier:
        return "frontier"
    text = f"{domain} {prompt} {' '.join(constraints or [])}".lower()
    if any(kw in text for kw in ("sensitive", "personal data", "hipaa", "gdpr", "confidential", "pii")):
        return "sensitive_data"
    if any(kw in text for kw in ("image", "vision", "screenshot", "photo", "ocr", "multimodal", "chart")):
        return "vision"
    if any(kw in text for kw in ("prove", "reason", "math", "logic", "chain of thought", "plan carefully")):
        return "reasoning"
    if any(kw in text for kw in ("code", "python", "typescript", "bug", "refactor", "api", "sql", "debug")):
        return "coding"
    if any(kw in text for kw in ("write", "blog", "story", "copy", "marketing", "creative")):
        return "creative_writing"
    if any(kw in text for kw in ("support", "ticket", "customer", "helpdesk", "chatbot")):
        return "customer_facing_support"
    if any(kw in text for kw in ("research", "summarize", "cite", "paper", "compare")):
        return "research"
    if any(kw in text for kw in ("automate", "workflow", "cron", "batch", "pipeline")):
        return "automation"
    return DOMAIN_TO_TASK_TYPE.get(domain, "general")


def _reason_for(task_type: str, model: dict[str, Any], breakdown: dict[str, float]) -> str:
    caps = ", ".join((model.get("capabilities") or [])[:3]) or "general"
    top = max(breakdown, key=breakdown.get) if breakdown else "reasoning"
    labels = {
        "coding": "strong for code & agents",
        "creative_writing": "strong for writing",
        "customer_facing_support": "fast & reliable for support",
        "sensitive_data": "higher privacy tier",
        "research": "strong reasoning for research",
        "vision": "multimodal / vision capable",
        "reasoning": "deep reasoning",
        "automation": "fast & cost-efficient for automation",
        "frontier": "frontier capability",
        "general": "balanced all-rounder",
    }
    return f"{labels.get(task_type, 'good fit')} · top signal: {top} · {caps}"


def select_model(
    domain: str,
    constraints: list[str] | None = None,
    *,
    frontier: bool = False,
    preferred: str | None = None,
    prompt: str = "",
    require_tools: bool = False,
    require_vision: bool = False,
    limit: int | None = None,
) -> list[ScoredModel]:
    task_type = detect_task_type(
        domain, prompt=prompt, constraints=constraints, frontier=frontier
    )
    if require_vision and task_type == "general":
        task_type = "vision"

    weights = WEIGHT_PROFILES.get(task_type, WEIGHT_PROFILES["general"])
    models = list(MODEL_TABLE)

    if require_tools:
        models = [m for m in models if m.get("supports_tools", True)]
    if require_vision:
        models = [m for m in models if float(m.get("vision_score") or 0) >= 6.0]
    if not models:
        models = list(MODEL_TABLE)

    cost_vals = [1 / max(m["cost_per_1k"], 1e-9) for m in models]
    latency_vals = [1 / max(m["avg_latency_ms"], 1) for m in models]
    reasoning_vals = [m["reasoning_score"] for m in models]
    creativity_vals = [m["creativity_score"] for m in models]
    privacy_vals = [float(m["privacy_tier"]) for m in models]
    coding_vals = [float(m.get("coding_score") or m["reasoning_score"]) for m in models]
    vision_vals = [float(m.get("vision_score") or 0.0) for m in models]

    norm = {
        "cost": _normalize(cost_vals),
        "latency": _normalize(latency_vals),
        "reasoning": _normalize(reasoning_vals),
        "creativity": _normalize(creativity_vals),
        "privacy": _normalize(privacy_vals),
        "coding": _normalize(coding_vals),
        "vision": _normalize(vision_vals),
    }

    ranked: list[ScoredModel] = []
    for i, m in enumerate(models):
        breakdown = {k: norm[k][i] for k in weights}
        score = sum(weights[k] * breakdown[k] for k in weights)
        reason = _reason_for(task_type, m, breakdown)
        try:
            from engines.intelligence.adaptive import adaptive_enabled, blend_score

            if adaptive_enabled():
                score, adaptive_breakdown = blend_score(
                    model_name=m["name"],
                    registry_score=score,
                    task_type=task_type,
                )
                breakdown = {
                    **breakdown,
                    **{f"adaptive_{k}": v for k, v in adaptive_breakdown.items()},
                }
                conf = adaptive_breakdown.get("confidence") or 0
                if conf:
                    reason = f"{reason} · adaptive conf={conf:.2f}"
        except Exception:
            pass
        ranked.append(
            ScoredModel(
                name=m["name"],
                provider=m["provider"],
                score=round(score, 4),
                score_breakdown={k: round(v, 4) for k, v in breakdown.items()},
                context_window=int(m["context_window"]),
                display_name=str(m.get("display_name") or m["name"]),
                capabilities=list(m.get("capabilities") or []),
                reason=reason,
            )
        )

    ranked.sort(key=lambda s: s.score, reverse=True)

    preferred_name = resolve_model_name(preferred)
    if preferred_name and preferred_name in MODEL_BY_NAME:
        pinned = [s for s in ranked if s.name == preferred_name]
        rest = [s for s in ranked if s.name != preferred_name]
        if pinned:
            pinned[0].reason = f"Your selection · {pinned[0].reason}"
            ranked = pinned + rest

    if limit is not None and limit > 0:
        ranked = ranked[:limit]
    return ranked
