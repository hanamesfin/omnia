"""
Workflow DAG — nodes with dependency edges for parallel / sequential scheduling.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class DAGNode:
    id: str
    role: str
    description: str
    model_id: str
    model_display_name: str
    task_profile: str
    depends_on: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class WorkflowDAG:
    workflow_id: str
    nodes: list[DAGNode] = field(default_factory=list)
    multi_agent: bool = False
    merge_strategy: str = "synthesize"
    user_prompt: str = ""
    domain: str = "general"

    def to_dict(self) -> dict[str, Any]:
        return {
            "workflow_id": self.workflow_id,
            "nodes": [n.to_dict() for n in self.nodes],
            "multi_agent": self.multi_agent,
            "merge_strategy": self.merge_strategy,
            "user_prompt": self.user_prompt,
            "domain": self.domain,
        }

    def node_map(self) -> dict[str, DAGNode]:
        return {n.id: n for n in self.nodes}

    def validate(self) -> None:
        ids = {n.id for n in self.nodes}
        for node in self.nodes:
            for dep in node.depends_on:
                if dep not in ids:
                    raise ValueError(f"Node {node.id} depends on missing {dep}")
        # Cycle detection via Kahn
        indeg = {n.id: 0 for n in self.nodes}
        edges: dict[str, list[str]] = {n.id: [] for n in self.nodes}
        for n in self.nodes:
            for d in n.depends_on:
                edges[d].append(n.id)
                indeg[n.id] += 1
        queue = [i for i, d in indeg.items() if d == 0]
        seen = 0
        while queue:
            cur = queue.pop()
            seen += 1
            for nxt in edges[cur]:
                indeg[nxt] -= 1
                if indeg[nxt] == 0:
                    queue.append(nxt)
        if seen != len(self.nodes):
            raise ValueError("Workflow DAG contains a cycle")

    def ready_nodes(self, completed: set[str], running: set[str], failed: set[str]) -> list[DAGNode]:
        blocked = failed  # fail-fast: dependents of failed nodes won't start
        ready: list[DAGNode] = []
        for node in self.nodes:
            if node.id in completed or node.id in running or node.id in blocked:
                continue
            if any(d in failed for d in node.depends_on):
                continue
            if all(d in completed for d in node.depends_on):
                ready.append(node)
        return ready
