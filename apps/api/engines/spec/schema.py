"""
§3.1 Agent Spec Schema — the contract every other layer reads and writes.
Engineering Spec Draft v0.1
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

Domain = Literal[
    "education", "productivity", "finance", "health", "creative", "dev-tools", "other"
]
Tone = Literal["professional", "casual", "friendly", "formal"]
# Output formats are intentionally open: generated products may return text,
# images, files, tables, audio, structured data, or future/custom modalities.
OutputFormat = str
Status = Literal["draft", "testing", "published", "deprecated"]
PermissionTier = Literal["read_only", "side_effecting", "destructive"]

REQUIRED_SLOTS = (
    "purpose",
    "target_user",
    "domain",
    "tone",
    "capabilities",
    "constraints",
    "escalation",
    "output_format",
)
OPTIONAL_SLOTS = ("tools", "knowledge_sources")
ALL_SLOTS = REQUIRED_SLOTS + OPTIONAL_SLOTS

DOMAIN_SET = {
    "education",
    "productivity",
    "finance",
    "health",
    "creative",
    "dev-tools",
    "other",
}
TONE_SET = {"professional", "casual", "friendly", "formal"}
OUTPUT_SET = {"chat", "structured", "voice"}

# Map legacy interview domains → Spec §3.1 enum
LEGACY_DOMAIN_MAP = {
    "coding": "dev-tools",
    "research": "education",
    "content": "creative",
    "customer_support": "productivity",
    "data_analysis": "productivity",
    "general": "other",
    "other": "other",
}


@dataclass
class ToolAttachment:
    tool_id: str
    permission_tier: PermissionTier = "read_only"

    def to_dict(self) -> dict[str, str]:
        return {"tool_id": self.tool_id, "permission_tier": self.permission_tier}


@dataclass
class SpecScores:
    coverage: float = 0.0
    safety: float = 0.0
    clarity: float = 0.0
    test_pass_rate: float = 0.0
    aqs: float = 0.0

    def to_dict(self) -> dict[str, float]:
        return asdict(self)


@dataclass
class AgentSpecV1:
    """Canonical Agent Spec (§3.1)."""

    agent_id: str
    version: int = 1
    status: Status = "draft"
    purpose: str = ""
    target_user: str = ""
    domain: str = "other"
    tone: str = "friendly"
    capabilities: list[str] = field(default_factory=list)
    constraints: list[str] = field(default_factory=list)
    escalation: str = ""
    output_format: str = "chat"
    tools: list[ToolAttachment] = field(default_factory=list)
    knowledge_sources: list[str] = field(default_factory=list)
    scores: SpecScores = field(default_factory=SpecScores)
    created_by: str = ""
    updated_at: str = ""
    flags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "version": self.version,
            "status": self.status,
            "purpose": self.purpose,
            "target_user": self.target_user,
            "domain": self.domain if self.domain in DOMAIN_SET else "other",
            "tone": self.tone if self.tone in TONE_SET else "friendly",
            "capabilities": list(self.capabilities),
            "constraints": list(self.constraints),
            "escalation": self.escalation,
            "output_format": str(self.output_format or "text"),
            "tools": [t.to_dict() if isinstance(t, ToolAttachment) else t for t in self.tools],
            "knowledge_sources": list(self.knowledge_sources),
            "scores": self.scores.to_dict() if isinstance(self.scores, SpecScores) else self.scores,
            "created_by": self.created_by,
            "updated_at": self.updated_at,
            "flags": list(self.flags),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AgentSpecV1":
        tools_raw = data.get("tools") or []
        tools: list[ToolAttachment] = []
        for t in tools_raw:
            if isinstance(t, ToolAttachment):
                tools.append(t)
            elif isinstance(t, dict):
                tools.append(
                    ToolAttachment(
                        tool_id=str(t.get("tool_id") or t.get("id") or ""),
                        permission_tier=t.get("permission_tier") or "read_only",  # type: ignore[arg-type]
                    )
                )
            elif isinstance(t, str):
                tools.append(ToolAttachment(tool_id=t, permission_tier="read_only"))
        scores_raw = data.get("scores") or {}
        scores = SpecScores(
            coverage=float(scores_raw.get("coverage") or 0.0),
            safety=float(scores_raw.get("safety") or 0.0),
            clarity=float(scores_raw.get("clarity") or 0.0),
            test_pass_rate=float(scores_raw.get("test_pass_rate") or 0.0),
            aqs=float(scores_raw.get("aqs") or 0.0),
        )
        return cls(
            agent_id=str(data.get("agent_id") or ""),
            version=int(data.get("version") or 1),
            status=data.get("status") or "draft",  # type: ignore[arg-type]
            purpose=str(data.get("purpose") or ""),
            target_user=str(data.get("target_user") or ""),
            domain=str(data.get("domain") or "other"),
            tone=str(data.get("tone") or "friendly"),
            capabilities=list(data.get("capabilities") or []),
            constraints=list(data.get("constraints") or []),
            escalation=str(data.get("escalation") or ""),
            output_format=str(data.get("output_format") or "chat"),
            tools=tools,
            knowledge_sources=list(data.get("knowledge_sources") or []),
            scores=scores,
            created_by=str(data.get("created_by") or ""),
            updated_at=str(data.get("updated_at") or ""),
            flags=list(data.get("flags") or []),
        )


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_domain(raw: str) -> str:
    key = (raw or "").strip().lower().replace(" ", "_").replace("-", "_")
    if key in DOMAIN_SET:
        return key
    if key.replace("_", "-") in DOMAIN_SET:
        return key.replace("_", "-")
    # fuzzy
    for legacy, mapped in LEGACY_DOMAIN_MAP.items():
        if legacy in key or key in legacy:
            return mapped
    if "code" in key or "dev" in key:
        return "dev-tools"
    if "financ" in key or "budget" in key or "money" in key:
        return "finance"
    if "health" in key or "medical" in key:
        return "health"
    if "educat" in key or "teach" in key or "research" in key:
        return "education"
    if "creat" in key or "content" in key or "write" in key:
        return "creative"
    if "product" in key or "support" in key or "data" in key:
        return "productivity"
    return "other"


def normalize_tone(raw: str) -> str:
    t = (raw or "").lower()
    if "formal" in t:
        return "formal"
    if "professional" in t or "pro" in t:
        return "professional"
    if "casual" in t:
        return "casual"
    if "friendly" in t or "chatgpt" in t:
        return "friendly"
    return "friendly"


def bridge_from_interview(
    *,
    agent_id: str,
    created_by: str,
    answers: dict[str, Any],
    profile_goal: str = "",
    profile_domain: str = "",
    composer_tools: list[str] | None = None,
    composer_tone: str = "",
    capability_list: list[str] | None = None,
) -> AgentSpecV1:
    """
    Bridge legacy FSM answers → Spec §3.1 so existing Create flow fills the contract.
    """
    purpose = (
        str(answers.get("goal_detail") or profile_goal or answers.get("purpose") or "").strip()
    )
    domain_raw = str(answers.get("domain_raw") or profile_domain or "other")
    tone_raw = str(answers.get("tone_raw") or composer_tone or "friendly")
    constraints_raw = str(answers.get("constraints_raw") or "Skip")
    constraints: list[str] = []
    if constraints_raw and constraints_raw.lower() != "skip":
        constraints = [c.strip() for c in constraints_raw.split(";") if c.strip()]
        if len(constraints) == 1 and "," in constraints[0] and len(constraints[0]) > 80:
            constraints = [constraints_raw.strip()]
        if not constraints:
            constraints = [constraints_raw.strip()]
    # Inspiration ≠ clone — fold originality rules into the Spec contract
    product = str(answers.get("inspiration_product") or "").strip()
    if product:
        aspects = str(answers.get("inspiration_aspects") or "user priorities").strip()
        improve = str(answers.get("improve_focus") or "").strip()
        constraints = [
            *constraints,
            f"Do not claim to be {product} or recreate its proprietary prompt/branding.",
            f"Pursue similar goals as an original OMNIA agent (inspired by: {aspects}).",
        ]
        if improve:
            constraints.append(f"Improvement focus: {improve}.")
        purpose_suffix = f" Inspired by {product}'s strengths ({aspects}), not a clone."
        if purpose and purpose_suffix.strip() not in purpose:
            purpose = (purpose + purpose_suffix).strip()

    kind = str(answers.get("kind_raw") or "")
    requirements = answers.get("requirements") or {}
    requirement_output = requirements.get("output") if isinstance(requirements, dict) else {}
    output_format = (
        str(requirement_output.get("type") or "").strip()
        if isinstance(requirement_output, dict)
        else ""
    )
    if not output_format:
        output_format = "chat"
        if "structured" in kind.lower() or "transform" in kind.lower():
            output_format = "structured"

    caps = list(capability_list or [])
    if not caps and purpose:
        caps = [purpose[:120]]

    tools = [
        ToolAttachment(tool_id=t, permission_tier="read_only")
        for t in (composer_tools or [])
        if t
    ]

    knowledge = []
    if answers.get("context_file_names"):
        knowledge = [n.strip() for n in str(answers["context_file_names"]).split(",") if n.strip()]

    target = str(answers.get("target_user") or "end user requesting help in this domain")
    escalation = str(
        answers.get("escalation")
        or "If the request is out of scope, unsafe, or cannot be fulfilled without guessing critical facts, "
        "respond with \"I can't help with that\" and briefly say what would be needed instead."
    )

    return AgentSpecV1(
        agent_id=agent_id,
        version=1,
        status="draft",
        purpose=purpose or "Assist the user with their stated goal.",
        target_user=target,
        domain=normalize_domain(domain_raw),
        tone=normalize_tone(tone_raw),
        capabilities=caps,
        constraints=constraints
        or ["Stay honest — never invent facts as if verified."],
        escalation=escalation,
        output_format=output_format,
        tools=tools,
        knowledge_sources=knowledge,
        created_by=created_by,
        updated_at=now_iso(),
    )
