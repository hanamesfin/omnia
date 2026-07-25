"""Tests for retroactive design-strategy upgrades on existing agents."""

from __future__ import annotations

from engines.product_factory.design_upgrade import (
    STRATEGY_MIGRATION,
    is_collections_agent,
    listing_design_cues,
    needs_design_strategy_upgrade,
    strategy_product_blueprint,
    upgrade_agent_design,
    upgrade_store_agents,
)


def _legacy_agent(**overrides):
    agent = {
        "id": "agent-seed-bug-triage",
        "name": "Bug Triage",
        "specialty": "Paste a stack trace — get a prioritized triage note.",
        "domain": "coding",
        "kind": "tool",
        "product_blueprint": {
            "product_type": "Tool Workspace",
            "uvp": "triage",
            "information_architecture": {
                "pages": [
                    {"id": "workspace", "label": "Workspace"},
                    {"id": "quick-start", "label": "Quick start"},
                    {"id": "about", "label": "About"},
                ],
                "nav": [
                    {"id": "workspace", "label": "Workspace"},
                    {"id": "quick-start", "label": "Quick start"},
                    {"id": "about", "label": "About"},
                ],
            },
            "design_system": {
                "personality": "Focused, capable, and clear",
                "tokens": {
                    "radius": {"card": "1rem"},
                    "motion": {"duration": "180ms"},
                },
            },
            "migration": {"source": "legacy_agent", "version": 1},
        },
    }
    agent.update(overrides)
    return agent


def test_legacy_needs_upgrade():
    assert needs_design_strategy_upgrade(_legacy_agent()) is True


def test_strategy_blueprint_is_distinctive_not_collections():
    bp = strategy_product_blueprint(_legacy_agent())
    assert bp["migration"]["source"] == STRATEGY_MIGRATION["source"]
    assert bp["design_match"].get("template_id")
    ds = bp["design_system"]
    assert ds["personality"].lower() != "focused, capable, and clear"
    colors = ds["tokens"]["colors"]
    assert colors.get("bg") and colors.get("accent")
    assert "collections" not in str(bp.get("product_type") or "").lower()
    assert str(ds.get("personality") or "").lower() != "curated_calm"
    # Coding specialty should not land on purple Inter AI chrome personality alone
    refs = " ".join(ds.get("references") or []).lower()
    assert "trove" not in refs


def test_upgrade_mutates_legacy_agent():
    agent = _legacy_agent()
    assert upgrade_agent_design(agent) is True
    bp = agent["product_blueprint"]
    assert bp["migration"]["source"] == "design_strategy_v1"
    assert bp["design_match"]["template_id"]
    assert listing_design_cues(agent)["accent"]


def test_upgrade_is_idempotent_after_strategy():
    agent = _legacy_agent()
    assert upgrade_agent_design(agent) is True
    assert upgrade_agent_design(agent) is False


def test_trove_stays_collections():
    trove = {
        "id": "agent-seed-trove",
        "name": "Trove",
        "specialty": "Collect artworks",
        "domain": "content",
        "kind": "chat",
        "product_blueprint": {
            "product_type": "Collections App",
            "design_system": {
                "personality": "curated_calm",
                "tokens": {
                    "colors": {
                        "bg": "#f4f4f4",
                        "fg": "#000000",
                        "accent": "#000000",
                    }
                },
            },
            "information_architecture": {
                "pages": [{"id": "home"}, {"id": "collections"}, {"id": "search"}, {"id": "assistant"}],
                "nav": [{"id": "home"}, {"id": "collections"}, {"id": "search"}, {"id": "assistant"}],
            },
        },
    }
    assert is_collections_agent(trove) is True

    def trove_bp():
        return dict(trove["product_blueprint"])

    changed = upgrade_agent_design(trove, trove_blueprint_fn=trove_bp)
    assert changed is True  # attaches design_match
    assert trove["product_blueprint"]["product_type"] == "Collections App"
    assert trove["product_blueprint"]["design_system"]["personality"] == "curated_calm"
    assert trove["product_blueprint"]["design_match"].get("template_id")
    # Second pass: design_match present → no further rewrite of Collections DS
    assert upgrade_agent_design(trove, trove_blueprint_fn=trove_bp) is False


def test_store_batch_upgrade():
    agents = {
        "a": _legacy_agent(id="a", name="PR Reviewer", specialty="Diff in — risk out.", domain="coding"),
        "b": _legacy_agent(
            id="b",
            name="CSV Insight",
            specialty="Drop a spreadsheet",
            domain="data_analysis",
            kind="analyzer",
        ),
    }
    n = upgrade_store_agents(agents)
    assert n == 2
    assert agents["a"]["product_blueprint"]["design_match"]["template_id"]
    assert agents["b"]["product_blueprint"]["design_system"]["tokens"]["colors"]["bg"]


def test_cover_letter_gets_content_oriented_match():
    agent = {
        "id": "agent-seed-cover-letter",
        "name": "Cover Letter Studio",
        "specialty": "Role description in, tailored letter out.",
        "domain": "content",
        "kind": "transformer",
    }
    bp = strategy_product_blueprint(agent)
    assert bp["design_match"].get("template_id")
    assert bp["design_system"]["tokens"]["colors"]["accent"]
    cues = listing_design_cues({"product_blueprint": bp, "domain": "content"})
    assert cues is not None
    assert cues.get("accent") or cues.get("mood") or cues.get("archetype")
