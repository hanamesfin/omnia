"""Tests for runtime tool registry and executor."""
from __future__ import annotations

import asyncio

from engines.tools.runtime_registry import normalize_tool_id, tools_for_agent
from engines.tools.executor import ToolContext, execute_tool


def test_normalize_aliases():
    assert normalize_tool_id("search") == "web_search"
    assert normalize_tool_id("code_execution") == "code_execute"
    assert normalize_tool_id("file_read") == "file_parse"
    assert normalize_tool_id("browser") == "browser_automation"
    assert normalize_tool_id("mcp_email_client") == "mcp_call"


def test_tools_for_agent_dedupes():
    attached = ["web_search", "search", "http_request", "browser_automation"]
    ids = [t.tool_id for t in tools_for_agent(attached)]
    assert ids == ["web_search", "http_request", "browser_automation"]


def test_file_parse_latest():
    ctx = ToolContext(
        user_id="u1",
        uploads={
            "att1": {
                "id": "att1",
                "owner_id": "u1",
                "filename": "note.txt",
                "media": "text",
                "raw": b"hello resume",
            }
        },
        attachment_ids=["att1"],
    )
    out = asyncio.run(execute_tool("file_parse", {"attachment_id": "latest"}, ctx=ctx))
    assert "hello resume" in out


def test_web_search_unconfigured():
    out = asyncio.run(execute_tool("web_search", {"query": "test"}, ctx=ToolContext("u", {})))
    assert "not configured" in out.lower() or "BRAVE" in out or "Tavily" in out
