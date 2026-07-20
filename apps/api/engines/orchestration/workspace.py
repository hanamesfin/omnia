"""
Shared workspace — agents exchange context without raw provider coupling.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engines.orchestration.results import AgentResult


@dataclass
class SharedWorkspace:
    """
    Mutable shared state for one workflow run.
    Upstream agents write next_context; dependents read prior results.
    """

    workflow_id: str
    user_prompt: str = ""
    domain: str = "general"
    results: dict[str, AgentResult] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)
    artifacts: list[dict[str, Any]] = field(default_factory=list)
    meta: dict[str, Any] = field(default_factory=dict)

    def put_result(self, result: AgentResult) -> None:
        self.results[result.task_id] = result
        if result.artifacts:
            self.artifacts.extend(result.artifacts)
        if result.next_context:
            self.meta.setdefault("context", {}).update(result.next_context)

    def get_upstream_context(self, depends_on: list[str]) -> str:
        """Serialize completed upstream results for a dependent task's prompt."""
        parts: list[str] = []
        for task_id in depends_on:
            res = self.results.get(task_id)
            if not res or res.status != "completed":
                continue
            header = f"### {res.role or res.agent} ({res.model})"
            body = (res.result or "").strip()
            if body:
                parts.append(f"{header}\n{body[:6000]}")
            ctx = res.next_context
            if ctx:
                parts.append(f"Context keys: {', '.join(sorted(ctx.keys())[:12])}")
        return "\n\n".join(parts)

    def completed_results(self) -> list[AgentResult]:
        return [r for r in self.results.values() if r.status == "completed"]

    def to_dict(self) -> dict[str, Any]:
        return {
            "workflow_id": self.workflow_id,
            "user_prompt": self.user_prompt,
            "domain": self.domain,
            "results": {k: v.to_dict() for k, v in self.results.items()},
            "notes": list(self.notes),
            "artifacts": list(self.artifacts),
            "meta": dict(self.meta),
        }
