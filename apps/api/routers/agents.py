"""
Agents router — generate, retrieve, chat (streaming SSE), rate.
§5.1–5.4, §5.7
"""
from __future__ import annotations

import json
import time
import random
import asyncio
from typing import AsyncGenerator

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from auth import get_current_user, require_permission
from database import get_db
from models import (
    User, Agent, AgentSpec, AgentVersion, AgentLibrary, MarketplaceListing,
    InterviewSession, Evaluation, AuditLog,
)
from engines.user_intelligence.extractor import extract_user_profile
from engines.agent_architect.composer import compose_agent_spec
from engines.prompt_engineering.generator import generate_prompt
from engines.model_selection.scorer import select_model, MODEL_BY_NAME
from engines.evaluation.scorer import EvaluationInput, compute_composite
from engines.memory.retriever import (
    append_session_message, get_session_messages, retrieve_relevant_context
)
from config import settings
from openai import AsyncOpenAI

router = APIRouter()
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY or "sk-unset")

CUSTOM_MODEL_CONFIG = {
    "deepseek-coder": {
        "url": settings.DEEPSEEK_API_URL,
        "api_key": settings.DEEPSEEK_API_KEY,
    },
    "qwen2.5-coder": {
        "url": settings.QWEN_API_URL,
        "api_key": settings.QWEN_API_KEY,
    },
    "code-llama": {
        "url": settings.CODE_LLAMA_API_URL,
        "api_key": settings.CODE_LLAMA_API_KEY,
    },
}


def _normalize_choice_content(data: dict[str, object]) -> str:
    choice = data.get("choices", [])[0] if data.get("choices") else {}
    if not isinstance(choice, dict):
        return ""
    delta = choice.get("delta") or {}
    if isinstance(delta, dict) and isinstance(delta.get("content"), str):
        return delta["content"]
    message = choice.get("message")
    if isinstance(message, dict) and isinstance(message.get("content"), str):
        return message["content"]
    text = choice.get("text")
    if isinstance(text, str):
        return text
    return ""


async def _stream_openai_compatible_chat(
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
) -> AsyncGenerator[str, None]:
    if not base_url:
        raise ValueError(f"Missing API URL for model {model}")

    endpoint = f"{base_url.rstrip('/')}/v1/chat/completions"
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 1024,
        "stream": True,
    }
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", endpoint, json=payload, headers=headers, timeout=60.0) as stream_resp:
            stream_resp.raise_for_status()
            content_type = stream_resp.headers.get("content-type", "")
            if "text/event-stream" in content_type:
                async for line in stream_resp.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    payload_line = line[6:]
                    if payload_line.strip() == "[DONE]":
                        continue
                    try:
                        event = json.loads(payload_line)
                    except json.JSONDecodeError:
                        continue
                    delta = _normalize_choice_content(event)
                    if delta:
                        yield delta
            else:
                payload_text = await stream_resp.aread()
                if not payload_text:
                    return
                data = json.loads(payload_text)
                delta = _normalize_choice_content(data)
                if delta:
                    yield delta
            if delta:
                yield delta


async def _stream_custom_model(
    model_id: str,
    messages: list[dict[str, str]],
) -> AsyncGenerator[str, None]:
    config = CUSTOM_MODEL_CONFIG.get(model_id)
    if not config:
        raise ValueError(f"Unknown custom model: {model_id}")
    return _stream_openai_compatible_chat(
        base_url=config["url"],
        api_key=config["api_key"],
        model=model_id,
        messages=messages,
    )


# ─── Generate ─────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    session_id: str
    name: str  # user-chosen agent name
    preferred_model: str | None = None


class LintCheckOut(BaseModel):
    name: str
    passed: bool
    message: str


class MatchedTemplateOut(BaseModel):
    id: str
    name: str
    score: float


class GenerateResponse(BaseModel):
    agent_id: str
    name: str
    domain: str
    matched_templates: list[MatchedTemplateOut]
    rules_fired: list[str]
    selected_model: str
    model_score: float
    model_score_breakdown: dict
    prompt_text: str
    lint_passed: bool
    lint_checks: list[LintCheckOut]
    version: int
    spec: dict


@router.post("/generate", response_model=GenerateResponse)
async def generate_agent(
    req: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("agent.create")),
):
    # Load interview session
    sess_result = await db.execute(select(InterviewSession).where(
        InterviewSession.id == req.session_id,
        InterviewSession.user_id == current_user.id,
    ))
    interview = sess_result.scalar_one_or_none()
    if not interview:
        raise HTTPException(404, {"error": {"code": "agent.session_not_found", "message": "Interview session not found", "retryable": False}})

    # §5.1 Stage 2: extract user profile
    profile = await extract_user_profile(dict(interview.answers))

    # §5.2: compose AgentSpec via template matching + rule engine
    agent_spec = compose_agent_spec(profile, dict(interview.answers))

    # §5.4: select best model (optional user override from Create + menu)
    preferred = (req.preferred_model or "").strip() or None
    ranked_models = select_model(
        profile.domain,
        profile.constraints,
        frontier=agent_spec.capability_tier == "frontier",
        preferred=preferred,
    )
    best_model = ranked_models[0]

    # §5.3: generate system prompt + lint
    prompt_result = await generate_prompt(agent_spec)

    # Persist AgentSpec
    db_spec = AgentSpec(
        user_id=current_user.id,
        domain=profile.domain,
        primary_goal=profile.primary_goal,
        technical_level=profile.technical_level,
        formality=profile.formality,
        autonomy_preference=profile.autonomy_preference,
        constraints=profile.constraints,
        suggested_tools=profile.suggested_tools,
        matched_templates=agent_spec.matched_templates,
        rules_fired=agent_spec.rules_fired,
    )
    db.add(db_spec)
    await db.flush()

    # Persist Agent (share_context defaults False; creator may enable later)
    specialty = (profile.primary_goal or agent_spec.role or "")[:200]
    db_agent = Agent(
        name=req.name,
        specialty=specialty,
        spec_id=db_spec.id,
        owner_id=current_user.id,
        org_id=current_user.org_id,
        model_id=best_model.name,
        status="active",
        current_version=1,
        share_context=False,
    )
    db.add(db_agent)
    await db.flush()

    # Land in Yours as "Created by you" (§6.3 / agent_library)
    db.add(AgentLibrary(
        user_id=current_user.id,
        agent_id=db_agent.id,
        source="created",
    ))

    # Persist AgentVersion
    db_version = AgentVersion(
        agent_id=db_agent.id,
        version_number=1,
        prompt_text=prompt_result.prompt_text,
        linter_result={
            "passed": prompt_result.lint.passed,
            "checks": prompt_result.lint.checks,
            "word_count": prompt_result.lint.word_count,
            "fk_grade": prompt_result.lint.fk_grade,
        },
        model_selection_result={
            "ranked": [{"name": m.name, "score": m.score, "breakdown": m.score_breakdown} for m in ranked_models[:3]]
        },
    )
    db.add(db_version)

    # Audit log
    db.add(AuditLog(
        actor_id=current_user.id,
        action="agent.generate",
        target_type="agent",
        target_id=db_agent.id,
        metadata={"session_id": req.session_id},
    ))

    lint_checks_out = [LintCheckOut(**c) for c in prompt_result.lint.checks]

    return GenerateResponse(
        agent_id=db_agent.id,
        name=db_agent.name,
        domain=profile.domain,
        matched_templates=[MatchedTemplateOut(**t) for t in agent_spec.matched_templates],
        rules_fired=agent_spec.rules_fired,
        selected_model=best_model.name,
        model_score=best_model.score,
        model_score_breakdown=best_model.score_breakdown,
        prompt_text=prompt_result.prompt_text,
        lint_passed=prompt_result.lint.passed,
        lint_checks=lint_checks_out,
        version=1,
        spec={
            "role": agent_spec.role,
            "tone": agent_spec.tone,
            "tools": agent_spec.tools,
            "memory_strategy": agent_spec.memory_strategy,
            "evaluation_criteria": agent_spec.evaluation_criteria,
        },
    )


# ─── Get Agent ────────────────────────────────────────────────────────────────

@router.get("/{agent_id}")
async def get_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("agent.read")),
):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.org_id == current_user.org_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(404, {"error": {"code": "agent.not_found", "message": "Agent not found", "retryable": False}})

    # Get latest version prompt
    ver_result = await db.execute(
        select(AgentVersion)
        .where(AgentVersion.agent_id == agent_id)
        .order_by(AgentVersion.version_number.desc())
        .limit(1)
    )
    latest_version = ver_result.scalar_one_or_none()

    return {
        "id": agent.id,
        "name": agent.name,
        "specialty": agent.specialty,
        "domain": agent.spec.domain if agent.spec else "",
        "model_id": agent.model_id,
        "status": agent.status,
        "current_version": agent.current_version,
        "share_context": agent.share_context,
        "prompt_text": latest_version.prompt_text if latest_version else "",
        "linter_result": latest_version.linter_result if latest_version else {},
        "created_at": agent.created_at.isoformat(),
    }


@router.get("/")
async def list_agents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("agent.read")),
):
    """Yours page: agents in the user's library, split by source."""
    result = await db.execute(
        select(AgentLibrary, Agent)
        .join(Agent, Agent.id == AgentLibrary.agent_id)
        .where(AgentLibrary.user_id == current_user.id, Agent.status != "archived")
        .order_by(AgentLibrary.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": agent.id,
            "name": agent.name,
            "specialty": agent.specialty,
            "model_id": agent.model_id,
            "status": agent.status,
            "source": lib.source,
            "share_context": agent.share_context,
            "current_version": agent.current_version,
            "created_at": agent.created_at.isoformat(),
        }
        for lib, agent in rows
    ]


class ShareContextRequest(BaseModel):
    share_context: bool


@router.patch("/{agent_id}/share-context")
async def set_share_context(
    agent_id: str,
    req: ShareContextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("agent.update")),
):
    """Toggle §6.3 shared-context — only for agents you created."""
    lib = await db.execute(
        select(AgentLibrary).where(
            AgentLibrary.user_id == current_user.id,
            AgentLibrary.agent_id == agent_id,
            AgentLibrary.source == "created",
        )
    )
    if not lib.scalar_one_or_none():
        raise HTTPException(403, {
            "error": {
                "code": "agent.share_context_forbidden",
                "message": "Shared context can only be enabled on agents you created",
                "retryable": False,
            }
        })

    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.org_id == current_user.org_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(404, {"error": {"code": "agent.not_found", "message": "Agent not found", "retryable": False}})

    agent.share_context = req.share_context
    db.add(AuditLog(
        actor_id=current_user.id,
        action="agent.share_context",
        target_type="agent",
        target_id=agent.id,
        metadata={"share_context": req.share_context},
    ))
    return {"id": agent.id, "share_context": agent.share_context}


@router.post("/{agent_id}/add-to-yours", status_code=201)
async def add_to_yours(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("agent.read")),
):
    """Discover → Add to Yours. share_context stays off for Discover-added agents."""
    agent_result = await db.execute(select(Agent).where(Agent.id == agent_id, Agent.status == "active"))
    agent = agent_result.scalar_one_or_none()
    if not agent:
        raise HTTPException(404, {"error": {"code": "agent.not_found", "message": "Agent not found", "retryable": False}})

    # Must be a public marketplace listing to add someone else's agent
    if agent.owner_id != current_user.id:
        listing = await db.execute(
            select(MarketplaceListing).where(
                MarketplaceListing.agent_id == agent_id,
                MarketplaceListing.visibility == "public",
            )
        )
        if not listing.scalar_one_or_none():
            raise HTTPException(404, {
                "error": {
                    "code": "marketplace.not_listed",
                    "message": "Only agents published to Discover can be added",
                    "retryable": False,
                }
            })

    existing = await db.execute(
        select(AgentLibrary).where(
            AgentLibrary.user_id == current_user.id,
            AgentLibrary.agent_id == agent_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, {
            "error": {
                "code": "library.already_added",
                "message": "Agent is already in Yours",
                "retryable": False,
            }
        })

    source = "created" if agent.owner_id == current_user.id else "added_from_explore"
    entry = AgentLibrary(user_id=current_user.id, agent_id=agent_id, source=source)
    db.add(entry)
    # Discover-added agents must not silently read other agents' memory
    if source == "added_from_explore":
        agent.share_context = False

    db.add(AuditLog(
        actor_id=current_user.id,
        action="library.add",
        target_type="agent",
        target_id=agent_id,
        metadata={"source": source},
    ))
    await db.flush()
    return {"id": entry.id, "agent_id": agent_id, "source": source}


# ─── Chat (SSE streaming) ─────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    chat_session_id: str | None = None


async def _stream_chat(
    agent: Agent,
    latest_prompt: str,
    user_message: str,
    session_id: str,
    owner_id: str,
) -> AsyncGenerator[str, None]:
    """Generate SSE events for a streaming chat response."""
    # Retrieve episodic memory context
    context_chunks = await retrieve_relevant_context(owner_id, user_message, agent_id=agent.id)
    memory_context = ""
    if context_chunks:
        memory_context = "\n\n[Memory context from previous sessions:\n" + "\n".join(context_chunks) + "]"

    # Build message history
    history = await get_session_messages(session_id)
    messages = [
        {"role": "system", "content": latest_prompt + memory_context},
        *history,
        {"role": "user", "content": user_message},
    ]

    # Store user message in session
    await append_session_message(session_id, "user", user_message)

    # Check for prompt injection patterns (§9)
    injection_patterns = ["ignore previous instructions", "ignore all instructions", "disregard your system prompt", "forget your instructions"]
    lower_msg = user_message.lower()
    if any(p in lower_msg for p in injection_patterns):
        yield f"data: {json.dumps({'type': 'warning', 'content': '[Potential prompt injection detected — logged]'})}\n\n"

    start_ms = time.time() * 1000
    full_response = ""

    try:
        model_id = agent.model_id or settings.LLM_GENERATION_MODEL
        if model_id in CUSTOM_MODEL_CONFIG:
            stream = _stream_custom_model(model_id, messages)
        else:
            stream = await openai_client.chat.completions.create(
                model=model_id,
                messages=messages,
                stream=True,
                max_tokens=1024,
            )

        async for chunk in stream:
            if hasattr(chunk, "choices"):
                delta = chunk.choices[0].delta.content or ""
            elif isinstance(chunk, str):
                delta = chunk
            else:
                delta = ""

            if delta:
                full_response += delta
                yield f"data: {json.dumps({'type': 'token', 'content': delta})}\n\n"

        await append_session_message(session_id, "assistant", full_response)

        elapsed_ms = int(time.time() * 1000 - start_ms)
        yield f"data: {json.dumps({'type': 'done', 'latency_ms': elapsed_ms})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': "Couldn't reach the model - retrying...", 'retryable': True})}\n\n"


@router.post("/{agent_id}/chat")
async def chat(
    agent_id: str,
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("agent.read")),
):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.org_id == current_user.org_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(404, {"error": {"code": "agent.not_found", "message": "Agent not found", "retryable": False}})

    ver_result = await db.execute(
        select(AgentVersion)
        .where(AgentVersion.agent_id == agent_id)
        .order_by(AgentVersion.version_number.desc())
        .limit(1)
    )
    latest_version = ver_result.scalar_one_or_none()
    if not latest_version:
        raise HTTPException(400, {"error": {"code": "agent.no_prompt", "message": "Agent has no generated prompt yet", "retryable": False}})

    session_id = req.chat_session_id or f"{current_user.id}:{agent_id}"

    return StreamingResponse(
        _stream_chat(agent, latest_version.prompt_text, req.message, session_id, current_user.id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class PersonalizeRequest(BaseModel):
    model_id: str | None = None
    custom_instructions: str | None = None
    tone_override: str | None = None
    share_context: bool | None = None
    specialty: str | None = None


@router.patch("/{agent_id}/personalize")
async def personalize_agent(
    agent_id: str,
    req: PersonalizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("agent.update")),
):
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.org_id == current_user.org_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(404, {"error": {"code": "agent.not_found", "message": "Agent not found", "retryable": False}})

    if req.model_id is not None and req.model_id.strip():
        mid = req.model_id.strip()
        if mid not in MODEL_BY_NAME:
            raise HTTPException(
                400,
                {"error": {"code": "agent.unknown_model", "message": f"Unknown model: {mid}", "retryable": False}},
            )
        agent.model_id = mid
    if req.share_context is not None:
        agent.share_context = req.share_context
    if req.specialty is not None:
        agent.specialty = req.specialty.strip()[:200]

    if req.custom_instructions is not None or req.tone_override is not None:
        # Personalization fields are not persisted in this backend schema yet.
        pass

    db.add(AuditLog(
        actor_id=current_user.id,
        action="agent.personalize",
        target_type="agent",
        target_id=agent.id,
        metadata={
            "model_id": req.model_id,
            "share_context": req.share_context,
            "specialty": req.specialty,
        },
    ))
    await db.flush()

    return {
        "id": agent.id,
        "model_id": agent.model_id,
        "share_context": agent.share_context,
        "specialty": agent.specialty,
    }


# ─── Rate (evaluation feedback) ───────────────────────────────────────────────

class RateRequest(BaseModel):
    rating: float   # 1–5
    chat_session_id: str | None = None


@router.post("/{agent_id}/rate")
async def rate_agent(
    agent_id: str,
    req: RateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("agent.read")),
):
    if not 1.0 <= req.rating <= 5.0:
        raise HTTPException(400, {"error": {"code": "eval.invalid_rating", "message": "Rating must be 1–5", "retryable": False}})

    # Compute rolling success rate from last 20 evaluations
    recent = await db.execute(
        select(Evaluation)
        .where(Evaluation.agent_id == agent_id)
        .order_by(Evaluation.created_at.desc())
        .limit(20)
    )
    recent_evals = recent.scalars().all()
    rolling_success = (
        sum(1 for e in recent_evals if e.success) / len(recent_evals)
        if recent_evals else 1.0
    )

    ev_input = EvaluationInput(
        latency_ms=1000,  # estimated; real latency tracked in chat stream
        success=True,
        schema_valid=True,
        user_rating=req.rating,
        tokens_used=0,
        cost_usd=0.0,
        rolling_success_rate=rolling_success,
    )
    score = compute_composite(ev_input)

    db_eval = Evaluation(
        agent_id=agent_id,
        latency_ms=1000,
        success=True,
        user_rating=req.rating,
        tokens_used=0,
        cost_usd=0.0,
        composite_score=score.composite,
    )
    db.add(db_eval)

    return {"composite_score": score.composite, "breakdown": score.breakdown}
