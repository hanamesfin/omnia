"""
OpenAI-compatible structured tool calling loop.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

import httpx
import structlog

from config import settings
from engines.providers.gateway import ModelQuotaError, fallback_model_chain, resolve_openrouter_model
from engines.tools.runtime_registry import openai_tool_definitions

log = structlog.get_logger()

ExecuteFn = Callable[[str, dict[str, Any]], Awaitable[str]]
CompleteFn = Callable[..., Awaitable[tuple[str, str]]]
UsableFn = Callable[[str | None], bool]

MAX_TOOL_STEPS = 8


def _is_code_tool(name: str) -> bool:
    return name in ("code_execute", "run_python_code")


def _parse_code_result(raw: str) -> dict[str, Any] | None:
    try:
        data = json.loads(raw)
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _tool_history_entry(name: str, args: dict[str, Any], raw: str) -> dict[str, Any]:
    entry: dict[str, Any] = {"tool": name, "args": args}
    parsed = _parse_code_result(raw) if _is_code_tool(name) else None
    if parsed is not None:
        entry["parsed"] = parsed
        entry["result"] = raw
    else:
        entry["result"] = raw[:4000]
    return entry


def _tool_message_for_llm(name: str, raw: str) -> str:
    if _is_code_tool(name):
        parsed = _parse_code_result(raw)
        if parsed is not None:
            from sandbox_utils import slim_result_for_llm

            return json.dumps(slim_result_for_llm(parsed), ensure_ascii=False)[:12000]
    return raw[:12000]


@dataclass
class ToolLoopResult:
    content: str
    model_used: str
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    steps: int = 0


async def _openai_compatible_tool_turn(
    *,
    url: str,
    api_key: str,
    model: str,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]],
    max_tokens: int,
) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=90.0) as client:
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": 0.4,
            "max_tokens": max_tokens,
            "tools": tools,
            "tool_choice": "auto",
        }
        response = await client.post(
            f"{url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
        if response.status_code in (402, 429, 503):
            raise ModelQuotaError(f"{model} quota ({response.status_code})")
        response.raise_for_status()
        return response.json()


def _parse_assistant_message(data: dict[str, Any]) -> tuple[str, list[dict[str, Any]]]:
    choice = (data.get("choices") or [{}])[0]
    message = choice.get("message") or {}
    content = str(message.get("content") or "")
    tool_calls: list[dict[str, Any]] = []
    for tc in message.get("tool_calls") or []:
        fn = tc.get("function") or {}
        args_raw = fn.get("arguments") or "{}"
        try:
            args = json.loads(args_raw) if isinstance(args_raw, str) else args_raw
        except json.JSONDecodeError:
            args = {"_raw": args_raw}
        tool_calls.append(
            {
                "id": tc.get("id") or "",
                "name": fn.get("name") or "",
                "arguments": args if isinstance(args, dict) else {},
            }
        )
    return content, tool_calls


async def run_tool_calling_loop(
    *,
    system: str,
    user_message: str,
    attached_tool_ids: list[str],
    preferred_model: str | None,
    execute_fn: ExecuteFn,
    complete_with_fallback: CompleteFn,
    llm_usable: UsableFn,
    max_tokens: int = 2000,
    max_steps: int = MAX_TOOL_STEPS,
    extra_openai_tools: list[dict[str, Any]] | None = None,
) -> ToolLoopResult:
    tools = openai_tool_definitions(attached_tool_ids)
    if extra_openai_tools:
        # Deduplicate by function name (MCP namespaced tools win over collisions)
        seen = {
            (t.get("function") or {}).get("name")
            for t in tools
            if isinstance(t, dict)
        }
        for tool in extra_openai_tools:
            name = (tool.get("function") or {}).get("name")
            if name and name not in seen:
                tools.append(tool)
                seen.add(name)
    if not tools:
        text, model = await complete_with_fallback(
            system=system,
            user=user_message,
            preferred_model=preferred_model,
            max_tokens=max_tokens,
        )
        return ToolLoopResult(content=text, model_used=model, steps=0)

    if not (settings.OPENROUTER_API_KEY or "").strip():
        text, model = await complete_with_fallback(
            system=system, user=user_message, preferred_model=preferred_model, max_tokens=max_tokens
        )
        return ToolLoopResult(content=text, model_used=model)

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system[:12000]},
        {"role": "user", "content": user_message[:12000]},
    ]
    history: list[dict[str, Any]] = []
    model_used = preferred_model or settings.LLM_GENERATION_MODEL
    chain = fallback_model_chain(preferred_model, llm_usable=llm_usable)

    for step in range(max_steps):
        data: dict[str, Any] | None = None
        last_error: Exception | None = None
        for candidate in chain:
            try:
                data = await _openai_compatible_tool_turn(
                    url=settings.OPENROUTER_API_URL,
                    api_key=settings.OPENROUTER_API_KEY.strip(),
                    model=resolve_openrouter_model(candidate),
                    messages=messages,
                    tools=tools,
                    max_tokens=max_tokens,
                )
                model_used = candidate
                break
            except ModelQuotaError as e:
                last_error = e
                continue
            except Exception as e:
                last_error = e
                err = str(e).lower()
                if "429" in err or "402" in err:
                    continue
                break

        if data is None:
            log.warning("tool_loop.provider_failed", error=str(last_error))
            text, model = await complete_with_fallback(
                system=system, user=user_message, preferred_model=preferred_model, max_tokens=max_tokens
            )
            return ToolLoopResult(content=text, model_used=model, tool_calls=history, steps=step)

        content, tool_calls = _parse_assistant_message(data)
        if not tool_calls:
            return ToolLoopResult(
                content=content.strip() or "(empty response)",
                model_used=model_used,
                tool_calls=history,
                steps=step + 1,
            )

        messages.append(
            {
                "role": "assistant",
                "content": content or None,
                "tool_calls": [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": {
                            "name": tc["name"],
                            "arguments": json.dumps(tc["arguments"]),
                        },
                    }
                    for tc in tool_calls
                ],
            }
        )

        for tc in tool_calls:
            result = await execute_fn(tc["name"], tc["arguments"])
            history.append(_tool_history_entry(tc["name"], tc["arguments"], result))
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": _tool_message_for_llm(tc["name"], result),
                }
            )

    return ToolLoopResult(
        content="Tool step budget exceeded. Use the tool results gathered so far.",
        model_used=model_used,
        tool_calls=history,
        steps=max_steps,
    )
