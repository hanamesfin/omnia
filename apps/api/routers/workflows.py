"""
Workflows router — §5.5 Multi-Agent Orchestrator
DAG execution and status streaming.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from auth import get_current_user, require_permission
from database import get_db
from models import User

router = APIRouter()

# Stubbed for Phase 2 implementation.
# In Phase 1, we just return 501 Not Implemented or empty lists to keep the API surface valid.

@router.get("/")
async def list_workflows(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("workflow.read")),
):
    return []

@router.post("/")
async def create_workflow(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("workflow.create")),
):
    raise HTTPException(status_code=501, detail="Phase 2 feature")

@router.post("/{workflow_id}/run")
async def run_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("workflow.run")),
):
    raise HTTPException(status_code=501, detail="Phase 2 feature")
