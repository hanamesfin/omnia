"""
Agent DNA — deterministic fingerprint of config for similarity + remix lineage.
No ML training: hash + token Jaccard over specialization / layers / tools.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import asdict, dataclass, field
from typing import Any


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", (text or "").lower()) if len(t) > 2}


@dataclass
class AgentDNA:
    fingerprint: str
    specialization: str
    domain: str
    kind: str
    create_tier: str
    tools: list[str] = field(default_factory=list)
    layers: list[str] = field(default_factory=list)
    parent_agent_id: str | None = None
    root_agent_id: str | None = None
    remix_depth: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def compute_dna(
    *,
    specialization: str = "",
    domain: str = "",
    kind: str = "",
    create_tier: str = "normal",
    tools: list[str] | None = None,
    layers: list[str] | None = None,
    parent_agent_id: str | None = None,
    root_agent_id: str | None = None,
    remix_depth: int = 0,
) -> AgentDNA:
    tools = sorted({str(t).strip() for t in (tools or []) if str(t).strip()})
    layers = sorted({str(l).strip() for l in (layers or []) if str(l).strip()})
    if not layers:
        layers = ["brain", "prompt"]
        if create_tier == "enterprise":
            layers.extend(["knowledge", "memory", "tools", "plans", "eval"])
        elif tools:
            layers.append("tools")
    material = "|".join(
        [
            specialization.strip().lower(),
            domain.strip().lower(),
            kind.strip().lower(),
            create_tier.strip().lower(),
            ",".join(tools),
            ",".join(layers),
        ]
    )
    fingerprint = hashlib.sha256(material.encode("utf-8")).hexdigest()[:24]
    return AgentDNA(
        fingerprint=fingerprint,
        specialization=specialization.strip(),
        domain=domain.strip() or "general",
        kind=kind.strip() or "chat",
        create_tier=create_tier.strip() or "normal",
        tools=tools,
        layers=layers,
        parent_agent_id=parent_agent_id,
        root_agent_id=root_agent_id or parent_agent_id,
        remix_depth=remix_depth,
    )


def dna_from_agent(agent: dict[str, Any]) -> AgentDNA:
    existing = agent.get("dna")
    if isinstance(existing, dict) and existing.get("fingerprint"):
        return AgentDNA(
            fingerprint=str(existing["fingerprint"]),
            specialization=str(existing.get("specialization") or agent.get("specialty") or ""),
            domain=str(existing.get("domain") or agent.get("domain") or "general"),
            kind=str(existing.get("kind") or agent.get("kind") or "chat"),
            create_tier=str(existing.get("create_tier") or agent.get("create_tier") or "normal"),
            tools=list(existing.get("tools") or agent.get("tools") or []),
            layers=list(existing.get("layers") or []),
            parent_agent_id=existing.get("parent_agent_id") or agent.get("parent_agent_id"),
            root_agent_id=existing.get("root_agent_id") or agent.get("root_agent_id"),
            remix_depth=int(existing.get("remix_depth") or agent.get("remix_depth") or 0),
        )
    return compute_dna(
        specialization=str(agent.get("specialty") or ""),
        domain=str(agent.get("domain") or ""),
        kind=str(agent.get("kind") or ""),
        create_tier=str(agent.get("create_tier") or "normal"),
        tools=list(agent.get("tools") or []),
        parent_agent_id=agent.get("parent_agent_id"),
        root_agent_id=agent.get("root_agent_id"),
        remix_depth=int(agent.get("remix_depth") or 0),
    )


def similarity(a: AgentDNA, b: AgentDNA) -> float:
    """0–1 genetic similarity (Jaccard on tokens + tool/layer overlap)."""
    if a.fingerprint == b.fingerprint:
        return 1.0
    ta = _tokens(f"{a.specialization} {a.domain} {a.kind}")
    tb = _tokens(f"{b.specialization} {b.domain} {b.kind}")
    text_sim = (len(ta & tb) / len(ta | tb)) if (ta or tb) else 0.0
    sa, sb = set(a.tools), set(b.tools)
    tool_sim = (len(sa & sb) / len(sa | sb)) if (sa or sb) else 0.0
    la, lb = set(a.layers), set(b.layers)
    layer_sim = (len(la & lb) / len(la | lb)) if (la or lb) else 0.0
    tier_bonus = 0.05 if a.create_tier == b.create_tier else 0.0
    score = 0.45 * text_sim + 0.35 * tool_sim + 0.15 * layer_sim + tier_bonus
    return round(min(1.0, score), 4)


def find_similar(
    target: AgentDNA,
    catalog: list[tuple[str, AgentDNA]],
    *,
    top_k: int = 5,
    min_score: float = 0.15,
) -> list[dict[str, Any]]:
    ranked: list[dict[str, Any]] = []
    for agent_id, dna in catalog:
        if dna.fingerprint == target.fingerprint:
            continue
        score = similarity(target, dna)
        if score >= min_score:
            ranked.append(
                {
                    "agent_id": agent_id,
                    "score": score,
                    "fingerprint": dna.fingerprint,
                    "domain": dna.domain,
                    "kind": dna.kind,
                }
            )
    ranked.sort(key=lambda r: r["score"], reverse=True)
    return ranked[:top_k]


def lineage_chain(
    agent_id: str,
    agents: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Walk parent pointers root → … → this agent."""
    chain: list[dict[str, Any]] = []
    seen: set[str] = set()
    cur: str | None = agent_id
    while cur and cur not in seen:
        seen.add(cur)
        agent = agents.get(cur)
        if not agent:
            break
        dna = dna_from_agent(agent)
        chain.append(
            {
                "agent_id": cur,
                "name": agent.get("name"),
                "developer": agent.get("developer"),
                "fingerprint": dna.fingerprint,
                "remix_depth": dna.remix_depth,
                "parent_agent_id": dna.parent_agent_id,
            }
        )
        cur = dna.parent_agent_id
    chain.reverse()
    return chain
