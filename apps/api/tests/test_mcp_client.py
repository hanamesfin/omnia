"""MCP client: resolve servers, namespace tools, connect to built-in scraper."""
from __future__ import annotations

import asyncio

from engines.spec.requirements import AgentRequirements
from engines.tools.mcp_client import (
    McpRuntime,
    format_mcp_tools_for_llm,
    mcp_tool_name,
    parse_mcp_tool_name,
    resolve_mcp_servers,
)


def test_mcp_tool_name_roundtrip():
    name = mcp_tool_name("web_scraper", "fetch_website_content")
    assert name == "mcp__web_scraper__fetch_website_content"
    assert parse_mcp_tool_name(name) == ("web_scraper", "fetch_website_content")


def test_resolve_web_scraper():
    matched = resolve_mcp_servers(["web_scraper"])
    assert len(matched) == 1
    assert matched[0].name == "web_scraper"


def test_resolve_none_empty():
    assert resolve_mcp_servers(["none"]) == []
    assert resolve_mcp_servers([]) == []


def test_agent_requirements_mcp_field():
    req = AgentRequirements.model_validate(
        {
            "purpose": "Scrape competitors",
            "target_user": "PM",
            "experience": "form",
            "mcp_servers": ["web_scraper", "none", "Web-Scraper"],
        }
    )
    assert req.mcp_servers == ["web_scraper"]


def test_format_mcp_tools_for_llm():
    class FakeTool:
        name = "fetch_website_content"
        description = "Fetch a page"
        inputSchema = {
            "type": "object",
            "properties": {"url": {"type": "string"}},
            "required": ["url"],
        }

    class FakeListed:
        tools = [FakeTool()]

    formatted = format_mcp_tools_for_llm("web_scraper", FakeListed())
    assert len(formatted) == 1
    assert formatted[0]["function"]["name"] == "mcp__web_scraper__fetch_website_content"


def test_mcp_runtime_lists_scraper_tools():
    async def _run() -> list[str]:
        async with McpRuntime(["web_scraper"]) as runtime:
            return [
                (t.get("function") or {}).get("name") or ""
                for t in runtime.openai_tools
            ]

    names = asyncio.run(_run())
    # Skip soft if SDK missing in CI without install
    try:
        import mcp  # noqa: F401
    except ImportError:
        return
    assert any("fetch_website_content" in n for n in names)
    assert any(n.startswith("mcp__web_scraper__") for n in names)
