"""
Model Context Protocol (MCP) client — stdio transport.

Generated agents act as MCP *clients*. Enterprise tools live in isolated MCP
*servers* (see apps/api/mcp_servers/). Credentials stay on the server side.
"""
from __future__ import annotations

import json
import os
import sys
from contextlib import AsyncExitStack
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import structlog

from config import settings

log = structlog.get_logger()

API_ROOT = Path(__file__).resolve().parents[2]


@dataclass
class McpServerConfig:
    name: str
    transport: str = "stdio"  # stdio | sse
    command: str = ""
    args: list[str] = field(default_factory=list)
    url: str = ""
    # Logical capability aliases the Architect may emit (web_scraper, github, …)
    aliases: list[str] = field(default_factory=list)


def _builtin_servers() -> list[McpServerConfig]:
    """Always-available local MCP servers shipped with Omnia."""
    scraper = API_ROOT / "mcp_servers" / "scraper_server.py"
    return [
        McpServerConfig(
            name="web_scraper",
            transport="stdio",
            command=sys.executable,
            args=[str(scraper)],
            aliases=["web_scraper", "scraper", "browser_fetch"],
        ),
    ]


def load_mcp_servers() -> list[McpServerConfig]:
    """Merge built-in servers with MCP_SERVERS_JSON from env."""
    servers = {s.name: s for s in _builtin_servers()}
    raw = (settings.MCP_SERVERS_JSON or "").strip()
    if raw:
        try:
            items = json.loads(raw)
        except json.JSONDecodeError:
            log.warning("mcp.config_invalid")
            items = []
        for item in items if isinstance(items, list) else []:
            if not isinstance(item, dict) or not item.get("name"):
                continue
            name = str(item["name"])
            servers[name] = McpServerConfig(
                name=name,
                transport=str(item.get("transport") or "stdio"),
                command=str(item.get("command") or sys.executable),
                args=list(item.get("args") or []),
                url=str(item.get("url") or ""),
                aliases=list(item.get("aliases") or [name]),
            )
    return list(servers.values())


def resolve_mcp_servers(required: list[str] | None) -> list[McpServerConfig]:
    """
    Map Architect capability names → concrete server configs.
    Empty required → no MCP (caller may still attach builtins later).
    """
    catalog = load_mcp_servers()
    if not required:
        return []
    wanted = {str(x).strip().lower().replace("-", "_") for x in required if x and str(x).lower() != "none"}
    if not wanted:
        return []
    matched: list[McpServerConfig] = []
    for server in catalog:
        aliases = {server.name.lower(), *[a.lower() for a in server.aliases]}
        if aliases & wanted or server.name.lower() in wanted:
            matched.append(server)
    return matched


def mcp_tool_name(server: str, tool: str) -> str:
    """Namespace MCP tools so OpenRouter function names stay unique."""
    safe_server = re_sub(server)
    safe_tool = re_sub(tool)
    return f"mcp__{safe_server}__{safe_tool}"


def parse_mcp_tool_name(name: str) -> tuple[str, str] | None:
    if not name.startswith("mcp__"):
        return None
    parts = name.split("__", 2)
    if len(parts) != 3:
        return None
    return parts[1], parts[2]


def re_sub(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in value.strip().lower())


def format_mcp_tools_for_llm(server: str, tools_result: Any) -> list[dict[str, Any]]:
    """Convert MCP list_tools payload → OpenAI/OpenRouter function tools."""
    tools = getattr(tools_result, "tools", None) or []
    formatted: list[dict[str, Any]] = []
    for tool in tools:
        name = getattr(tool, "name", None) or (tool.get("name") if isinstance(tool, dict) else None)
        if not name:
            continue
        description = (
            getattr(tool, "description", None)
            or (tool.get("description") if isinstance(tool, dict) else None)
            or f"MCP tool {name} on {server}"
        )
        schema = (
            getattr(tool, "inputSchema", None)
            or getattr(tool, "input_schema", None)
            or (tool.get("inputSchema") if isinstance(tool, dict) else None)
            or {"type": "object", "properties": {}}
        )
        formatted.append(
            {
                "type": "function",
                "function": {
                    "name": mcp_tool_name(server, str(name)),
                    "description": f"[{server}] {description}",
                    "parameters": schema if isinstance(schema, dict) else {"type": "object", "properties": {}},
                },
            }
        )
    return formatted


class McpRuntime:
    """
    Opens stdio MCP sessions for the servers an agent needs, for one agent turn.

    Usage:
        async with McpRuntime(["web_scraper"]) as runtime:
            tools = runtime.openai_tools()
            result = await runtime.call_tool("mcp__web_scraper__fetch_website_content", {...})
    """

    def __init__(self, required_servers: list[str] | None = None) -> None:
        self._required = list(required_servers or [])
        self._stack = AsyncExitStack()
        self._sessions: dict[str, Any] = {}
        self._openai_tools: list[dict[str, Any]] = []
        self._entered = False

    @property
    def openai_tools(self) -> list[dict[str, Any]]:
        return list(self._openai_tools)

    async def __aenter__(self) -> McpRuntime:
        await self._stack.__aenter__()
        self._entered = True
        servers = resolve_mcp_servers(self._required)
        if not servers:
            return self
        try:
            from mcp import ClientSession, StdioServerParameters
            from mcp.client.stdio import stdio_client
        except ImportError:
            log.warning("mcp.sdk_missing", hint="pip install 'mcp[cli]>=1.27,<2'")
            return self

        for server in servers:
            if server.transport != "stdio":
                log.warning("mcp.transport_unsupported", server=server.name, transport=server.transport)
                continue
            if not server.command:
                continue
            try:
                params = StdioServerParameters(
                    command=server.command,
                    args=server.args,
                    env={**os.environ},
                )
                read, write = await self._stack.enter_async_context(stdio_client(params))
                session = await self._stack.enter_async_context(ClientSession(read, write))
                await session.initialize()
                listed = await session.list_tools()
                self._sessions[server.name] = session
                # Also index by aliases for call routing
                for alias in server.aliases:
                    self._sessions[alias] = session
                self._openai_tools.extend(format_mcp_tools_for_llm(server.name, listed))
                log.info(
                    "mcp.connected",
                    server=server.name,
                    tools=len(getattr(listed, "tools", []) or []),
                )
            except Exception as e:
                log.warning("mcp.connect_failed", server=server.name, error=str(e))
        return self

    async def __aexit__(self, *exc: Any) -> None:
        if self._entered:
            await self._stack.__aexit__(*exc)
        self._sessions.clear()
        self._openai_tools = []
        self._entered = False

    def is_mcp_tool(self, name: str) -> bool:
        return parse_mcp_tool_name(name) is not None

    async def call_tool(self, namespaced_name: str, arguments: dict[str, Any]) -> str:
        parsed = parse_mcp_tool_name(namespaced_name)
        if not parsed:
            return f"Not an MCP tool: {namespaced_name}"
        server_key, tool_name = parsed
        session = self._sessions.get(server_key)
        if session is None:
            # try fuzzy match on session keys
            for key, sess in self._sessions.items():
                if key.replace("_", "") == server_key.replace("_", ""):
                    session = sess
                    break
        if session is None:
            return (
                f"No active MCP session for '{server_key}'. "
                "Ensure mcp_servers includes this capability and the server starts."
            )
        try:
            result = await session.call_tool(tool_name, arguments=arguments or {})
            # result.content is a list of content blocks
            parts: list[str] = []
            for block in getattr(result, "content", None) or []:
                text = getattr(block, "text", None)
                if text:
                    parts.append(str(text))
                elif isinstance(block, dict) and block.get("text"):
                    parts.append(str(block["text"]))
                else:
                    parts.append(str(block))
            return "\n".join(parts) if parts else str(result)
        except Exception as e:
            log.warning("mcp.call_failed", tool=namespaced_name, error=str(e))
            return f"MCP tool error ({namespaced_name}): {e}"


# Back-compat thin wrapper used by executor.mcp_call
class McpClient:
    def __init__(self) -> None:
        self._servers = load_mcp_servers()

    @property
    def configured(self) -> bool:
        return bool(self._servers)

    async def call_tool(self, server: str, tool_name: str, args: dict[str, Any]) -> str:
        async with McpRuntime([server]) as runtime:
            if not runtime.openai_tools:
                return (
                    f"Could not connect MCP server '{server}'. "
                    "Check MCP_SERVERS_JSON / built-in mcp_servers/scraper_server.py."
                )
            return await runtime.call_tool(mcp_tool_name(server, tool_name), args or {})
