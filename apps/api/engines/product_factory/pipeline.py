"""Product Factory invent pipeline — phased specialists with gates and retries."""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import Any

import structlog

from engines.product_factory.gates import gate_phase
from engines.product_factory.phases import PHASE_LABELS, PHASE_ORDER, SOFT_PHASES
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
    phase_order: list[str] | None = None,
    max_retries: int | None = None,
    llm_phases: set[str] | None = None,
    skip_critic: bool = False,
) -> dict[str, Any]:
    """
    Run invent phases. Returns:
      {
        workspace, product_blueprint, ai_core, phases, served_model, created_via
      }

    On Vercel Hobby (300s maxDuration), pass llm_phases={"classify","ai_core"}
    and skip_critic=True so non-core phases stay heuristic and finish in time.

    Soft phases ui_codegen / backend_codegen never hard-fail invent: when
    PRODUCT_FACTORY_FIGMA_CODEGEN is off, token missing, or vision fails, they
    skip and leave page_ux / architecture heuristics intact.
    """
    transcript = _format_chat(chat)
    req_blob = json.dumps(requirements or {}, default=str)[:4000]
    workspace = empty_workspace(name=name, chat_summary=transcript[:1500])
    served_models: list[str] = []
    created_via = "product_factory"
    ordered = list(phase_order) if phase_order else list(PHASE_ORDER)
    retries = MAX_RETRIES if max_retries is None else max(1, int(max_retries))

    async def emit(event: dict[str, Any]) -> None:
        if on_progress:
            maybe = on_progress(event)
            if maybe is not None and hasattr(maybe, "__await__"):
                await maybe  # type: ignore[misc]

    for phase_id in ordered:
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
        allow_llm = llm_phases is None or phase_id in llm_phases
        for attempt in range(1, retries + 1):
            data: dict[str, Any] | None = None
            used_model = "heuristic"
            try:
                if phase_id in SOFT_PHASES:
                    data, used_model = await _run_codegen_phase(
                        phase_id=phase_id,
                        workspace=workspace,
                        name=name,
                        transcript=transcript,
                        preferred_model=preferred_model,
                        llm_complete=llm_complete,
                        parse_json=parse_json,
                        allow_llm=allow_llm,
                    )
                    if used_model == "skipped":
                        created_via = created_via  # unchanged
                elif allow_llm:
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
                else:
                    data = heuristic_phase(phase_id, workspace, name=name, transcript=transcript)
                    used_model = "heuristic"
                    created_via = "product_factory_serverless"
                if used_model not in ("heuristic", "skipped") and used_model:
                    served_models.append(used_model)
            except Exception as e:
                log.warning("product_factory.phase_llm_failed", phase=phase_id, error=str(e))
                last_errors = [str(e)]
                data = None

            if not data and use_heuristics_on_failure:
                data = heuristic_phase(phase_id, workspace, name=name, transcript=transcript)
                used_model = "heuristic"
                if phase_id not in SOFT_PHASES:
                    created_via = "product_factory_heuristic"

            if not data:
                if phase_id in SOFT_PHASES:
                    # Soft phases always advance even with empty output
                    data = {"skipped": True}
                    used_model = "skipped"
                else:
                    last_errors = last_errors or ["empty specialist output"]
                    continue

            # Critic pass (skip for heuristic-only / serverless / soft codegen)
            if (
                used_model not in ("heuristic", "skipped")
                and not skip_critic
                and phase_id not in SOFT_PHASES
            ):
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
            if attempt == retries and use_heuristics_on_failure:
                repair = heuristic_phase(phase_id, workspace, name=name, transcript=transcript)
                candidate = merge_phase_output(workspace, phase_id, repair)
                ok2, failures2 = gate_phase(phase_id, candidate)
                if ok2 or phase_id in SOFT_PHASES:
                    workspace = candidate
                    if phase_id not in SOFT_PHASES:
                        created_via = "product_factory_heuristic"
                    workspace.setdefault("phases", []).append(
                        {
                            "id": phase_id,
                            "label": label,
                            "status": "passed",
                            "attempt": attempt,
                            "summary": _phase_summary(phase_id, workspace)
                            + (" (heuristic repair)" if phase_id not in SOFT_PHASES else " (skipped)"),
                            "model": "heuristic" if phase_id not in SOFT_PHASES else "skipped",
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
            if phase_id in SOFT_PHASES:
                workspace.setdefault("phases", []).append(
                    {
                        "id": phase_id,
                        "label": label,
                        "status": "passed",
                        "summary": "skipped (soft)",
                        "model": "skipped",
                    }
                )
                await emit(
                    {
                        "type": "phase_done",
                        "phase_id": phase_id,
                        "label": label,
                        "status": "passed",
                        "summary": "skipped (soft)",
                    }
                )
                continue
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


async def _run_codegen_phase(
    *,
    phase_id: str,
    workspace: dict[str, Any],
    name: str,
    transcript: str,
    preferred_model: str | None,
    llm_complete: LLMFn,
    parse_json: ParseFn,
    allow_llm: bool,
) -> tuple[dict[str, Any], str]:
    """
    Orchestrate Figma UI / FastAPI backend codegen.

    Order choice (documented):
      - ui_codegen runs after page_ux (needs IA + design_system + page_specs)
      - backend_codegen runs after architecture (needs entities/modules; may use
        generated_frontend file list). Placed before ai_core so invent always
        completes the AI prompt even if backend stubs are heuristic-only.
    """
    if phase_id == "ui_codegen":
        # Vercel / llm_phases fast path: never burn the budget on vision + Figma.
        if not allow_llm:
            return {"generated_frontend": {}, "skipped": True}, "skipped"
        try:
            from engines.product_factory.ui_code_generator import generate_frontend_from_figma

            prompt = f"{name}\n{transcript}"[:4000]
            result = await generate_frontend_from_figma(
                workspace=workspace,
                user_prompt=prompt,
                llm_complete=llm_complete if allow_llm else None,
                preferred_model=preferred_model,
                parse_json=parse_json,
            )
            if result and isinstance(result.get("generated_frontend"), dict):
                files = (result["generated_frontend"] or {}).get("files") or {}
                if files:
                    return result, "vision"
        except Exception as e:
            log.warning("product_factory.ui_codegen_failed", error=str(e))
        return {"generated_frontend": {}, "skipped": True}, "skipped"

    if phase_id == "backend_codegen":
        try:
            from engines.product_factory.backend_code_generator import generate_backend_scaffold

            result = await generate_backend_scaffold(
                workspace=workspace,
                llm_complete=llm_complete if allow_llm else None,
                preferred_model=preferred_model,
                parse_json=parse_json,
            )
            if result and isinstance(result.get("generated_backend"), dict):
                files = (result["generated_backend"] or {}).get("files") or {}
                if files:
                    src = str((result["generated_backend"] or {}).get("source") or "heuristic")
                    return result, "llm" if src == "llm" else "heuristic"
        except Exception as e:
            log.warning("product_factory.backend_codegen_failed", error=str(e))
        return {"generated_backend": {}, "skipped": True}, "skipped"

    return {}, "skipped"


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
            "chrome": (workspace.get("design_system") or {}).get("chrome"),
        },
        "page_spec_ids": list((workspace.get("page_specs") or {}).keys()),
        "architecture": workspace.get("architecture"),
        "has_generated_frontend": bool((workspace.get("generated_frontend") or {}).get("files")),
        "has_generated_backend": bool((workspace.get("generated_backend") or {}).get("files")),
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
    if phase_id == "ui_codegen":
        files = (workspace.get("generated_frontend") or {}).get("files") or {}
        if files:
            return f"{len(files)} frontend files"
        tmpl = (workspace.get("figma_template") or {}).get("id") or ""
        return f"skipped{f' (matched {tmpl})' if tmpl else ''}"
    if phase_id == "architecture":
        mods = (workspace.get("architecture") or {}).get("modules") or []
        return f"{len(mods)} modules"
    if phase_id == "backend_codegen":
        files = (workspace.get("generated_backend") or {}).get("files") or {}
        return f"{len(files)} backend files" if files else "skipped"
    if phase_id == "ai_core":
        return str((workspace.get("ai_core") or {}).get("specialty") or "")[:120]
    return phase_id


def _format_chat(chat: list[dict[str, str]]) -> str:
    parts = []
    for m in chat:
        who = "Architect" if m.get("role") == "assistant" else "User"
        parts.append(f"{who}: {m.get('content') or ''}")
    return "\n".join(parts)
