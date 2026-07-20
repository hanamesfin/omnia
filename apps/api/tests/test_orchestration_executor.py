"""DAG workflow executor + event bus + synthesis."""
from __future__ import annotations

import asyncio

from engines.orchestration.dag import DAGNode, WorkflowDAG
from engines.orchestration.events import ExecutionEvent, ExecutionEventBus
from engines.orchestration.executor import execute_workflow_dag
from engines.orchestration.results import AgentResult
from engines.orchestration.workspace import SharedWorkspace
from engines.model_selection.workflow import plan_workflow
from engines.model_selection.task_analyzer import analyze_prompt
from engines.model_selection.recommendation import recommend


def test_agent_result_schema():
    r = AgentResult(
        task_id="t1",
        agent="Research",
        model="gpt-4o-mini",
        status="completed",
        result="findings",
        confidence=0.9,
    )
    d = r.to_dict()
    assert d["task_id"] == "t1"
    assert AgentResult.from_dict(d).result == "findings"


def test_dag_cycle_detection():
    dag = WorkflowDAG(
        workflow_id="w1",
        nodes=[
            DAGNode("a", "A", "x", "m", "M", "general", depends_on=["b"]),
            DAGNode("b", "B", "y", "m", "M", "general", depends_on=["a"]),
        ],
    )
    try:
        dag.validate()
        assert False, "expected cycle error"
    except ValueError as e:
        assert "cycle" in str(e).lower()


def test_dag_ready_nodes_parallel():
    dag = WorkflowDAG(
        workflow_id="w1",
        nodes=[
            DAGNode("research", "Research", "r", "m1", "M1", "research"),
            DAGNode("ui", "UI", "u", "m2", "M2", "frontend"),
            DAGNode("code", "Code", "c", "m3", "M3", "coding", depends_on=["research", "ui"]),
        ],
    )
    dag.validate()
    ready = dag.ready_nodes(set(), set(), set())
    assert {n.id for n in ready} == {"research", "ui"}
    ready2 = dag.ready_nodes({"research", "ui"}, set(), set())
    assert [n.id for n in ready2] == ["code"]


def test_event_bus_history():
    async def _run():
        bus = ExecutionEventBus()
        seen = []

        async def handler(e: ExecutionEvent):
            seen.append(e.type)

        bus.subscribe(handler)
        await bus.emit(ExecutionEvent(type="workflow.started", workflow_id="w"))
        await bus.emit(ExecutionEvent(type="task.started", workflow_id="w", task_id="t1"))
        assert seen == ["workflow.started", "task.started"]
        assert len(bus.history()) == 2

    asyncio.run(_run())


def test_workspace_upstream_context():
    ws = SharedWorkspace(workflow_id="w", user_prompt="build")
    ws.put_result(
        AgentResult(
            task_id="a",
            agent="Research",
            model="m",
            status="completed",
            result="Tesla grew 12%",
            role="Research",
        )
    )
    ctx = ws.get_upstream_context(["a"])
    assert "Tesla" in ctx


def test_plan_workflow_emits_dag():
    prompt = "Research Tesla then write a summary then build a dashboard"
    analysis = analyze_prompt(prompt)
    rec = recommend(analysis)
    plan = plan_workflow(prompt, analysis, rec)
    if plan.multi_agent:
        assert plan.dag is not None
        plan.dag.validate()
        assert any(s.depends_on for s in plan.subtasks) or len(plan.subtasks) >= 2


def test_execute_dag_parallel_and_synthesize():
    async def fake_complete(*, system, user, preferred_model=None, max_tokens=1200):
        role = "unknown"
        if "Research" in system:
            role = "research-out"
        elif "Code" in system or "Coding" in system:
            role = "code-out"
        elif "synthesis" in system.lower() or "Merge" in system or "specialist agents" in system:
            return "FINAL MERGED ANSWER", preferred_model or "synth"
        return f"result:{role}:{preferred_model}", preferred_model or "m"

    async def _run():
        dag = WorkflowDAG(
            workflow_id="wf-test",
            user_prompt="Research then code",
            domain="coding",
            multi_agent=True,
            nodes=[
                DAGNode("r", "Research", "look up facts", "gpt-4o-mini", "Mini", "research"),
                DAGNode("c", "Coding", "write code", "gpt-4o-mini", "Mini", "coding", depends_on=["r"]),
            ],
        )
        report = await execute_workflow_dag(dag, complete_fn=fake_complete, synthesize=True)
        assert report.success
        assert "FINAL" in report.final_text or report.workspace.completed_results()
        types = [e["type"] for e in report.events]
        assert "workflow.started" in types
        assert "task.completed" in types
        assert "workflow.completed" in types

    asyncio.run(_run())
