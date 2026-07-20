"""
Model Router — unified entry point for intelligent model selection.

Flow: analyze prompt → recommend models → (optional) split multi-task workflows → execute.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from engines.model_selection.recommendation import RoutingRecommendation, recommend
from engines.model_selection.task_analyzer import TaskAnalysis, analyze_prompt
from engines.model_selection.workflow import WorkflowPlan, plan_workflow


ConfiguredFn = Callable[[str], bool]


@dataclass
class RouteDecision:
  """Final routing decision for one user turn."""

  model_id: str
  backup_model_id: str
  recommendation: RoutingRecommendation
  workflow: WorkflowPlan | None = None
  auto_routed: bool = True
  manual_override: str | None = None

  def to_dict(self) -> dict[str, Any]:
    return {
      "model_id": self.model_id,
      "backup_model_id": self.backup_model_id,
      "auto_routed": self.auto_routed,
      "manual_override": self.manual_override,
      "recommendation": self.recommendation.to_dict(),
      "workflow": self.workflow.to_dict() if self.workflow else None,
    }


class ModelRouter:
  """
  Production Model Router — invisible to users, overridable at any time.

  Usage:
      router = ModelRouter(configured_fn=_provider_configured)
      decision = router.route(prompt="...", domain="coding")
      model = decision.model_id
  """

  def __init__(self, *, configured_fn: ConfiguredFn | None = None) -> None:
    self._configured_fn = configured_fn

  def analyze(
    self,
    prompt: str,
    *,
    domain: str = "general",
    constraints: list[str] | None = None,
    attachment_count: int = 0,
    has_images: bool = False,
  ) -> TaskAnalysis:
    return analyze_prompt(
      prompt,
      domain=domain,
      constraints=constraints,
      attachment_count=attachment_count,
      has_images=has_images,
    )

  def recommend(
    self,
    analysis: TaskAnalysis,
    *,
    domain: str = "general",
    preferred: str | None = None,
  ) -> RoutingRecommendation:
    return recommend(
      analysis,
      domain=domain,
      preferred=preferred,
      configured_fn=self._configured_fn,
    )

  def route(
    self,
    prompt: str,
    *,
    domain: str = "general",
    constraints: list[str] | None = None,
    preferred: str | None = None,
    attachment_count: int = 0,
    has_images: bool = False,
    enable_workflow: bool = True,
  ) -> RouteDecision:
    """
    Full routing pipeline for a single user request.
    """
    analysis = self.analyze(
      prompt,
      domain=domain,
      constraints=constraints,
      attachment_count=attachment_count,
      has_images=has_images,
    )
    rec = self.recommend(analysis, domain=domain, preferred=preferred)

    workflow = None
    if enable_workflow and analysis.multi_task:
      workflow = plan_workflow(prompt, analysis, rec)

    manual = preferred if preferred else None
    return RouteDecision(
      model_id=rec.recommended.name,
      backup_model_id=rec.backup.name,
      recommendation=rec,
      workflow=workflow,
      auto_routed=not bool(preferred),
      manual_override=manual,
    )


# Module-level singleton for simple imports
_default_router: ModelRouter | None = None


def get_router(*, configured_fn: ConfiguredFn | None = None) -> ModelRouter:
  global _default_router
  if configured_fn is not None:
    return ModelRouter(configured_fn=configured_fn)
  if _default_router is None:
    _default_router = ModelRouter()
  return _default_router
