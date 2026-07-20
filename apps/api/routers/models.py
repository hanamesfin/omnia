"""
Models router — catalog, task analysis, intelligent routing.
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from engines.model_selection.router import ModelRouter
from engines.model_selection.scorer import catalog_public, detect_task_type, select_model
from engines.model_selection.task_analyzer import analyze_prompt

router = APIRouter()


class AnalyzeRequest(BaseModel):
  prompt: str
  domain: str = "general"
  constraints: list[str] = Field(default_factory=list)
  attachment_count: int = 0
  has_images: bool = False


class RouteRequest(BaseModel):
  prompt: str
  domain: str = "general"
  constraints: list[str] = Field(default_factory=list)
  preferred_model: str | None = None
  attachment_count: int = 0
  has_images: bool = False
  enable_workflow: bool = True


@router.get("/")
async def list_models():
  return catalog_public()


@router.post("/analyze")
async def analyze_task(body: AnalyzeRequest):
  """Return structured TaskAnalysis for a prompt (expandable in UI)."""
  analysis = analyze_prompt(
    body.prompt,
    domain=body.domain,
    constraints=body.constraints,
    attachment_count=body.attachment_count,
    has_images=body.has_images,
  )
  return analysis.to_dict()


@router.post("/route")
async def route_request(body: RouteRequest):
  """
  Intelligent Model Router — analyze, recommend, and pick the best model(s).
  Returns recommended + backup + profile picks + optional multi-agent workflow.
  """
  model_router = ModelRouter()
  decision = model_router.route(
    body.prompt,
    domain=body.domain,
    constraints=body.constraints,
    preferred=body.preferred_model,
    attachment_count=body.attachment_count,
    has_images=body.has_images,
    enable_workflow=body.enable_workflow,
  )
  return decision.to_dict()


@router.get("/recommend")
async def recommend_model(
  domain: str = "general",
  constraints: str = "",
  prompt: str = "",
  frontier: bool = False,
  require_tools: bool = False,
  require_vision: bool = False,
  limit: int = 8,
):
  """Legacy ranked list — prefer POST /route for full routing package."""
  constraint_list = [c.strip() for c in constraints.split(",") if c.strip()]
  task = detect_task_type(domain, prompt=prompt, constraints=constraint_list, frontier=frontier)
  ranked = select_model(
    domain,
    constraint_list,
    frontier=frontier,
    prompt=prompt,
    require_tools=require_tools,
    require_vision=require_vision,
    limit=max(1, min(25, limit)),
  )
  return {
    "task_type": task,
    "recommendations": [
      {
        "name": m.name,
        "display_name": m.display_name or m.name,
        "provider": m.provider,
        "score": m.score,
        "breakdown": m.score_breakdown,
        "capabilities": m.capabilities or [],
        "reason": m.reason,
      }
      for m in ranked
    ],
  }
