"""Interview router — §5.1 FSM interview + extraction trigger."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from auth import get_current_user, require_permission
from database import get_db
from models import User, InterviewSession
from engines.user_intelligence.fsm import advance_fsm, get_initial_step, FSMStep

router = APIRouter()


class StartResponse(BaseModel):
    session_id: str
    state: str
    question: str
    chips: list[str]
    progress: int


class AnswerRequest(BaseModel):
    session_id: str
    answer: str
    # §6.3: chip and freetext are equivalent inputs to the same FSM transition
    answer_type: str = "freetext"  # "chip" | "freetext"


class AnswerResponse(BaseModel):
    session_id: str
    state: str
    question: str | None
    chips: list[str]
    is_done: bool
    progress: int
    answers: dict   # current collected answers, for frontend preview


@router.post("/start", response_model=StartResponse)
async def start_interview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    step = get_initial_step()
    session = InterviewSession(user_id=current_user.id, state=step.state, answers={})
    db.add(session)
    await db.flush()
    return StartResponse(
        session_id=session.id,
        state=step.state,
        question=step.question,
        chips=step.chips,
        progress=step.progress,
    )


@router.post("/answer", response_model=AnswerResponse)
async def submit_answer(
    req: AnswerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(InterviewSession).where(
        InterviewSession.id == req.session_id,
        InterviewSession.user_id == current_user.id,
    ))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, {"error": {"code": "interview.not_found", "message": "Session not found", "retryable": False}})

    if req.answer_type not in ("chip", "freetext"):
        raise HTTPException(400, {
            "error": {
                "code": "interview.invalid_answer_type",
                "message": "answer_type must be chip or freetext",
                "retryable": False,
            }
        })

    # Advance FSM — chip and freetext normalize to the same answer shape
    new_answers, step = advance_fsm(
        session.state,
        dict(session.answers),
        req.answer,
        answer_type=req.answer_type,
    )
    session.state = step.state
    session.answers = new_answers

    return AnswerResponse(
        session_id=session.id,
        state=step.state,
        question=step.question,
        chips=step.chips,
        is_done=step.is_done,
        progress=step.progress,
        answers=new_answers,
    )
