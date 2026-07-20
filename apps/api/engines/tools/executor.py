"""
Execute runtime tools — web search, fetch, file parse, code sandbox, HTTP.
"""
from __future__ import annotations

import asyncio
import ipaddress
import json
import re
import socket
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlparse

import httpx
import structlog

from config import settings
from engines.tools.file_parse import parse_bytes
from engines.tools.runtime_registry import PermissionTier, normalize_tool_id
from sandbox_utils import (
    E2bSandboxSession,
    dumps_execution,
    format_result_text,
    run_python_code,
    run_python_code_piston,
)

log = structlog.get_logger()

MAX_FETCH_CHARS = 50_000
MAX_HTTP_BODY = 100_000
HTTP_TIMEOUT = 25.0


@dataclass
class ToolContext:
    user_id: str
    uploads: dict[str, dict[str, Any]]
    attachment_ids: list[str] = field(default_factory=list)
    agent_id: str | None = None
    # agent_id → list[{"content": str, "source": str}]
    memory_store: dict[str, list[dict[str, Any]]] | None = None
    # Stateful E2B Jupyter kernel for the current agent turn (when configured).
    e2b_session: E2bSandboxSession | None = None
    # Trusted confirmations supplied by the authenticated request, never by the model.
    confirmed_tool_ids: set[str] = field(default_factory=set)


def _is_private_host(host: str) -> bool:
    if not host:
        return True
    host = host.strip().lower()
    if host in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
        return True
    try:
        infos = socket.getaddrinfo(host, None)
        for info in infos:
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return True
    except Exception:
        return True
    return False


def _assert_public_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http and https URLs are allowed")
    if _is_private_host(parsed.hostname or ""):
        raise ValueError("Private or local URLs are not allowed")


def _html_to_text(html: str) -> str:
    html = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", html)
    html = re.sub(r"(?is)<!--.*?-->", " ", html)
    html = re.sub(r"(?s)<[^>]+>", " ", html)
    html = re.sub(r"\s+", " ", html)
    return html.strip()


async def _web_search(query: str, count: int = 5) -> str:
    count = max(1, min(10, int(count or 5)))
    if settings.TAVILY_API_KEY.strip():
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            r = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": settings.TAVILY_API_KEY.strip(),
                    "query": query,
                    "max_results": count,
                },
            )
            r.raise_for_status()
            data = r.json()
        lines = []
        for item in data.get("results") or []:
            lines.append(
                f"- {item.get('title', '')}\n  {item.get('url', '')}\n  {item.get('content', '')}"
            )
        return "\n".join(lines) if lines else "No results."

    if (settings.EXA_API_KEY or "").strip():
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            r = await client.post(
                "https://api.exa.ai/search",
                headers={
                    "x-api-key": settings.EXA_API_KEY.strip(),
                    "Content-Type": "application/json",
                },
                json={"query": query, "num_results": count, "contents": {"text": True}},
            )
            r.raise_for_status()
            data = r.json()
        lines = []
        for item in data.get("results") or []:
            lines.append(
                f"- {item.get('title', '')}\n  {item.get('url', '')}\n  {(item.get('text') or '')[:500]}"
            )
        return "\n".join(lines) if lines else "No results."

    if settings.BRAVE_SEARCH_API_KEY.strip():
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            r = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers={
                    "Accept": "application/json",
                    "X-Subscription-Token": settings.BRAVE_SEARCH_API_KEY.strip(),
                },
                params={"q": query, "count": count},
            )
            r.raise_for_status()
            data = r.json()
        results = data.get("web", {}).get("results") or []
        lines = []
        for item in results[:count]:
            lines.append(
                f"- {item.get('title', '')}\n  {item.get('url', '')}\n  {item.get('description', '')}"
            )
        return "\n".join(lines) if lines else "No results."

    return (
        "Web search is not configured. Set TAVILY_API_KEY, EXA_API_KEY, or "
        "BRAVE_SEARCH_API_KEY in apps/api/.env."
    )


async def _web_fetch(url: str, max_chars: int = 12000) -> str:
    _assert_public_url(url)
    max_chars = max(500, min(MAX_FETCH_CHARS, int(max_chars or 12000)))
    async with httpx.AsyncClient(
        timeout=HTTP_TIMEOUT,
        follow_redirects=True,
        headers={"User-Agent": "OMNIA-Agent/1.0"},
    ) as client:
        r = await client.get(url)
        r.raise_for_status()
        ctype = (r.headers.get("content-type") or "").lower()
        raw = r.text if "text" in ctype or "html" in ctype or "json" in ctype else r.content[: max_chars * 2]
    if isinstance(raw, bytes):
        try:
            text = raw.decode("utf-8", errors="replace")
        except Exception:
            text = str(raw[:2000])
    else:
        text = raw
    if "html" in ctype:
        text = _html_to_text(text)
    if len(text) > max_chars:
        text = text[:max_chars] + f"\n… [truncated at {max_chars:,} chars]"
    return text or "(empty page)"


async def _file_parse(ctx: ToolContext, attachment_id: str) -> str:
    aid = (attachment_id or "").strip()
    if aid in ("latest", "last", ""):
        if ctx.attachment_ids:
            aid = ctx.attachment_ids[-1]
        elif ctx.uploads:
            aid = next(reversed(ctx.uploads))
        else:
            return "No attachments available to parse."
    rec = ctx.uploads.get(aid)
    if not rec or rec.get("owner_id") != ctx.user_id:
        return f"Attachment {aid} not found or not owned by user."
    raw = rec.get("raw")
    if raw is None:
        return rec.get("extracted_text") or f"[No stored content for {rec.get('filename')}]"
    return parse_bytes(
        raw,
        str(rec.get("filename") or "file"),
        str(rec.get("media") or "binary"),
    )


async def _code_execute(code: str, stdin: str = "", *, ctx: ToolContext | None = None) -> str:
    """Run Python in E2B (stateful per turn) or Piston fallback. Returns JSON string."""
    e2b_key = (settings.E2B_API_KEY or "").strip()
    if e2b_key:
        try:
            if ctx and ctx.e2b_session:
                data = await asyncio.to_thread(ctx.e2b_session.run_code, code)
            else:
                data = await asyncio.to_thread(run_python_code, code)
            return dumps_execution(data)
        except Exception as e:
            log.warning("tool.e2b_failed", error=str(e))

    try:
        data = await run_python_code_piston(code, stdin)
        return dumps_execution(data)
    except Exception as e:
        log.warning("tool.piston_failed", error=str(e))
        return dumps_execution(
            {
                "success": False,
                "sandbox": "none",
                "error_name": type(e).__name__,
                "error_value": str(e),
                "traceback": "",
                "stdout": "",
                "stderr": "",
                "images": [],
            }
        )


async def _browser_automation(
    url: str,
    actions: list[dict[str, Any]] | None = None,
    extract_text: bool = True,
) -> str:
    _assert_public_url(url)
    key = (settings.BROWSERBASE_API_KEY or "").strip()
    project = (settings.BROWSERBASE_PROJECT_ID or "").strip()
    if not key:
        return (
            "Browser automation is not configured. Set BROWSERBASE_API_KEY "
            "(and BROWSERBASE_PROJECT_ID) in apps/api/.env. "
            f"Requested start URL: {url}. Actions planned: {json.dumps(actions or [])[:800]}"
        )
    async with httpx.AsyncClient(timeout=60.0) as client:
        create = await client.post(
            "https://www.browserbase.com/v1/sessions",
            headers={"x-bb-api-key": key, "Content-Type": "application/json"},
            json={"projectId": project} if project else {},
        )
        if create.status_code >= 400:
            return f"Browserbase session error: {create.status_code} {create.text[:400]}"
        session = create.json()
        session_id = session.get("id")
        connect_url = session.get("connectUrl") or session.get("connect_url")
        # Without Playwright CDP in this process, return session for remote tooling + fetch fallback.
        page_text = await _web_fetch(url, 15000) if extract_text else ""
        return (
            f"browserbase_session={session_id}\nconnect={connect_url}\n"
            f"start_url={url}\nactions={json.dumps(actions or [])}\n"
            f"page_text_preview:\n{page_text[:8000]}\n"
            "(Full click/type automation requires Playwright CDP against connectUrl — "
            "session is provisioned; page text fetched as interim.)"
        )


async def _memory_search(ctx: ToolContext, query: str, top_k: int = 5) -> str:
    if not ctx.agent_id or not ctx.memory_store:
        return "No long-term memory store attached to this agent yet."
    chunks = list(ctx.memory_store.get(ctx.agent_id) or [])
    if not chunks:
        return "Memory is empty — upload knowledge files or store notes first."
    q = {w for w in query.lower().split() if len(w) > 2}
    scored: list[tuple[int, dict[str, Any]]] = []
    for chunk in chunks:
        text = str(chunk.get("content") or "")
        words = {w for w in text.lower().split() if len(w) > 2}
        score = len(q & words)
        scored.append((score, chunk))
    scored.sort(key=lambda x: x[0], reverse=True)
    top = [c for s, c in scored[: max(1, min(10, top_k))] if s > 0] or [c for _, c in scored[:3]]
    lines = []
    for c in top:
        lines.append(f"- ({c.get('source', 'note')}) {str(c.get('content') or '')[:1200]}")
    return "\n".join(lines)


async def _knowledge_search(ctx: ToolContext, query: str, top_k: int = 5) -> str:
    if not ctx.agent_id:
        return "No agent id — cannot search knowledge."
    from engines.knowledge import get_knowledge_store, search_knowledge, format_hits

    hits = search_knowledge(
        get_knowledge_store(),
        query,
        agent_id=ctx.agent_id,
        top_k=max(1, min(10, int(top_k or 5))),
    )
    return format_hits(hits)


async def _mcp_call(server: str, tool: str, arguments: dict[str, Any] | None) -> str:
    from engines.tools.mcp_client import McpClient

    client = McpClient()
    if not client.configured:
        return (
            "No MCP servers configured. Set MCP_SERVERS_JSON in apps/api/.env "
            '(e.g. [{"name":"github","transport":"stdio","command":"npx",'
            '"args":["-y","@modelcontextprotocol/server-github"]}]).'
        )
    return await client.call_tool(server, tool, arguments or {})


async def _http_request(
    url: str,
    method: str,
    headers: dict[str, Any] | None = None,
    body: Any = None,
) -> str:
    _assert_public_url(url)
    method = (method or "GET").upper()
    hdrs = {str(k): str(v) for k, v in (headers or {}).items()}
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
        kwargs: dict[str, Any] = {"headers": hdrs}
        if method in ("POST", "PUT", "PATCH") and body is not None:
            kwargs["json"] = body if isinstance(body, (dict, list)) else body
        r = await client.request(method, url, **kwargs)
    text = r.text[:MAX_HTTP_BODY]
    try:
        parsed = r.json()
        text = json.dumps(parsed, ensure_ascii=False)[:MAX_HTTP_BODY]
    except Exception:
        pass
    return f"status={r.status_code}\n{text}"


async def execute_tool(
    tool_id: str,
    args: dict[str, Any],
    *,
    ctx: ToolContext,
) -> str:
    tid = normalize_tool_id(tool_id)
    try:
        if tid == "web_search":
            return await _web_search(str(args.get("query") or ""), int(args.get("count") or 5))
        if tid == "web_fetch":
            return await _web_fetch(str(args.get("url") or ""), int(args.get("max_chars") or 12000))
        if tid == "file_parse":
            return await _file_parse(ctx, str(args.get("attachment_id") or "latest"))
        if tid == "code_execute":
            return await _code_execute(
                str(args.get("code") or ""),
                str(args.get("stdin") or ""),
                ctx=ctx,
            )
        if tid == "http_request":
            return await _http_request(
                str(args.get("url") or ""),
                str(args.get("method") or "GET"),
                args.get("headers") if isinstance(args.get("headers"), dict) else None,
                args.get("body"),
            )
        if tid == "browser_automation":
            actions = args.get("actions") if isinstance(args.get("actions"), list) else []
            return await _browser_automation(
                str(args.get("url") or ""),
                actions,
                bool(args.get("extract_text", True)),
            )
        if tid == "memory_search":
            return await _memory_search(
                ctx, str(args.get("query") or ""), int(args.get("top_k") or 5)
            )
        if tid == "knowledge_search":
            return await _knowledge_search(
                ctx, str(args.get("query") or ""), int(args.get("top_k") or 5)
            )
        if tid == "mcp_call":
            return await _mcp_call(
                str(args.get("server") or ""),
                str(args.get("tool") or ""),
                args.get("arguments") if isinstance(args.get("arguments"), dict) else {},
            )
        if tid == "translate":
            return await _translate(
                str(args.get("text") or ""),
                str(args.get("target") or ""),
                str(args.get("source") or "") or None,
            )
        if tid == "send_email":
            if tid not in ctx.confirmed_tool_ids:
                return (
                    "Confirmation required: show the recipient, subject, and body to the user, "
                    "then retry only after the authenticated request confirms send_email."
                )
            return await _send_email(args)
        if tid == "cursor_agent":
            return await _cursor_agent(args)
        return f"Unknown tool: {tool_id}"
    except Exception as e:
        log.warning("tool.execute_failed", tool=tid, error=str(e))
        return f"Tool error ({tid}): {e}"


async def _cursor_agent(args: dict[str, Any]) -> str:
    from engines.integrations.cursor_agent import run_cursor_prompt

    result = await run_cursor_prompt(
        str(args.get("prompt") or ""),
        runtime=str(args.get("runtime") or "") or None,
        model=str(args.get("model") or "") or None,
        cwd=str(args.get("cwd") or "") or None,
        repo_url=str(args.get("repo_url") or "") or None,
        starting_ref=str(args.get("starting_ref") or "") or None,
        auto_create_pr=bool(args.get("auto_create_pr")),
    )
    return result.to_tool_output()


async def _translate(text: str, target: str, source: str | None) -> str:
    from engines.tools.google_translate import TranslateError, google_translate

    try:
        result = await google_translate(text, target=target, source=source)
    except TranslateError as e:
        return f"Translate error: {e}"
    detected = result.get("detected_source_language") or "auto"
    return (
        f"translated ({detected} → {result.get('target')}):\n"
        f"{result.get('translated_text') or ''}"
    )


async def _send_email(args: dict[str, Any]) -> str:
    from engines.tools.resend_email import ResendEmailError, send_resend_email

    try:
        result = await send_resend_email(
            to=args.get("to") or "",
            subject=str(args.get("subject") or ""),
            html=str(args.get("html") or "") or None,
            text=str(args.get("text") or "") or None,
            cc=args.get("cc"),
            reply_to=str(args.get("reply_to") or "") or None,
        )
    except ResendEmailError as e:
        return f"Email error: {e}"
    return (
        f"Email sent via Resend. id={result.get('id')}; "
        f"to={', '.join(result.get('to') or [])}; subject={result.get('subject')}"
    )


def tool_permission_tier(tool_id: str) -> PermissionTier:
    from engines.tools.runtime_registry import RUNTIME_TOOLS

    tid = normalize_tool_id(tool_id)
    tool = RUNTIME_TOOLS.get(tid)
    return tool.permission_tier if tool else "side_effecting"
