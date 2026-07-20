"""
Standardized agent result schema — every subtask emits the same shape.
Provider-agnostic so the synthesizer never needs per-model parsers.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal


AgentStatus = Literal["pending", "running", "completed", "failed", "retrying", "skipped"]


@dataclass
class AgentResult:
    task_id: str
    agent: str
    model: str
    status: AgentStatus = "pending"
    result: str = ""
    confidence: float = 0.0
    runtime_ms: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost: float = 0.0
    artifacts: list[dict[str, Any]] = field(default_factory=list)
    citations: list[str] = field(default_factory=list)
    next_context: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    role: str = ""
    task_profile: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> AgentResult:
        return cls(
            task_id=str(raw.get("task_id") or ""),
            agent=str(raw.get("agent") or ""),
            model=str(raw.get("model") or ""),
            status=raw.get("status") or "pending",  # type: ignore[arg-type]
            result=str(raw.get("result") or ""),
            confidence=float(raw.get("confidence") or 0),
            runtime_ms=int(raw.get("runtime_ms") or 0),
            input_tokens=int(raw.get("input_tokens") or 0),
            output_tokens=int(raw.get("output_tokens") or 0),
            estimated_cost=float(raw.get("estimated_cost") or 0),
            artifacts=list(raw.get("artifacts") or []),
            citations=list(raw.get("citations") or []),
            next_context=dict(raw.get("next_context") or {}),
            error=raw.get("error"),
            role=str(raw.get("role") or ""),
            task_profile=str(raw.get("task_profile") or ""),
        )
