"""Evaluation + Evolution router — §5.7, §5.8"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from auth import get_current_user, require_permission
from database import get_db
from models import User, Agent, Evaluation, EvolutionFlag
from engines.evolution.detector import check_for_anomaly, correlate_versions_with_scores
from engines.evaluation.scorer import EvaluationInput, compute_composite

router = APIRouter()


@router.get("/{agent_id}/evaluation")
async def get_evaluation(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("evaluation.read")),
):
    # Tenant isolation — query filters by org_id
    agent_check = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.org_id == current_user.org_id)
    )
    if not agent_check.scalar_one_or_none():
        raise HTTPException(404, {"error": {"code": "agent.not_found", "message": "Agent not found", "retryable": False}})

    evals = await db.execute(
        select(Evaluation)
        .where(Evaluation.agent_id == agent_id)
        .order_by(Evaluation.created_at.asc())
    )
    eval_rows = evals.scalars().all()

    scores = [e.composite_score for e in eval_rows if e.composite_score is not None]
    avg_score = round(sum(scores) / len(scores), 4) if scores else 0.0

    flags = await db.execute(
        select(EvolutionFlag)
        .where(EvolutionFlag.agent_id == agent_id)
        .order_by(EvolutionFlag.triggered_at.desc())
    )
    flag_rows = flags.scalars().all()

    return {
        "agent_id": agent_id,
        "evaluation_count": len(eval_rows),
        "average_composite_score": avg_score,
        "history": [
            {
                "id": e.id,
                "composite_score": e.composite_score,
                "user_rating": e.user_rating,
                "latency_ms": e.latency_ms,
                "success": e.success,
                "created_at": e.created_at.isoformat(),
            }
            for e in eval_rows
        ],
        "evolution_flags": [
            {
                "id": f.id,
                "triggered_at": f.triggered_at.isoformat(),
                "z_score": f.z_score,
                "status": f.status,
                "suggestion": f.suggestion_text,
            }
            for f in flag_rows
        ],
    }


@router.post("/{agent_id}/evolution-check")
async def run_evolution_check(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("evolution.read")),
):
    """Trigger an evolution anomaly check for this agent."""
    agent_check = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.org_id == current_user.org_id)
    )
    if not agent_check.scalar_one_or_none():
        raise HTTPException(404, {"error": {"code": "agent.not_found", "message": "Agent not found", "retryable": False}})

    evals = await db.execute(
        select(Evaluation)
        .where(Evaluation.agent_id == agent_id, Evaluation.composite_score.isnot(None))
        .order_by(Evaluation.created_at.desc())
        .limit(50)
    )
    eval_rows = evals.scalars().all()
    scores = [e.composite_score for e in eval_rows]

    if len(scores) < 2:
        return {"flagged": False, "message": "Not enough evaluation data yet"}

    newest_score = scores[0]
    history = scores[1:]

    result = check_for_anomaly(history, newest_score)

    if result.should_flag:
        flag = EvolutionFlag(
            agent_id=agent_id,
            z_score=result.z_score,
            rolling_mean=result.rolling_mean,
            rolling_std=result.rolling_std,
            offending_score=result.offending_score,
            suggestion_text=result.suggestion,
        )
        db.add(flag)

    return {
        "flagged": result.should_flag,
        "z_score": result.z_score,
        "rolling_mean": result.rolling_mean,
        "suggestion": result.suggestion,
    }
