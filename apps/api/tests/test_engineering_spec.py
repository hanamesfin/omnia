"""
Engineering Spec Draft v0.1 — deterministic algorithm tests.
No network. Feed this file when extending §1–§4.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from engines.spec.schema import AgentSpecV1, ToolAttachment, bridge_from_interview
from engines.spec.completeness import completeness, all_required_filled, preview_offer
from engines.spec.aqs import aqs, score_agent, safety_score
from engines.spec.synthetic_tests import run_synthetic_suite
from engines.spec.improve import improvement_suggestions
from engines.prompt_engineering.compiler import compile_system_prompt
from engines.marketplace.ranking import marketplace_rank_score
from engines.orchestration.decision import ActionOption, choose_action
from engines.orchestration.loop import run_orchestration_loop
from engines.tools.registry import attach_read_only_suggestions, permitted


def _grocery_spec() -> AgentSpecV1:
    return AgentSpecV1(
        agent_id="demo-grocery",
        purpose="help a user plan groceries within a weekly budget",
        target_user="household shopper on a weekly budget",
        domain="finance",
        tone="friendly",
        capabilities=[
            "suggest meal plans within budget",
            "estimate grocery costs",
            "flag overspending",
        ],
        constraints=[
            "never present a price lookup as guaranteed-accurate",
            "do not retain what the user shares about their finances",
        ],
        escalation=(
            "if the stated budget is unrealistic for the household size, say so directly "
            "and suggest categories to cut"
        ),
        output_format="chat",
        tools=[ToolAttachment("price_lookup", "read_only")],
        created_by="test",
    )


def test_aqs_formula_example():
    # Spec §5 worked example v1 numbers → 0.855
    assert aqs(0.95, 0.68, 0.88, 0.90) == 0.855
    assert aqs(0.95, 0.85, 0.88, 0.90) == 0.898


def test_completeness_and_preview_gate():
    spec = _grocery_spec()
    c = completeness(spec)
    assert c >= 0.85
    assert all_required_filled(spec)
    gate = preview_offer(spec)
    assert gate.ready is True


def test_compiler_deterministic():
    spec = _grocery_spec()
    a = compile_system_prompt(spec)
    b = compile_system_prompt(spec)
    assert a == b
    assert "Explicit constraints" in a
    assert "price_lookup" in a


def test_synthetic_suite_and_aqs():
    spec = _grocery_spec()
    suite = run_synthetic_suite(spec)
    assert suite.pass_rate >= 0.8
    prompt = compile_system_prompt(spec)
    result = score_agent(spec, prompt, suite.pass_rate)
    assert 0.0 <= result.aqs <= 1.0
    assert result.test_pass_rate == suite.pass_rate


def test_safety_triggers_improvement():
    thin = _grocery_spec()
    thin.constraints = ["be safe"]  # generic → low safety for finance+tool
    s = safety_score(thin)
    thin.scores.safety = s
    thin.scores.coverage = 0.9
    thin.scores.clarity = 0.9
    thin.scores.test_pass_rate = 0.9
    tips = improvement_suggestions(thin, thin.scores)
    assert any("SafetyScore" in t.trigger for t in tips)


def test_marketplace_cold_start_equals_aqs():
    # rating_count = 0 → usage = AQS → rank = AQS
    assert marketplace_rank_score(0.898, 0.0, 0, k=10) == 0.898


def test_decision_irreversible_forces_ask():
    d = choose_action(
        [
            ActionOption(kind="call_tool", expected_value=0.99, tag="irreversible", tool_id="charge_card"),
            ActionOption(kind="answer", expected_value=0.2),
        ]
    )
    assert d.action == "ask_user"


def test_orchestration_budget_and_answer():
    spec = _grocery_spec()
    res = run_orchestration_loop(user_message="Plan meals under $80", spec=spec)
    assert res.outcome in ("answer", "ask_user", "escalate")
    assert res.steps <= 6


def test_tool_permission():
    spec = _grocery_spec()
    assert permitted(spec, "price_lookup")
    assert not permitted(spec, "charge_card")
    enriched = attach_read_only_suggestions(spec)
    assert any(t.tool_id for t in enriched.tools)


def test_bridge_from_interview():
    spec = bridge_from_interview(
        agent_id="x",
        created_by="u",
        answers={
            "goal_detail": "Help students practice Spanish dialogues with corrections",
            "domain_raw": "Education",
            "tone_raw": "Friendly · ask on ambiguity",
            "constraints_raw": "Stay honest — never invent facts",
            "kind_raw": "Chat companion",
        },
        profile_goal="Spanish practice",
        profile_domain="education",
        composer_tools=["search"],
        capability_list=["correct pronunciation gently"],
    )
    assert spec.domain == "education"
    assert spec.tone == "friendly"
    assert completeness(spec) > 0.5
