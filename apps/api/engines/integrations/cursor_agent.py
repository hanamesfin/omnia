"""
Cursor AI integration — run Cursor agents from OMNIA via the official Python SDK.

Local: edits the caller's working tree.
Cloud: Cursor-hosted VM against a cloned repo (optional PR).

Requires: pip install cursor-sdk + CURSOR_API_KEY
Docs: https://cursor.com/docs/sdk/python
"""
from __future__ import annotations

import asyncio
import os
from dataclasses import asdict, dataclass
from typing import Any, Literal

from config import settings

RuntimeKind = Literal["local", "cloud"]


@dataclass
class CursorRunResult:
    status: str  # finished | error | unavailable | config_error
    text: str
    agent_id: str | None = None
    run_id: str | None = None
    runtime: RuntimeKind = "local"
    model: str = ""
    error: str | None = None
    retryable: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_tool_output(self) -> str:
        if self.status == "finished":
            header = f"[cursor_agent {self.runtime} · {self.model or 'auto'} · ok]"
            if self.agent_id:
                header += f" agent={self.agent_id}"
            if self.run_id:
                header += f" run={self.run_id}"
            body = (self.text or "").strip() or "(no assistant text)"
            return f"{header}\n{body}"[:12000]
        reason = self.error or self.status
        return f"[cursor_agent {self.status}] {reason}"[:2000]


def cursor_sdk_installed() -> bool:
    try:
        import cursor_sdk  # noqa: F401

        return True
    except ImportError:
        return False


def cursor_api_key() -> str:
    return (settings.CURSOR_API_KEY or os.environ.get("CURSOR_API_KEY") or "").strip()


def cursor_configured() -> bool:
    return bool(cursor_api_key()) and cursor_sdk_installed()


def cursor_status() -> dict[str, Any]:
    key = cursor_api_key()
    installed = cursor_sdk_installed()
    return {
        "configured": bool(key) and installed,
        "api_key_set": bool(key),
        "sdk_installed": installed,
        "default_model": (settings.CURSOR_DEFAULT_MODEL or "composer-2.5").strip(),
        "default_cwd": (settings.CURSOR_DEFAULT_CWD or "").strip() or os.getcwd(),
        "default_runtime": (settings.CURSOR_DEFAULT_RUNTIME or "local").strip().lower(),
        "hint": (
            None
            if (key and installed)
            else (
                "Install cursor-sdk (`pip install cursor-sdk`) and set CURSOR_API_KEY "
                "in apps/api/.env (Dashboard → Integrations)."
                if not installed
                else "Set CURSOR_API_KEY in apps/api/.env (Cursor Dashboard → Integrations)."
            )
        ),
    }


def _normalize_runtime(raw: str | None) -> RuntimeKind:
    r = (raw or settings.CURSOR_DEFAULT_RUNTIME or "local").strip().lower()
    return "cloud" if r == "cloud" else "local"


async def run_cursor_prompt(
    prompt: str,
    *,
    runtime: str | None = None,
    model: str | None = None,
    cwd: str | None = None,
    repo_url: str | None = None,
    starting_ref: str | None = None,
    auto_create_pr: bool = False,
    timeout_s: float | None = None,
) -> CursorRunResult:
    """
    One-shot Cursor agent run (create → send → wait → dispose).
    Prefer local for OMNIA coding agents; cloud when a GitHub repo URL is provided.
    """
    text = (prompt or "").strip()
    if not text:
        return CursorRunResult(
            status="config_error",
            text="",
            error="prompt is required",
        )

    if not cursor_sdk_installed():
        return CursorRunResult(
            status="unavailable",
            text="",
            error="cursor-sdk is not installed — pip install cursor-sdk",
        )

    api_key = cursor_api_key()
    if not api_key:
        return CursorRunResult(
            status="config_error",
            text="",
            error="CURSOR_API_KEY is not set",
            retryable=False,
        )

    kind = _normalize_runtime(runtime)
    if kind == "cloud" and not (repo_url or "").strip():
        return CursorRunResult(
            status="config_error",
            text="",
            error="cloud runtime requires repo_url (GitHub HTTPS URL)",
        )

    model_id = (model or settings.CURSOR_DEFAULT_MODEL or "composer-2.5").strip()
    work_cwd = (cwd or settings.CURSOR_DEFAULT_CWD or "").strip() or os.getcwd()
    timeout = float(
        timeout_s
        if timeout_s is not None
        else (settings.CURSOR_RUN_TIMEOUT_SECONDS or 600)
    )

    try:
        return await asyncio.wait_for(
            _run_async(
                prompt=text,
                kind=kind,
                model_id=model_id,
                api_key=api_key,
                work_cwd=work_cwd,
                repo_url=(repo_url or "").strip(),
                starting_ref=(starting_ref or "main").strip() or "main",
                auto_create_pr=bool(auto_create_pr),
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        return CursorRunResult(
            status="error",
            text="",
            runtime=kind,
            model=model_id,
            error=f"Cursor run timed out after {int(timeout)}s",
            retryable=True,
        )
    except Exception as exc:
        # CursorAgentError and unexpected failures
        name = type(exc).__name__
        msg = str(getattr(exc, "message", None) or exc)
        retryable = bool(getattr(exc, "is_retryable", False) or getattr(exc, "isRetryable", False))
        return CursorRunResult(
            status="error",
            text="",
            runtime=kind,
            model=model_id,
            error=f"{name}: {msg}",
            retryable=retryable,
        )


async def _run_async(
    *,
    prompt: str,
    kind: RuntimeKind,
    model_id: str,
    api_key: str,
    work_cwd: str,
    repo_url: str,
    starting_ref: str,
    auto_create_pr: bool,
) -> CursorRunResult:
    from cursor_sdk import AsyncClient, CloudAgentOptions, CloudRepository, LocalAgentOptions

    async with await AsyncClient.launch_bridge(workspace=work_cwd) as client:
        if kind == "cloud":
            create_kwargs: dict[str, Any] = {
                "model": model_id,
                "api_key": api_key,
                "cloud": CloudAgentOptions(
                    repos=[CloudRepository(url=repo_url, starting_ref=starting_ref)],
                    auto_create_pr=auto_create_pr,
                    skip_reviewer_request=True,
                ),
            }
        else:
            create_kwargs = {
                "model": model_id,
                "api_key": api_key,
                "local": LocalAgentOptions(cwd=work_cwd, setting_sources=[]),
            }

        async with await client.agents.create(**create_kwargs) as agent:
            agent_id = getattr(agent, "agent_id", None) or getattr(agent, "agentId", None)
            run = await agent.send(prompt)
            run_id = getattr(run, "id", None)
            try:
                assistant_text = await run.text()
            except Exception:
                assistant_text = ""
            result = await run.wait()
            status = getattr(result, "status", None) or "finished"
            if status == "error":
                return CursorRunResult(
                    status="error",
                    text=str(assistant_text or ""),
                    agent_id=str(agent_id) if agent_id else None,
                    run_id=str(run_id) if run_id else None,
                    runtime=kind,
                    model=model_id,
                    error=f"run failed: {run_id or 'unknown'}",
                    retryable=False,
                )
            return CursorRunResult(
                status="finished" if status in ("finished", "completed", "ok") else str(status),
                text=str(assistant_text or getattr(result, "result", "") or ""),
                agent_id=str(agent_id) if agent_id else None,
                run_id=str(run_id) if run_id else None,
                runtime=kind,
                model=model_id,
            )
