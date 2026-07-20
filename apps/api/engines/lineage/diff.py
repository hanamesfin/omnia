"""
Semantic diff across agent layers — what changed between two snapshots.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

LayerName = Literal[
    "brain",
    "prompt",
    "knowledge",
    "memory",
    "tools",
    "plans",
    "eval",
    "identity",
    "tier",
]


@dataclass
class LayerChange:
    layer: LayerName
    change: Literal["added", "removed", "modified", "unchanged"]
    before: Any = None
    after: Any = None
    summary: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class SemanticDiff:
    changes: list[LayerChange] = field(default_factory=list)
    significant: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "changes": [c.to_dict() for c in self.changes],
            "significant": self.significant,
            "summary": [c.summary for c in self.changes if c.change != "unchanged"],
        }


def _norm_tools(raw: Any) -> list[str]:
    out: list[str] = []
    for t in raw or []:
        if isinstance(t, dict):
            out.append(str(t.get("tool_id") or t.get("id") or ""))
        else:
            out.append(str(t))
    return sorted({x for x in out if x})


def snapshot_from_agent(agent: dict[str, Any]) -> dict[str, Any]:
    eng = agent.get("engineering_spec") or {}
    scores = eng.get("scores") or agent.get("aqs") or {}
    return {
        "name": agent.get("name"),
        "specialty": agent.get("specialty"),
        "domain": agent.get("domain"),
        "kind": agent.get("kind"),
        "create_tier": agent.get("create_tier") or "normal",
        "model_id": agent.get("model_id"),
        "prompt_text": (agent.get("prompt_text") or "")[:500],
        "tools": _norm_tools(agent.get("tools") or eng.get("tools")),
        "knowledge_sources": list(eng.get("knowledge_sources") or []),
        "memory": (agent.get("spec") or {}).get("memory_strategy") or eng.get("memory") or "session",
        "aqs": scores.get("aqs") if isinstance(scores, dict) else None,
        "test_pass_rate": scores.get("test_pass_rate") if isinstance(scores, dict) else None,
        "capabilities": list(agent.get("capabilities") or eng.get("capabilities") or []),
    }


def diff_snapshots(before: dict[str, Any], after: dict[str, Any]) -> SemanticDiff:
    changes: list[LayerChange] = []

    def add(layer: LayerName, key: str, label: str) -> None:
        b, a = before.get(key), after.get(key)
        if b == a:
            changes.append(LayerChange(layer=layer, change="unchanged", before=b, after=a))
            return
        if b in (None, "", [], {}) and a not in (None, "", [], {}):
            changes.append(
                LayerChange(layer=layer, change="added", before=b, after=a, summary=f"{label} added")
            )
        elif a in (None, "", [], {}) and b not in (None, "", [], {}):
            changes.append(
                LayerChange(layer=layer, change="removed", before=b, after=a, summary=f"{label} removed")
            )
        else:
            changes.append(
                LayerChange(
                    layer=layer,
                    change="modified",
                    before=b,
                    after=a,
                    summary=f"{label} changed",
                )
            )

    add("identity", "name", "Name")
    add("identity", "specialty", "Specialization")
    add("identity", "domain", "Domain")
    add("identity", "kind", "Kind")
    add("tier", "create_tier", "Create tier")
    add("brain", "model_id", "Model")
    add("prompt", "prompt_text", "System prompt")
    add("knowledge", "knowledge_sources", "Knowledge sources")
    add("memory", "memory", "Memory strategy")
    add("tools", "tools", "Tools")
    add("eval", "aqs", "AQS")
    add("eval", "test_pass_rate", "Synthetic pass rate")
    add("plans", "capabilities", "Capabilities")

    # Tool set detail
    bt, at = set(before.get("tools") or []), set(after.get("tools") or [])
    if bt != at:
        added, removed = sorted(at - bt), sorted(bt - at)
        if added:
            changes.append(
                LayerChange(
                    layer="tools",
                    change="added",
                    before=None,
                    after=added,
                    summary=f"Tools added: {', '.join(added)}",
                )
            )
        if removed:
            changes.append(
                LayerChange(
                    layer="tools",
                    change="removed",
                    before=removed,
                    after=None,
                    summary=f"Tools removed: {', '.join(removed)}",
                )
            )

    significant = any(c.change != "unchanged" for c in changes)
    # Deduplicate pure unchanged noise for response brevity
    meaningful = [c for c in changes if c.change != "unchanged"]
    return SemanticDiff(changes=meaningful if meaningful else changes[:1], significant=significant)
