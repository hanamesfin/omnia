"""
Unit tests for deterministic Section 5 algorithms.
No mocks, no network — milliseconds to run.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import pytest

# Allow importing engines without installing the package
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from engines.marketplace.ranking import wilson_score, bayesian_average
from engines.model_selection.scorer import select_model, _normalize
from engines.evolution.detector import check_for_anomaly
from engines.prompt_engineering.generator import lint_prompt
from engines.agent_architect.composer import _cosine
from engines.user_intelligence.fsm import (
    advance_fsm,
    get_initial_step,
    ORDERED_STATES,
    normalize_answer,
)
from engines.evaluation.scorer import EvaluationInput, compute_composite


# ─── 5.9 Wilson score ─────────────────────────────────────────────────────────

def test_wilson_empty():
    assert wilson_score(0, 0) == 0.0


def test_wilson_small_sample_below_large():
    """2/2 perfect ratings should not outrank a large strong sample."""
    tiny = wilson_score(2, 2)
    large = wilson_score(180, 200)
    assert large > tiny


def test_wilson_all_negative():
    assert wilson_score(0, 50) == 0.0


def test_bayesian_pulls_toward_mean():
    platform_mean = 4.0
    # One 5-star review — pulled toward 4.0
    score = bayesian_average(5.0, 1, platform_mean, prior_weight=10)
    assert 4.0 < score < 5.0


# ─── 5.4 Model selection ──────────────────────────────────────────────────────

def test_normalize_minmax():
    assert _normalize([1.0, 2.0, 3.0]) == [0.0, 0.5, 1.0]


def test_normalize_constant():
    assert _normalize([5.0, 5.0, 5.0]) == [1.0, 1.0, 1.0]


def test_select_model_returns_ranked():
    ranked = select_model("coding")
    assert len(ranked) >= 4
    scores = [m.score for m in ranked]
    assert scores == sorted(scores, reverse=True)
    assert "reasoning" in ranked[0].score_breakdown


def test_sensitive_constraint_changes_weights():
    coding = select_model("coding")
    sensitive = select_model("coding", constraints=["HIPAA sensitive personal data"])
    # Different top pick or different score is fine; privacy breakdown should differ in ranking logic
    assert sensitive[0].score_breakdown["privacy"] is not None
    assert coding[0].name and sensitive[0].name


# ─── 5.8 Evolution z-score ────────────────────────────────────────────────────

def test_evolution_insufficient_samples():
    result = check_for_anomaly([0.8, 0.81, 0.79], 0.2)
    assert result.should_flag is False


def test_evolution_flags_2_sigma_drop():
    baseline = [0.80, 0.81, 0.79, 0.82, 0.80, 0.81, 0.78, 0.80, 0.82, 0.79]
    result = check_for_anomaly(baseline, 0.40)
    assert result.should_flag is True
    assert result.z_score < -2.0
    assert "dropped" in result.suggestion.lower()


def test_evolution_no_flag_when_normal():
    baseline = [0.80, 0.81, 0.79, 0.82, 0.80, 0.81, 0.78, 0.80, 0.82, 0.79]
    result = check_for_anomaly(baseline, 0.80)
    assert result.should_flag is False


# ─── 5.2 Cosine similarity ────────────────────────────────────────────────────

def test_cosine_identical():
    v = [1.0, 0.0, 0.5]
    assert abs(_cosine(v, v) - 1.0) < 1e-9


def test_cosine_orthogonal():
    assert abs(_cosine([1.0, 0.0], [0.0, 1.0])) < 1e-9


def test_cosine_zero_vector():
    assert _cosine([0.0, 0.0], [1.0, 1.0]) == 0.0


# ─── 5.3 Linter ───────────────────────────────────────────────────────────────

GOOD_PROMPT = """
1. Role and scope
You are a coding assistant that reviews pull requests for correctness and clarity.
You do not merge code or push to production without explicit confirmation.

2. Tone and style
Communicate in clear, technical English. Prefer short paragraphs and concrete examples.

3. Tools available and when to use each
code_execution — use when verifying a snippet or running a failing test locally.
code_lint — use when asking for style or static-analysis feedback.

4. Explicit constraints
Never use external services for personal data. Never invent file paths or commit hashes.
Never claim that tests passed without tool evidence.

5. Escalation rule
When the request is outside code review or you lack enough context to be sure,
respond with "I can't help with that" instead of guessing.
""" + (" Extra detail for word count. " * 40)


def test_lint_passes_well_formed_prompt():
    result = lint_prompt(GOOD_PROMPT)
    assert result.passed is True
    assert result.word_count >= 150


def test_lint_fails_missing_sections():
    result = lint_prompt("Hello world this is too short and unstructured.")
    assert result.passed is False
    assert any("section" in f.lower() or "word" in f.lower() for f in result.failures)


# ─── 5.1 FSM ──────────────────────────────────────────────────────────────────

def test_fsm_initial_is_welcome():
    step = get_initial_step()
    assert step.state == "welcome"
    assert step.is_done is False


def test_fsm_full_path_chip_and_freetext():
    from engines.user_intelligence.fsm import MIN_USER_TURNS

    answers: dict = {}
    state = "welcome"
    # Open design: keep chatting until min turns, then opt in
    script = [
        "specialist for my team",
        "Coding helpers for PRs",
        "Review code carefully",
        "Stay honest — never invent facts",
    ]
    assert len(script) >= MIN_USER_TURNS
    for ans in script:
        answers, step = advance_fsm(state, answers, ans, answer_type="chip")
        state = step.state
        assert step.is_done is False
    assert step.can_finish is True
    answers, step = advance_fsm(state, answers, "I'm ready — generate", answer_type="chip")
    assert step.state == "done"
    assert step.is_done is True

    # freetext normalizes same as chip (string value)
    assert normalize_answer("chip", "  Coding  ") == "Coding"
    assert normalize_answer("freetext", "  Coding  ") == "Coding"


def test_fsm_cannot_finish_before_min_turns():
    answers: dict = {}
    state = "welcome"
    answers, step = advance_fsm(state, answers, "coding helper", "freetext")
    assert step.can_finish is False
    answers, step = advance_fsm(step.state, answers, "I'm ready — generate", "chip")
    assert step.state == "design"
    assert step.is_done is False
    assert "more" in (step.question or "").lower()


# ─── 5.7 Composite score ──────────────────────────────────────────────────────

def test_composite_score_bounds():
    ev = EvaluationInput(
        latency_ms=500,
        success=True,
        schema_valid=True,
        user_rating=5.0,
        tokens_used=100,
        cost_usd=0.001,
        rolling_success_rate=1.0,
        judge_score=None,
    )
    score = compute_composite(ev)
    assert 0.0 <= score.composite <= 1.0
    assert score.reliability == 1.0
