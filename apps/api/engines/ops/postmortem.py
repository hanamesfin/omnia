"""
Guided failure post-mortem — map runtime errors to architecture layers + fixes.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Literal

Layer = Literal["brain", "prompt", "knowledge", "memory", "tools", "plans", "eval", "network", "unknown"]


@dataclass
class PostMortem:
    layer: Layer
    title: str
    diagnosis: str
    suggested_fix: str
    raw: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


_RULES: list[tuple[tuple[str, ...], Layer, str, str, str]] = [
    (
        ("knowledge", "no matching", "rag", "document not", "knowledge_search"),
        "knowledge",
        "Knowledge gap",
        "The agent couldn't ground the answer in uploaded documents.",
        "Upload or re-index knowledge files, then retry with a more specific query.",
    ),
    (
        ("timeout", "timed out", "deadline"),
        "tools",
        "Tool timeout",
        "A tool call took too long and was cut off.",
        "Retry the action, reduce tool payload size, or remove flaky tools.",
    ),
    (
        ("rate limit", "429", "quota", "insufficient"),
        "brain",
        "Model quota / rate limit",
        "The orchestration layer hit provider rate limits.",
        "Wait briefly or switch preferred model in Personalize.",
    ),
    (
        ("not permitted", "permission", "forbidden tool"),
        "tools",
        "Tool permission blocked",
        "The agent tried a tool outside its allow-list.",
        "Add the tool in Update, or ask the agent to answer without that tool.",
    ),
    (
        ("step budget", "max steps", "loop", "budget exceeded"),
        "plans",
        "Plan dead-end / loop",
        "The agent exhausted its orchestration step budget without finishing.",
        "Narrow the request, or review tools that keep re-calling themselves.",
    ),
    (
        ("schema", "json", "parse", "invalid agent"),
        "prompt",
        "Output / schema failure",
        "The model returned something the product schema couldn't accept.",
        "Clarify the expected output format in Personalize instructions.",
    ),
    (
        ("memory", "context window", "too long"),
        "memory",
        "Memory / context overflow",
        "Conversation or memory context exceeded what the model can hold.",
        "Start a new chat thread or shorten custom instructions.",
    ),
    (
        ("network", "connection", "unreachable", "dns"),
        "network",
        "Network failure",
        "An upstream service was unreachable.",
        "Check connectivity and try again — this usually isn't an agent config bug.",
    ),
]


def diagnose_failure(error: str, *, events: list[dict[str, Any]] | None = None) -> PostMortem:
    text = (error or "").lower()
    blob = text
    for ev in events or []:
        blob += " " + str(ev.get("type") or "") + " " + str(ev.get("content") or "").lower()

    for needles, layer, title, diagnosis, fix in _RULES:
        if any(n in blob for n in needles):
            return PostMortem(
                layer=layer,
                title=title,
                diagnosis=diagnosis,
                suggested_fix=fix,
                raw=error or "",
            )

    return PostMortem(
        layer="unknown",
        title="Unhandled failure",
        diagnosis="The error didn't match a known layer pattern.",
        suggested_fix="Open the orchestration trace, then re-run with a simpler prompt.",
        raw=error or "",
    )
