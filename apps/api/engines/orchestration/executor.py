"""
DAG Workflow Executor — schedules independent nodes in parallel, respects dependencies.
Emits events on the Execution Event Bus; writes normalized AgentResults into SharedWorkspace.
"""
from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

import structlog

from engines.orchestration.dag import DAGNode, WorkflowDAG
from engines.orchestration.events import ExecutionEvent, ExecutionEventBus
from engines.orchestration.results import AgentResult
from engines.orchestration.synthesizer import synthesize_results
from engines.orchestration.workspace import SharedWorkspace
from engines.model_selection.registry import MODEL_BY_NAME

log = structlog.get_logger()

CompleteFn = Callable[..., Awaitable[tuple[str, str]]]


TASK_SYSTEM = """\
You are a specialist agent in a multi-agent Omnia workflow.
Complete ONLY your assigned subtask. Be concrete and actionable.
Do not claim to have done work outside your role.
If upstream context is provided, build on it — do not ignore it.
"""


@dataclass
class ExecutionReport:
    workflow_id: str
    final_text: str
    model_used: str
    workspace: SharedWorkspace
    events: list[dict[str, Any]] = field(default_factory=list)
    synthesis: AgentResult | None = None
    success: bool = True

    def to_dict(self) -> dict[str, Any]:
        return {
            "workflow_id": self.workflow_id,
            "final_text": self.final_text,
            "model_used": self.model_used,
            "success": self.success,
            "workspace": self.workspace.to_dict(),
            "events": self.events,
            "synthesis": self.synthesis.to_dict() if self.synthesis else None,
            "results": [r.to_dict() for r in self.workspace.results.values()],
        }


def _estimate_cost(model_id: str, in_tok: int, out_tok: int) -> float:
    row = MODEL_BY_NAME.get(model_id) or {}
    rate = float(row.get("cost_per_1k") or 0)
    return round(((in_tok + out_tok) / 1000.0) * rate, 6)


async def _run_node(
    node: DAGNode,
    *,
    workspace: SharedWorkspace,
    bus: ExecutionEventBus,
    complete_fn: CompleteFn,
    max_tokens: int = 1600,
) -> AgentResult:
    await bus.emit(
        ExecutionEvent(
            type="task.started",
            workflow_id=workspace.workflow_id,
            task_id=node.id,
            payload={
                "role": node.role,
                "model": node.model_id,
                "model_display_name": node.model_display_name,
                "description": node.description[:300],
            },
        )
    )

    upstream = workspace.get_upstream_context(node.depends_on)
    user = (
        f"User goal: {workspace.user_prompt}\n\n"
        f"Your role: {node.role}\n"
        f"Your subtask: {node.description}\n"
    )
    if upstream:
        user += f"\n—— Upstream agent outputs ——\n{upstream}\n"

    started = time.perf_counter()
    try:
        text, used = await complete_fn(
            system=TASK_SYSTEM + f"\nRole: {node.role}. Profile: {node.task_profile}.",
            user=user,
            preferred_model=node.model_id,
            max_tokens=max_tokens,
        )
        runtime_ms = int((time.perf_counter() - started) * 1000)
        in_tok = max(1, len(user.split()))
        out_tok = max(1, len(text.split()))
        result = AgentResult(
            task_id=node.id,
            agent=node.role,
            model=used,
            status="completed",
            result=text.strip(),
            confidence=0.82,
            runtime_ms=runtime_ms,
            input_tokens=in_tok,
            output_tokens=out_tok,
            estimated_cost=_estimate_cost(used, in_tok, out_tok),
            role=node.role,
            task_profile=node.task_profile,
            next_context={"summary": text.strip()[:400]},
        )
        workspace.put_result(result)
        await bus.emit(
            ExecutionEvent(
                type="task.completed",
                workflow_id=workspace.workflow_id,
                task_id=node.id,
                payload=result.to_dict(),
            )
        )
        return result
    except Exception as e:
        runtime_ms = int((time.perf_counter() - started) * 1000)
        log.warning("orchestrator.task_failed", task=node.id, error=str(e))
        result = AgentResult(
            task_id=node.id,
            agent=node.role,
            model=node.model_id,
            status="failed",
            result="",
            runtime_ms=runtime_ms,
            error=str(e),
            role=node.role,
            task_profile=node.task_profile,
        )
        workspace.put_result(result)
        await bus.emit(
            ExecutionEvent(
                type="task.failed",
                workflow_id=workspace.workflow_id,
                task_id=node.id,
                payload=result.to_dict(),
            )
        )
        return result


async def execute_workflow_dag(
    dag: WorkflowDAG,
    *,
    complete_fn: CompleteFn,
    bus: ExecutionEventBus | None = None,
    synthesize: bool = True,
    max_parallel: int = 4,
) -> ExecutionReport:
    """
    Execute a workflow DAG with parallel waves of ready nodes.
    """
    bus = bus or ExecutionEventBus()
    dag.validate()
    workflow_id = dag.workflow_id or str(uuid.uuid4())
    workspace = SharedWorkspace(
        workflow_id=workflow_id,
        user_prompt=dag.user_prompt,
        domain=dag.domain,
    )

    await bus.emit(
        ExecutionEvent(
            type="workflow.started",
            workflow_id=workflow_id,
            payload={
                "node_count": len(dag.nodes),
                "multi_agent": dag.multi_agent,
                "prompt": dag.user_prompt[:400],
            },
        )
    )

    completed: set[str] = set()
    running: set[str] = set()
    failed: set[str] = set()
    semaphore = asyncio.Semaphore(max(1, max_parallel))

    async def guarded(node: DAGNode) -> AgentResult:
        async with semaphore:
            return await _run_node(node, workspace=workspace, bus=bus, complete_fn=complete_fn)

    # Wave scheduling until all terminals done or stuck
    while len(completed) + len(failed) < len(dag.nodes):
        ready = dag.ready_nodes(completed, running, failed)
        if not ready:
            # Deadlock / all remaining blocked by failures
            break
        running.update(n.id for n in ready)
        results = await asyncio.gather(*[guarded(n) for n in ready], return_exceptions=False)
        for node, res in zip(ready, results):
            running.discard(node.id)
            if res.status == "completed":
                completed.add(node.id)
            else:
                failed.add(node.id)

    final_text = ""
    model_used = ""
    synthesis: AgentResult | None = None
    success = len(completed) > 0

    if synthesize and success:
        await bus.emit(
            ExecutionEvent(type="synthesis.started", workflow_id=workflow_id, payload={})
        )
        try:
            final_text, model_used, synthesis = await synthesize_results(
                workspace=workspace,
                complete_fn=complete_fn,
            )
            await bus.emit(
                ExecutionEvent(
                    type="synthesis.completed",
                    workflow_id=workflow_id,
                    payload=synthesis.to_dict(),
                )
            )
        except Exception as e:
            log.warning("orchestrator.synthesis_failed", error=str(e))
            # Fallback: concatenate completed results
            parts = [
                f"## {r.role}\n{r.result}"
                for r in workspace.completed_results()
            ]
            final_text = "\n\n".join(parts) or f"Synthesis failed: {e}"
            model_used = "concat"
            success = bool(parts)
    elif success:
        # No synthesize — return last completed
        last = workspace.completed_results()[-1]
        final_text, model_used = last.result, last.model
    else:
        final_text = "Workflow failed — no subtasks completed successfully."
        model_used = ""
        success = False

    await bus.emit(
        ExecutionEvent(
            type="workflow.completed" if success else "workflow.failed",
            workflow_id=workflow_id,
            payload={"success": success, "completed": len(completed), "failed": len(failed)},
        )
    )

    return ExecutionReport(
        workflow_id=workflow_id,
        final_text=final_text,
        model_used=model_used,
        workspace=workspace,
        events=bus.history(),
        synthesis=synthesis,
        success=success,
    )
