"""Regression: agents must not inherit Collections/Trove UI by default."""
from __future__ import annotations

import asyncio
from unittest.mock import patch

from engines.product_factory.ui_code_generator import generate_frontend_from_figma
from engines.product_factory.workspace import merge_phase_output, empty_workspace, re_search_curation


def test_re_search_curation_detects_trove_and_collections_app():
    assert re_search_curation("Collections App / Trove calm")
    assert re_search_curation("curated gallery for saves")
    assert not re_search_curation("job search resume lab")
    assert not re_search_curation("Notion restraint Linear")


def test_workspace_strips_collections_refs_for_non_curation():
    ws = empty_workspace(name="Code Mentor", chat_summary="IDE coding pair")
    ws["product_type"] = "ide"
    ws["uvp"] = "Developer platform with PR review"
    data = {
        "design_system": {
            "personality": "terminal_precision",
            "references": ["Collections App / Trove", "Cursor", "Raycast"],
            "tokens": {
                "colors": {"bg": "#eceae6", "fg": "#0b0d10", "accent": "#e8590c"},
                "typography": {"font_display": "Space Grotesk", "font_sans": "IBM Plex Sans"},
            },
            "chrome": {"mode": "standalone"},
        }
    }
    out = merge_phase_output(ws, "design_system", data)
    refs = " ".join(out["design_system"]["references"]).lower()
    assert "collections" not in refs
    assert "trove" not in refs
    assert "cursor" in refs
    assert out["design_system"]["tokens"]["typography"]["font_display"] == "Space Grotesk"


def test_workspace_keeps_collections_refs_for_curation_product():
    ws = empty_workspace(name="Trove", chat_summary="curated collections gallery")
    ws["product_type"] = "Collections App"
    ws["uvp"] = "Calm curated canvas"
    data = {
        "design_system": {
            "personality": "curated_calm",
            "references": ["Collections App / Trove", "Siteinspire"],
            "tokens": {
                "colors": {"bg": "#f4f4f4", "fg": "#000000"},
                "typography": {"font_display": "Platypi", "font_sans": "Host Grotesk"},
            },
            "chrome": {"mode": "standalone"},
        }
    }
    out = merge_phase_output(ws, "design_system", data)
    refs = " ".join(out["design_system"]["references"]).lower()
    assert "trove" in refs or "collections" in refs


def test_workspace_defaults_are_not_collections_fonts():
    ws = empty_workspace(name="X", chat_summary="y")
    out = merge_phase_output(
        ws,
        "design_system",
        {
            "design_system": {
                "personality": "focused_momentum",
                "tokens": {"colors": {"bg": "#abc123"}},
                "chrome": {},
            }
        },
    )
    typo = out["design_system"]["tokens"]["typography"]
    assert typo["font_display"] == "Fraunces"
    assert typo["font_sans"] == "DM Sans"
    assert out["design_system"]["tokens"]["colors"]["bg"] == "#abc123"


def test_ui_codegen_does_not_fallback_to_collections(monkeypatch):
    import config as config_mod

    monkeypatch.setattr(config_mod.settings, "PRODUCT_FACTORY_FIGMA_CODEGEN", True)
    monkeypatch.setattr(config_mod.settings, "DEMO_MODE", False)

    ws = empty_workspace(name="Job Search", chat_summary="resume interview")
    ws["product_type"] = "saas"

    async def _run():
        with patch(
            "services.figma.matcher.find_best_figma_template",
            return_value={
                "id": "job_search",
                "file_key": "PLACEHOLDER_job_search",
                "node_id": "0:1",
                "placeholder": True,
                "domain": "career",
                "score": 0.9,
            },
        ):
            return await generate_frontend_from_figma(
                workspace=ws,
                user_prompt="job resume interview applications",
            )

    result = asyncio.run(_run())
    assert result is None
    # Must not stamp Collections fallback onto non-curation agents
    assert (ws.get("figma_template") or {}).get("fallback_to") != "collections_curation"
