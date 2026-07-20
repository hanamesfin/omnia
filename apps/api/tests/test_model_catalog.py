"""Foundation model catalog — 100+ models + task recommendation."""
from engines.model_selection.registry import MODEL_TABLE, openrouter_id_for
from engines.model_selection.scorer import detect_task_type, select_model


def test_catalog_has_100_plus_models():
    assert len(MODEL_TABLE) >= 100
    assert len({m["name"] for m in MODEL_TABLE}) == len(MODEL_TABLE)


def test_openrouter_ids_present():
    assert openrouter_id_for("gpt-4o").startswith("openai/")
    assert openrouter_id_for("claude-sonnet-4").startswith("anthropic/")
    assert "free" in openrouter_id_for("openrouter/free")


def test_detect_task_from_prompt():
    assert detect_task_type("general", prompt="debug this python stack trace") == "coding"
    assert detect_task_type("general", prompt="read this screenshot OCR") == "vision"
    assert detect_task_type("general", prompt="HIPAA patient notes") == "sensitive_data"


def test_recommend_returns_reason():
    ranked = select_model("coding", prompt="build a typescript agent", limit=5)
    assert len(ranked) == 5
    assert ranked[0].reason
    assert ranked[0].score >= ranked[-1].score
