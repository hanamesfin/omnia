"""Product Factory invent pipeline — phased specialists with gates and retries."""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import Any

import structlog

from engines.product_factory.gates import gate_phase
from engines.product_factory.phases import PHASE_LABELS, PHASE_ORDER
from engines.product_factory.specialists import critic_prompt, heuristic_phase, load_prompt
from engines.product_factory.workspace import empty_workspace, merge_phase_output, to_product_blueprint

log = structlog.get_logger(__name__)

LLMFn = Callable[..., Awaitable[tuple[str, str]]]
ParseFn = Callable[[str], dict[str, Any] | None]
ProgressFn = Callable[[dict[str, Any]], Awaitable[None] | None]

MAX_RETRIES = 2


async def run_product_factory(
    *,
    name: str,
    chat: list[dict[str, str]],
    requirements: dict[str, Any],
    preferred_model: str | None,
    llm_complete: LLMFn,
    parse_json: ParseFn,
    on_progress: ProgressFn | None = None,
    use_heuristics_on_failure: bool = True,
) -> dict[str, Any]:
    """
    Run all invent phases. Returns:
      {
        workspace, product_blueprint, ai_core, phases, served_model, created_via
      }
    """
    transcript = _format_chat(chat)
    req_blob = json.dumps(requirements or {}, default=str)[:4000]
    workspace = empty_workspace(name=name, chat_summary=transcript[:1500])
    served_models: list[str] = []
    created_via = "product_factory"

    async def emit(event: dict[str, Any]) -> None:
        if on_progress:
            maybe = on_progress(event)
            if maybe is not None and hasattr(maybe, "__await__"):
                await maybe  # type: ignore[misc]

    for phase_id in PHASE_ORDER:
        label = PHASE_LABELS.get(phase_id, phase_id)
        await emit(
            {
                "type": "phase_start",
                "phase_id": phase_id,
                "label": label,
                "status": "running",
            }
        )
        last_errors: list[str] = []
        success = False
        for attempt in range(1, MAX_RETRIES + 1):
            data: dict[str, Any] | None = None
            used_model = "heuristic"
            try:
                data, used_model = await _run_specialist(
                    phase_id=phase_id,
                    workspace=workspace,
                    name=name,
                    transcript=transcript,
                    requirements_json=req_blob,
                    preferred_model=preferred_model,
                    llm_complete=llm_complete,
                    parse_json=parse_json,
                )
                if used_model != "heuristic":
                    served_models.append(used_model)
            except Exception as e:
                log.warning("product_factory.phase_llm_failed", phase=phase_id, error=str(e))
                last_errors = [str(e)]
                data = None

            if not data and use_heuristics_on_failure:
                data = heuristic_phase(phase_id, workspace, name=name, transcript=transcript)
                used_model = "heuristic"
                created_via = "product_factory_heuristic"

            if not data:
                last_errors = last_errors or ["empty specialist output"]
                continue

            # Critic pass (skip for heuristic-only to keep tests fast/deterministic)
            if used_model != "heuristic":
                try:
                    critiqued, cmodel = await _run_critic(
                        phase_id=phase_id,
                        draft=data,
                        workspace=workspace,
                        name=name,
                        transcript=transcript,
                        preferred_model=preferred_model or used_model,
                        llm_complete=llm_complete,
                        parse_json=parse_json,
                    )
                    if critiqued:
                        data = critiqued
                        served_models.append(cmodel)
                except Exception as e:
                    log.warning("product_factory.critic_skip", phase=phase_id, error=str(e))

            candidate = merge_phase_output(workspace, phase_id, data)
            ok, failures = gate_phase(phase_id, candidate)
            if ok:
                workspace = candidate
                workspace.setdefault("phases", []).append(
                    {
                        "id": phase_id,
                        "label": label,
                        "status": "passed",
                        "attempt": attempt,
                        "summary": _phase_summary(phase_id, workspace),
                        "model": used_model,
                    }
                )
                await emit(
                    {
                        "type": "phase_done",
                        "phase_id": phase_id,
                        "label": label,
                        "status": "passed",
                        "summary": _phase_summary(phase_id, workspace),
                        "attempt": attempt,
                        "product_type": workspace.get("product_type"),
                        "nav": (workspace.get("information_architecture") or {}).get("nav") or [],
                        "design_personality": (workspace.get("design_system") or {}).get("personality"),
                    }
                )
                success = True
                break

            last_errors = failures
            await emit(
                {
                    "type": "phase_retry",
                    "phase_id": phase_id,
                    "label": label,
                    "status": "retry",
                    "failures": failures,
                    "attempt": attempt,
                }
            )
            # On last attempt, accept heuristic repair if possible
            if attempt == MAX_RETRIES and use_heuristics_on_failure:
                repair = heuristic_phase(phase_id, workspace, name=name, transcript=transcript)
                candidate = merge_phase_output(workspace, phase_id, repair)
                ok2, failures2 = gate_phase(phase_id, candidate)
                if ok2:
                    workspace = candidate
                    created_via = "product_factory_heuristic"
                    workspace.setdefault("phases", []).append(
                        {
                            "id": phase_id,
                            "label": label,
                            "status": "passed",
                            "attempt": attempt,
                            "summary": _phase_summary(phase_id, workspace) + " (heuristic repair)",
                            "model": "heuristic",
                        }
                    )
                    await emit(
                        {
                            "type": "phase_done",
                            "phase_id": phase_id,
                            "label": label,
                            "status": "passed",
                            "summary": _phase_summary(phase_id, workspace),
                            "attempt": attempt,
                            "product_type": workspace.get("product_type"),
                            "nav": (workspace.get("information_architecture") or {}).get("nav") or [],
                            "design_personality": (workspace.get("design_system") or {}).get("personality"),
                        }
                    )
                    success = True
                    break
                last_errors = failures2

        if not success:
            workspace.setdefault("phases", []).append(
                {
                    "id": phase_id,
                    "label": label,
                    "status": "failed",
                    "summary": "; ".join(last_errors)[:300],
                }
            )
            await emit(
                {
                    "type": "phase_failed",
                    "phase_id": phase_id,
                    "label": label,
                    "status": "failed",
                    "failures": last_errors,
                }
            )
            raise ProductFactoryError(
                f"Phase '{phase_id}' failed quality gates: " + "; ".join(last_errors)
            )

    blueprint = to_product_blueprint(workspace)
    ai_core = dict(workspace.get("ai_core") or {})
    return {
        "workspace": workspace,
        "product_blueprint": blueprint,
        "ai_core": ai_core,
        "phases": list(workspace.get("phases") or []),
        "served_model": served_models[-1] if served_models else "heuristic",
        "created_via": created_via,
    }


class ProductFactoryError(RuntimeError):
    pass


async def _run_specialist(
    *,
    phase_id: str,
    workspace: dict[str, Any],
    name: str,
    transcript: str,
    requirements_json: str,
    preferred_model: str | None,
    llm_complete: LLMFn,
    parse_json: ParseFn,
) -> tuple[dict[str, Any], str]:
    system = load_prompt(phase_id)
    user = (
        f"Product name: {name}\n\n"
        f"Interview transcript:\n{transcript[:6000]}\n\n"
        f"Interview requirements JSON:\n{requirements_json}\n\n"
        f"Workspace so far:\n{json.dumps(_workspace_brief(workspace), default=str)[:6000]}\n\n"
        f"Complete the '{phase_id}' phase. Return JSON only."
    )
    max_tokens = 3200 if phase_id in ("ai_core", "page_ux", "prd") else 1800
    raw, used = await llm_complete(
        system=system,
        user=user,
        preferred_model=preferred_model,
        max_tokens=max_tokens,
    )
    data = parse_json(raw)
    if not data:
        raise ValueError(f"{phase_id} returned non-JSON")
    return data, used


async def _run_critic(
    *,
    phase_id: str,
    draft: dict[str, Any],
    workspace: dict[str, Any],
    name: str,
    transcript: str,
    preferred_model: str | None,
    llm_complete: LLMFn,
    parse_json: ParseFn,
) -> tuple[dict[str, Any] | None, str]:
    system = critic_prompt()
    user = (
        f"Phase: {phase_id}\nProduct: {name}\n"
        f"Transcript excerpt:\n{transcript[:2500]}\n\n"
        f"Workspace brief:\n{json.dumps(_workspace_brief(workspace), default=str)[:3000]}\n\n"
        f"Draft JSON:\n{json.dumps(draft, default=str)[:6000]}\n\n"
        "Return improved JSON only."
    )
    raw, used = await llm_complete(
        system=system,
        user=user,
        preferred_model=preferred_model,
        max_tokens=2400,
    )
    return parse_json(raw), used


def _workspace_brief(workspace: dict[str, Any]) -> dict[str, Any]:
    return {
        "product_type": workspace.get("product_type"),
        "daily_workflow": workspace.get("daily_workflow"),
        "uvp": workspace.get("uvp"),
        "target_users": workspace.get("target_users"),
        "prd": workspace.get("prd"),
        "information_architecture": workspace.get("information_architecture"),
        "design_system": {
            "personality": (workspace.get("design_system") or {}).get("personality"),
            "tokens": (workspace.get("design_system") or {}).get("tokens"),
        },
        "page_spec_ids": list((workspace.get("page_specs") or {}).keys()),
        "architecture": workspace.get("architecture"),
    }


def _phase_summary(phase_id: str, workspace: dict[str, Any]) -> str:
    if phase_id == "classify":
        return f"{workspace.get('product_type')} — {workspace.get('daily_workflow', '')[:80]}"
    if phase_id == "strategy":
        return str(workspace.get("uvp") or "")[:120]
    if phase_id == "prd":
        fr = (workspace.get("prd") or {}).get("functional_requirements") or []
        return f"{len(fr)} functional requirements"
    if phase_id == "ia":
        nav = (workspace.get("information_architecture") or {}).get("nav") or []
        return f"{len(nav)} nav items"
    if phase_id == "design_system":
        return str((workspace.get("design_system") or {}).get("personality") or "")[:80]
    if phase_id == "page_ux":
        return f"{len(workspace.get('page_specs') or {})} page specs"
    if phase_id == "architecture":
        mods = (workspace.get("architecture") or {}).get("modules") or []
        return f"{len(mods)} modules"
    if phase_id == "ai_core":
        return str((workspace.get("ai_core") or {}).get("specialty") or "")[:120]
    return phase_id


def _format_chat(chat: list[dict[str, str]]) -> str:
    parts = []
    for m in chat:
        who = "Architect" if m.get("role") == "assistant" else "User"
        parts.append(f"{who}: {m.get('content') or ''}")
    return "\n".join(parts)
