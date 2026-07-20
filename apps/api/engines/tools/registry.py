"""
§3.3 Tool Selector — curated registry + permission tiers.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from engines.spec.schema import AgentSpecV1, ToolAttachment

PermissionTier = Literal["read_only", "side_effecting", "destructive"]

RISK_WEIGHT = {"read_only": 0.0, "side_effecting": 0.35, "destructive": 0.8}


@dataclass(frozen=True)
class ToolDef:
    tool_id: str
    tags: tuple[str, ...]
    permission_tier: PermissionTier
    description: str


TOOL_REGISTRY: list[ToolDef] = [
    ToolDef("web_search", ("research", "education", "general"), "read_only", "Search the web"),
    ToolDef("web_fetch", ("research", "education", "general"), "read_only", "Fetch URL content"),
    ToolDef("file_parse", ("dev-tools", "productivity", "knowledge"), "read_only", "Parse uploaded files"),
    ToolDef("code_execute", ("dev-tools", "data", "coding"), "side_effecting", "Run Python in sandbox"),
    ToolDef("http_request", ("productivity", "automation", "general"), "side_effecting", "Call HTTP APIs"),
    ToolDef("browser_automation", ("research", "automation", "general"), "side_effecting", "Headless browser"),
    ToolDef("memory_search", ("knowledge", "productivity", "general"), "read_only", "RAG memory search"),
    ToolDef("knowledge_search", ("knowledge", "productivity", "general"), "read_only", "Search uploaded knowledge documents"),
    ToolDef("translate", ("productivity", "support", "general", "education"), "read_only", "Google Translate"),
    ToolDef("mcp_call", ("productivity", "automation", "general"), "side_effecting", "MCP enterprise tools"),
    ToolDef("price_lookup", ("finance", "shopping", "productivity"), "read_only", "Lookup prices"),
    ToolDef("search", ("research", "education", "general"), "read_only", "Web/search style lookup"),
    ToolDef("calendar_view", ("productivity", "schedule"), "read_only", "Read calendar"),
    ToolDef("file_read", ("dev-tools", "productivity", "knowledge"), "read_only", "Read attached files"),
    ToolDef("send_message", ("productivity", "support"), "side_effecting", "Send a message"),
    ToolDef("send_email", ("productivity", "support", "email"), "destructive", "Send a confirmed email with Resend"),
    ToolDef("cursor_agent", ("coding", "dev-tools", "productivity"), "side_effecting", "Delegate coding tasks to Cursor AI"),
    ToolDef("create_event", ("productivity", "schedule"), "side_effecting", "Create calendar event"),
    ToolDef("charge_card", ("finance",), "destructive", "Charge a payment method"),
    ToolDef("delete_data", ("data", "admin"), "destructive", "Delete stored data"),
]


def get_tool(tool_id: str) -> ToolDef | None:
    for t in TOOL_REGISTRY:
        if t.tool_id == tool_id:
            return t
    return None


def tag_overlap(tool: ToolDef, capability_tags: set[str]) -> float:
    if not tool.tags:
        return 0.0
    return len(set(tool.tags) & capability_tags) / len(set(tool.tags))


def score_tool(tool: ToolDef, capability_tags: set[str]) -> float:
    return tag_overlap(tool, capability_tags) - RISK_WEIGHT[tool.permission_tier]


def select_tool_candidates(spec: AgentSpecV1, top_k: int = 5) -> list[ToolDef]:
    """
    candidates = registry.filter(tag intersects capability_tags)
    present top 5 — creator confirms attachment explicitly (call site).
    """
    tags: set[str] = {spec.domain, "general"}
    blob = " ".join(spec.capabilities + [spec.purpose]).lower()
    for token in ("finance", "budget", "price", "code", "calendar", "schedule", "email", "message", "data"):
        if token in blob:
            tags.add(token if token != "budget" else "finance")
            if token == "code":
                tags.add("dev-tools")
            if token in ("email", "message"):
                tags.add("productivity")

    scored: list[tuple[float, ToolDef]] = []
    for tool in TOOL_REGISTRY:
        if set(tool.tags) & tags or "general" in tool.tags:
            scored.append((score_tool(tool, tags), tool))
    scored.sort(key=lambda x: x[0], reverse=True)
    # Never auto-attach above read_only in suggestions ranking preference
    return [t for _, t in scored[:top_k]]


def permitted(spec: AgentSpecV1, tool_id: str) -> bool:
    allowed = {t.tool_id for t in spec.tools}
    return tool_id in allowed


def attach_read_only_suggestions(spec: AgentSpecV1) -> AgentSpecV1:
    """Auto-attach top read_only candidates; leave higher tiers for creator confirm."""
    existing = {t.tool_id for t in spec.tools}
    for tool in select_tool_candidates(spec):
        if tool.permission_tier != "read_only":
            continue
        if tool.tool_id in existing:
            continue
        spec.tools.append(ToolAttachment(tool_id=tool.tool_id, permission_tier="read_only"))
        existing.add(tool.tool_id)
        if len(spec.tools) >= 3:
            break
    return spec
