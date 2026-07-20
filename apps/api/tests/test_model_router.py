"""Intelligent Model Router — task analysis, recommendation, workflow."""
from __future__ import annotations

from engines.model_selection.router import ModelRouter
from engines.model_selection.task_analyzer import analyze_prompt
from engines.model_selection.recommendation import recommend
from engines.model_selection.workflow import plan_workflow


def test_analyze_coding_prompt():
    a = analyze_prompt("Debug this Python stack trace and refactor the API endpoint")
    assert a.primary_task == "coding"
    assert "coding" in a.detected_categories or "debugging" in a.detected_categories


def test_analyze_multi_task():
    a = analyze_prompt(
        "Research Tesla earnings and then build charts and then create a landing page website"
    )
    assert a.multi_task is True
    assert len(a.subtask_hints) >= 2


def test_recommend_returns_profiles():
    a = analyze_prompt("Write production TypeScript for a REST API")
    rec = recommend(a)
    assert rec.recommended.name
    assert rec.backup.name
    assert "fastest" in rec.picks
    assert "cheapest" in rec.picks
    assert rec.confidence > 0


def test_router_route():
    router = ModelRouter()
    decision = router.route(
        "Summarize this research paper with citations",
        domain="research",
    )
    assert decision.model_id
    assert decision.recommendation.explanation
    assert decision.auto_routed is True


def test_router_manual_override():
    router = ModelRouter()
    decision = router.route("hello", preferred="gpt-4o-mini")
    assert decision.model_id == "gpt-4o-mini"
    assert decision.auto_routed is False


def test_workflow_plan_multi_agent():
    prompt = "Research competitors and then write a report and then build a dashboard"
    a = analyze_prompt(prompt)
    router = ModelRouter()
    decision = router.route(prompt, enable_workflow=True)
    if decision.workflow and decision.workflow.multi_agent:
        assert len(decision.workflow.subtasks) >= 2
        assert decision.workflow.subtasks[0].model_id
