"""
Multi-agent workflow planner — builds a DAG of subtasks with model assignments.

Independent branches run in parallel; dependent stages wait on upstream context.
"""
from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field
from typing import Any

from engines.model_selection.recommendation import RoutingRecommendation, recommend
from engines.model_selection.task_analyzer import TaskAnalysis, analyze_prompt
from engines.orchestration.dag import DAGNode, WorkflowDAG


SUBTASK_ROLE_MAP: dict[str, str] = {
    "research": "Research",
    "web_search": "Research",
    "data_analysis": "Data Analysis",
    "math": "Reasoning",
    "reasoning": "Reasoning",
    "coding": "Coding",
    "debugging": "Debugging",
    "frontend": "Frontend",
    "backend": "Backend",
    "full_stack": "Full Stack",
    "ui_design": "UI Design",
    "writing": "Writing",
    "marketing": "Copywriting",
    "vision": "Vision",
    "image_generation": "Image Generation",
    "presentation": "Presentation",
    "spreadsheet_analysis": "Spreadsheet",
    "pdf_analysis": "Document",
    "automation": "Automation",
    "architecture": "Architecture",
    "finance": "Finance Analysis",
}

# Soft dependency hints: later stages prefer waiting on earlier ones when both appear
STAGE_ORDER: dict[str, int] = {
    "research": 10,
    "web_search": 10,
    "vision": 10,
    "pdf_analysis": 10,
    "document_analysis": 10,
    "spreadsheet_analysis": 15,
    "data_analysis": 20,
    "finance": 20,
    "reasoning": 25,
    "architecture": 30,
    "ui_design": 35,
    "coding": 40,
    "debugging": 40,
    "frontend": 45,
    "backend": 45,
    "full_stack": 45,
    "automation": 50,
    "writing": 60,
    "marketing": 60,
    "presentation": 65,
    "image_generation": 70,
}


@dataclass
class WorkflowSubtask:
    """Back-compat flat subtask view (also used by UI)."""

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
class WorkflowPlan:
    multi_agent: bool = False
    subtasks: list[WorkflowSubtask] = field(default_factory=list)
    merge_strategy: str = "synthesize"
    dag: WorkflowDAG | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "multi_agent": self.multi_agent,
            "subtasks": [s.to_dict() for s in self.subtasks],
            "merge_strategy": self.merge_strategy,
            "dag": self.dag.to_dict() if self.dag else None,
        }

    def as_dag(self, *, user_prompt: str = "", domain: str = "general") -> WorkflowDAG:
        if self.dag:
            return self.dag
        nodes = [
            DAGNode(
                id=s.id,
                role=s.role,
                description=s.description,
                model_id=s.model_id,
                model_display_name=s.model_display_name,
                task_profile=s.task_profile,
                depends_on=list(s.depends_on),
            )
            for s in self.subtasks
        ]
        return WorkflowDAG(
            workflow_id=str(uuid.uuid4()),
            nodes=nodes,
            multi_agent=self.multi_agent,
            merge_strategy=self.merge_strategy,
            user_prompt=user_prompt,
            domain=domain,
        )


def _role_for_category(category: str) -> str:
    return SUBTASK_ROLE_MAP.get(category, category.replace("_", " ").title())


def _infer_dependencies(categories: list[str], node_ids: list[str]) -> list[list[str]]:
    """
    Build depends_on lists from stage order.
    Same-stage nodes run in parallel (no edge between them).
    Later stages depend on the latest prior stage's nodes.
    """
    stages = [STAGE_ORDER.get(c, 50) for c in categories]
    deps: list[list[str]] = [[] for _ in categories]
    for i, stage in enumerate(stages):
        priors = [
            (j, stages[j])
            for j in range(i)
            if stages[j] < stage
        ]
        if not priors:
            continue
        max_prior = max(s for _, s in priors)
        deps[i] = [node_ids[j] for j, s in priors if s == max_prior]
    return deps


def plan_workflow(
    prompt: str,
    analysis: TaskAnalysis,
    base_rec: RoutingRecommendation,
) -> WorkflowPlan:
    """
    Build a multi-agent DAG when the prompt contains multiple distinct tasks.
    """
    hints = analysis.subtask_hints or [prompt]
    categories = analysis.detected_categories or [analysis.primary_task]

    if not analysis.multi_task and len(hints) <= 1:
        return WorkflowPlan(multi_agent=False)

    n = min(6, max(len(hints), min(4, len(categories))))
    # Align hints/categories length
    while len(hints) < n:
        hints.append(prompt[:400])
    while len(categories) < n:
        categories.append(categories[-1] if categories else "general")
    hints = hints[:n]
    categories = categories[:n]

    node_ids = [f"subtask_{i + 1}" for i in range(n)]
    dep_lists = _infer_dependencies(categories, node_ids)

    subtasks: list[WorkflowSubtask] = []
    nodes: list[DAGNode] = []
    used_models: set[str] = set()

    for i, (hint, cat, nid, deps) in enumerate(zip(hints, categories, node_ids, dep_lists)):
        sub_analysis = analyze_prompt(hint, domain=cat)
        sub_rec = recommend(sub_analysis)
        model_id = sub_rec.recommended.name
        display = sub_rec.recommended.display_name
        if model_id in used_models:
            model_id = sub_rec.backup.name
            display = sub_rec.backup.display_name
        used_models.add(model_id)

        role = _role_for_category(cat)
        subtasks.append(
            WorkflowSubtask(
                id=nid,
                role=role,
                description=hint[:500],
                model_id=model_id,
                model_display_name=display,
                task_profile=sub_analysis.primary_task,
                depends_on=list(deps),
            )
        )
        nodes.append(
            DAGNode(
                id=nid,
                role=role,
                description=hint[:500],
                model_id=model_id,
                model_display_name=display,
                task_profile=sub_analysis.primary_task,
                depends_on=list(deps),
            )
        )

    if nodes:
        nodes[0].model_id = base_rec.recommended.name
        nodes[0].model_display_name = base_rec.recommended.display_name
        subtasks[0].model_id = base_rec.recommended.name
        subtasks[0].model_display_name = base_rec.recommended.display_name

    dag = WorkflowDAG(
        workflow_id=str(uuid.uuid4()),
        nodes=nodes,
        multi_agent=len(nodes) > 1,
        merge_strategy="synthesize",
        user_prompt=prompt,
        domain=analysis.primary_task,
    )

    return WorkflowPlan(
        multi_agent=len(nodes) > 1,
        subtasks=subtasks,
        merge_strategy="synthesize",
        dag=dag,
    )
