"""Normalize free-text / chip answers into agent product kinds."""
from __future__ import annotations

AGENT_KINDS = ("chat", "tool", "transformer", "analyzer", "automation")

KIND_LABELS = {
    "chat": "Chat companion",
    "tool": "One-shot tool",
    "transformer": "Transformer",
    "analyzer": "Analyzer",
    "automation": "Automation",
}


def parse_agent_kind(raw: str | None) -> str:
    t = (raw or "").lower()
    if any(k in t for k in ("transform", "rewrite", "draft", "convert")):
        return "transformer"
    if any(k in t for k in ("analy", "insight", "distill", "summar", "paper", "csv")):
        return "analyzer"
    if any(k in t for k in ("automat", "workflow", "background", "batch", "schedule")):
        return "automation"
    if any(k in t for k in ("frontier", "chatgpt", "omni", "files + tools", "files+tools")):
        return "chat"
    if any(k in t for k in ("tool", "one-shot", "one shot", "triage", "review", "paste")):
        return "tool"
    if any(k in t for k in ("chat", "companion", "conversation", "support", "talk")):
        return "chat"
    if t.strip() in AGENT_KINDS:
        return t.strip()
    return "tool"
