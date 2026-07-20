"""Architect interview — inspire, don't clone."""
from engines.agent_architect.inspiration import detect_product, needs_inspiration_interview
from engines.agent_architect.composer import compose_agent_spec
from engines.user_intelligence.extractor import UserProfile
from engines.user_intelligence.fsm import MIN_USER_TURNS, advance_fsm, get_initial_step


def test_detect_claude_and_chatgpt():
    assert detect_product("Create Claude").id == "claude"
    assert detect_product("make something like ChatGPT").id == "chatgpt"
    assert detect_product("Cursor for my team").id == "cursor"
    assert detect_product("a spreadsheet helper") is None


def test_create_claude_stays_open_and_marks_inspiration():
    step = get_initial_step()
    answers, step = advance_fsm(step.state, {}, "Create Claude", answer_type="freetext")
    assert answers.get("inspiration_product") == "Claude"
    assert step.state == "design"
    assert step.is_done is False


def test_inspiration_path_stays_open_until_user_opts_in():
    answers: dict = {}
    state = "welcome"
    answers, step = advance_fsm(state, answers, "Create Claude", "freetext")
    assert step.state == "design"
    answers, step = advance_fsm(step.state, answers, "Deep reasoning", "chip")
    answers["inspiration_aspects"] = "Deep reasoning"
    answers, step = advance_fsm(step.state, answers, "Specialize for my industry", "chip")
    answers["improve_focus"] = "Specialize for my industry"
    assert not needs_inspiration_interview(answers)
    assert step.state == "design"
    assert step.is_done is False


def test_compose_marks_inspired_not_brand():
    profile = UserProfile(
        domain="general",
        primary_goal="careful reasoning partner",
        technical_level=3,
        formality=3,
        autonomy_preference=3,
        constraints=[],
        suggested_tools=[],
    )
    spec = compose_agent_spec(
        profile,
        {
            "inspiration_product": "Claude",
            "inspiration_aspects": "Deep reasoning",
            "improve_focus": "Specialize for my industry",
            "kind_raw": "Frontier chat",
            "welcome_ack": "Create Claude",
        },
    )
    assert spec.capability_tier == "frontier"
    assert "Claude" in spec.role
    assert "inspired" in spec.role.lower()
    assert any("not_clone" in r or "inspiration" in r for r in spec.rules_fired)
    assert "Never impersonates" in " ".join(spec.evaluation_criteria)


def test_generic_path_reaches_done_only_on_opt_in():
    answers: dict = {}
    state = get_initial_step().state
    script = [
        "A coding workflow agent",
        "Review pull requests for risk",
        "Stay honest — never invent facts",
        "Technical · mostly autonomous",
    ]
    assert len(script) >= MIN_USER_TURNS
    for ans in script:
        answers, step = advance_fsm(state, answers, ans, "chip")
        state = step.state
        assert step.is_done is False
    assert step.can_finish
    answers, step = advance_fsm(state, answers, "I'm ready — generate", "chip")
    assert step.state == "done"
    assert step.is_done
