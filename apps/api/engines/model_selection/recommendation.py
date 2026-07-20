"""
Model Recommendation Engine — weighted scoring with multiple routing profiles.

Profiles: recommended, fastest, cheapest, highest_quality, reasoning, coding, vision, long_context.
All weights come from metadata — no hardcoded model picks.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engines.model_selection.registry import MODEL_BY_NAME, MODEL_TABLE, resolve_model_name
from engines.model_selection.scorer import WEIGHT_PROFILES, ScoredModel, _normalize, _reason_for
from engines.model_selection.task_analyzer import TaskAnalysis


ROUTING_PROFILES: dict[str, dict[str, float]] = {
  "recommended": {},  # uses task-derived weights
  "fastest": {"latency": 0.55, "cost": 0.15, "reasoning": 0.10, "coding": 0.10, "creativity": 0.05, "privacy": 0.05, "vision": 0.00},
  "cheapest": {"cost": 0.60, "latency": 0.15, "reasoning": 0.10, "coding": 0.05, "creativity": 0.05, "privacy": 0.05, "vision": 0.00},
  "highest_quality": {"reasoning": 0.35, "coding": 0.25, "creativity": 0.20, "latency": 0.05, "cost": 0.05, "privacy": 0.05, "vision": 0.05},
  "reasoning": {"reasoning": 0.55, "coding": 0.15, "latency": 0.05, "cost": 0.10, "creativity": 0.05, "privacy": 0.05, "vision": 0.05},
  "coding": {"coding": 0.50, "reasoning": 0.25, "latency": 0.10, "cost": 0.05, "creativity": 0.05, "privacy": 0.05, "vision": 0.00},
  "vision": {"vision": 0.45, "reasoning": 0.20, "coding": 0.05, "latency": 0.10, "cost": 0.10, "creativity": 0.05, "privacy": 0.05},
  "long_context": {"cost": 0.15, "latency": 0.15, "reasoning": 0.25, "coding": 0.15, "creativity": 0.10, "privacy": 0.10, "vision": 0.10},
}


@dataclass
class ModelPick:
  profile: str
  name: str
  display_name: str
  provider: str
  score: float
  reason: str
  estimated_cost_usd: float = 0.0
  estimated_latency_ms: int = 0
  breakdown: dict[str, float] = field(default_factory=dict)


@dataclass
class RoutingRecommendation:
  task_analysis: TaskAnalysis
  recommended: ModelPick
  backup: ModelPick
  picks: dict[str, ModelPick]
  alternatives: list[ModelPick]
  confidence: float
  estimated_cost_usd: float
  estimated_latency_ms: int
  explanation: str

  def to_dict(self) -> dict[str, Any]:
    return {
      "task_analysis": self.task_analysis.to_dict(),
      "recommended": _pick_dict(self.recommended),
      "backup": _pick_dict(self.backup),
      "picks": {k: _pick_dict(v) for k, v in self.picks.items()},
      "alternatives": [_pick_dict(p) for p in self.alternatives],
      "confidence": self.confidence,
      "estimated_cost_usd": self.estimated_cost_usd,
      "estimated_latency_ms": self.estimated_latency_ms,
      "explanation": self.explanation,
    }


def _pick_dict(p: ModelPick) -> dict[str, Any]:
  return {
    "profile": p.profile,
    "name": p.name,
    "display_name": p.display_name,
    "provider": p.provider,
    "score": p.score,
    "reason": p.reason,
    "estimated_cost_usd": p.estimated_cost_usd,
    "estimated_latency_ms": p.estimated_latency_ms,
    "breakdown": p.breakdown,
  }


def _weights_for_analysis(analysis: TaskAnalysis) -> dict[str, float]:
  base = dict(WEIGHT_PROFILES.get(analysis.primary_task, WEIGHT_PROFILES["general"]))
  if analysis.expected_speed == "fast":
    base["latency"] = min(1.0, base.get("latency", 0.15) + 0.20)
    base["cost"] = min(1.0, base.get("cost", 0.15) + 0.10)
  elif analysis.expected_speed == "quality":
    base["reasoning"] = min(1.0, base.get("reasoning", 0.25) + 0.15)
  if analysis.coding_difficulty > 0.5:
    base["coding"] = min(1.0, base.get("coding", 0.15) + 0.20)
  if analysis.needs_vision:
    base["vision"] = min(1.0, base.get("vision", 0.05) + 0.25)
  # Renormalize
  total = sum(base.values()) or 1.0
  return {k: v / total for k, v in base.items()}


def _filter_models(analysis: TaskAnalysis, models: list[dict[str, Any]]) -> list[dict[str, Any]]:
  out = list(models)
  if analysis.needs_tools:
    out = [m for m in out if m.get("supports_tools", True)]
  if analysis.needs_vision:
    out = [m for m in out if float(m.get("vision_score") or 0) >= 6.0]
  if analysis.needs_long_context:
    out = [m for m in out if int(m.get("context_window") or 0) >= 200_000]
  return out or list(models)


def _score_with_weights(
  models: list[dict[str, Any]],
  weights: dict[str, float],
  task_type: str,
) -> list[ScoredModel]:
  cost_vals = [1 / max(m["cost_per_1k"], 1e-9) for m in models]
  latency_vals = [1 / max(m["avg_latency_ms"], 1) for m in models]
  reasoning_vals = [m["reasoning_score"] for m in models]
  creativity_vals = [m["creativity_score"] for m in models]
  privacy_vals = [float(m["privacy_tier"]) for m in models]
  coding_vals = [float(m.get("coding_score") or m["reasoning_score"]) for m in models]
  vision_vals = [float(m.get("vision_score") or 0.0) for m in models]
  # Long-context bonus for models with huge windows
  long_vals = [min(10.0, (m.get("context_window") or 0) / 200_000) for m in models]

  norm = {
    "cost": _normalize(cost_vals),
    "latency": _normalize(latency_vals),
    "reasoning": _normalize(reasoning_vals),
    "creativity": _normalize(creativity_vals),
    "privacy": _normalize(privacy_vals),
    "coding": _normalize(coding_vals),
    "vision": _normalize(vision_vals),
    "long_context": _normalize(long_vals),
  }

  from engines.intelligence.adaptive import adaptive_enabled, blend_score

  ranked: list[ScoredModel] = []
  for i, m in enumerate(models):
    keys = set(weights) | set(norm)
    breakdown = {k: norm[k][i] for k in keys if k in norm}
    if "long_context" in weights and "long_context" not in breakdown:
      breakdown["long_context"] = norm["long_context"][i]
    score = sum(weights.get(k, 0) * breakdown.get(k, 0) for k in weights)
    reason = _reason_for(task_type, m, breakdown)
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
  return ranked


def _estimate_cost(model: dict[str, Any], analysis: TaskAnalysis) -> float:
  tokens = analysis.estimated_input_tokens + analysis.estimated_output_tokens
  return round((tokens / 1000.0) * float(model.get("cost_per_1k") or 0), 6)


def _to_pick(profile: str, scored: ScoredModel, model_row: dict[str, Any], analysis: TaskAnalysis) -> ModelPick:
  return ModelPick(
    profile=profile,
    name=scored.name,
    display_name=scored.display_name,
    provider=scored.provider,
    score=scored.score,
    reason=scored.reason,
    estimated_cost_usd=_estimate_cost(model_row, analysis),
    estimated_latency_ms=int(model_row.get("avg_latency_ms") or 1500),
    breakdown=scored.score_breakdown,
  )


def recommend(
  analysis: TaskAnalysis,
  *,
  domain: str = "general",
  preferred: str | None = None,
  configured_only: bool = False,
  configured_fn=None,
) -> RoutingRecommendation:
  """
  Full recommendation package: best + backup + profile picks + alternatives.
  """
  models = _filter_models(analysis, list(MODEL_TABLE))
  if configured_fn:
    models = [m for m in models if configured_fn(m["name"])]

  task_type = analysis.primary_task
  rec_weights = _weights_for_analysis(analysis)

  def top_for(profile: str) -> ScoredModel | None:
    weights = ROUTING_PROFILES.get(profile) or rec_weights
    if profile == "long_context":
      weights = ROUTING_PROFILES["long_context"]
    ranked = _score_with_weights(models, weights, task_type)
    return ranked[0] if ranked else None

  recommended_scored = top_for("recommended") or _score_with_weights(models, rec_weights, task_type)[0]
  ranked_all = _score_with_weights(models, rec_weights, task_type)
  backup_scored = ranked_all[1] if len(ranked_all) > 1 else recommended_scored

  picks: dict[str, ModelPick] = {}
  for profile in ROUTING_PROFILES:
    if profile == "recommended":
      continue
    s = top_for(profile)
    if s:
      row = MODEL_BY_NAME.get(s.name) or {}
      picks[profile] = _to_pick(profile, s, row, analysis)

  rec_row = MODEL_BY_NAME.get(recommended_scored.name) or {}
  backup_row = MODEL_BY_NAME.get(backup_scored.name) or {}

  preferred_name = resolve_model_name(preferred)
  if preferred_name and preferred_name in MODEL_BY_NAME:
    for s in ranked_all:
      if s.name == preferred_name:
        recommended_scored = s
        rec_row = MODEL_BY_NAME[preferred_name]
        break

  alternatives = [
    _to_pick("alternative", s, MODEL_BY_NAME.get(s.name) or {}, analysis)
    for s in ranked_all[2:7]
  ]

  confidence = min(0.98, 0.55 + recommended_scored.score * 0.35 + (0.05 if analysis.primary_task != "general" else 0))

  explanation = (
    f"Optimized for {analysis.primary_task.replace('_', ' ')} "
    f"({analysis.complexity} complexity). "
    f"Detected: {', '.join(analysis.detected_categories[:4]) or 'general task'}. "
    f"Selected {recommended_scored.display_name} — {recommended_scored.reason}"
  )

  return RoutingRecommendation(
    task_analysis=analysis,
    recommended=_to_pick("recommended", recommended_scored, rec_row, analysis),
    backup=_to_pick("backup", backup_scored, backup_row, analysis),
    picks=picks,
    alternatives=alternatives,
    confidence=round(confidence, 3),
    estimated_cost_usd=_estimate_cost(rec_row, analysis),
    estimated_latency_ms=int(rec_row.get("avg_latency_ms") or 1500),
    explanation=explanation,
  )
