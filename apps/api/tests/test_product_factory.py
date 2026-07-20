"""Product Factory — divergent products, gates, blueprint shape."""
from __future__ import annotations

import asyncio
from typing import Any

import pytest

from engines.product_factory.gates import gate_phase
from engines.product_factory.phases import PHASE_ORDER
from engines.product_factory.pipeline import ProductFactoryError, run_product_factory
from engines.product_factory.specialists import heuristic_phase
from engines.product_factory.workspace import empty_workspace, merge_phase_output, to_product_blueprint


async def _boom(**_kwargs: Any) -> tuple[str, str]:
    raise RuntimeError("llm unavailable")


def _parse(_text: str) -> dict[str, Any] | None:
    return None


def test_job_vs_medical_divergent_ia_and_design():
    async def _run():
        job = await run_product_factory(
            name="Job Search Pro",
            chat=[
                {
                    "role": "user",
                    "content": "AI job search with applications resume lab interview prep",
                }
            ],
            requirements={"purpose": "job hunting"},
            preferred_model=None,
            llm_complete=_boom,
            parse_json=_parse,
            use_heuristics_on_failure=True,
        )
        med = await run_product_factory(
            name="Clinic Assist",
            chat=[
                {
                    "role": "user",
                    "content": "Medical assistant patients labs appointments prescriptions",
                }
            ],
            requirements={"purpose": "clinical"},
            preferred_model=None,
            llm_complete=_boom,
            parse_json=_parse,
            use_heuristics_on_failure=True,
        )
        return job, med

    job, med = asyncio.run(_run())
    bp_j = job["product_blueprint"]
    bp_m = med["product_blueprint"]

    nav_j = [n["id"] for n in bp_j["information_architecture"]["nav"]]
    nav_m = [n["id"] for n in bp_m["information_architecture"]["nav"]]
    assert nav_j != nav_m
    assert "applications" in nav_j or "resume_lab" in nav_j
    assert "patients" in nav_m or "labs" in nav_m

    assert bp_j["design_system"]["personality"] != bp_m["design_system"]["personality"]

    for bp, core in ((bp_j, job["ai_core"]), (bp_m, med["ai_core"])):
        assert bp["product_type"]
        assert bp["daily_workflow"]
        assert bp["uvp"]
        assert len(bp["target_users"]) >= 1
        assert len(bp["information_architecture"]["pages"]) >= 3
        assert len(bp["information_architecture"]["nav"]) >= 3
        assert bp["design_system"].get("personality")
        assert bp["design_system"].get("tokens", {}).get("colors")
        assert len(bp["page_specs"]) >= 3
        assert bp["architecture"].get("modules") or bp["architecture"].get("entities")
        assert len(str(core.get("system_prompt") or "").split()) >= 80

    assert len(job["phases"]) == len(PHASE_ORDER)
    assert all(p["status"] == "passed" for p in job["phases"])


def test_progress_events_emit_phases():
    events: list[dict[str, Any]] = []

    async def on_progress(ev: dict[str, Any]) -> None:
        events.append(ev)

    async def _run():
        await run_product_factory(
            name="Travel Buddy",
            chat=[{"role": "user", "content": "trip planner itinerary packing"}],
            requirements={},
            preferred_model=None,
            llm_complete=_boom,
            parse_json=_parse,
            on_progress=on_progress,
            use_heuristics_on_failure=True,
        )

    asyncio.run(_run())
    phase_ids = [e["phase_id"] for e in events if e.get("status") == "passed"]
    assert phase_ids == PHASE_ORDER
    # Live artifact fields appear after IA / design phases
    done_with_nav = [e for e in events if e.get("nav")]
    assert done_with_nav


def test_gate_classify_requires_fields():
    ws = empty_workspace(name="x", chat_summary="y")
    ok, fails = gate_phase("classify", ws)
    assert not ok
    assert any("product_type" in f for f in fails)


def test_gate_ia_rejects_orphan_nav():
    ws = empty_workspace(name="x", chat_summary="y")
    ws["information_architecture"] = {
        "pages": [
            {"id": "a", "label": "A"},
            {"id": "b", "label": "B"},
            {"id": "c", "label": "C"},
        ],
        "nav": [
            {"id": "a", "label": "A"},
            {"id": "orphan", "label": "Orphan"},
            {"id": "c", "label": "C"},
        ],
    }
    ok, fails = gate_phase("ia", ws)
    assert not ok
    assert any("orphan" in f for f in fails)


def test_gate_design_bans_purple_and_inter():
    ws = empty_workspace(name="x", chat_summary="y")
    ws["design_system"] = {
        "personality": "generic",
        "tokens": {
            "colors": {"accent": "#6366f1"},
            "typography": {"font_sans": "Inter"},
        },
    }
    ok, fails = gate_phase("design_system", ws)
    assert not ok
    assert len(fails) >= 1


def test_gate_page_ux_requires_nav_coverage():
    ws = empty_workspace(name="x", chat_summary="y")
    ws["information_architecture"] = {
        "pages": [
            {"id": "home", "label": "Home"},
            {"id": "work", "label": "Work"},
            {"id": "set", "label": "Set"},
        ],
        "nav": [
            {"id": "home", "label": "Home"},
            {"id": "work", "label": "Work"},
            {"id": "set", "label": "Set"},
        ],
    }
    ws["page_specs"] = {"home": {"purpose": "landing"}}
    ok, fails = gate_phase("page_ux", ws)
    assert not ok
    assert any("work" in f or "set" in f for f in fails)


def test_heuristic_merge_passes_all_gates():
    ws = empty_workspace(name="Code Mentor", chat_summary="IDE coding pair programmer")
    transcript = "IDE coding pair programmer"
    for phase_id in PHASE_ORDER:
        data = heuristic_phase(phase_id, ws, name="Code Mentor", transcript=transcript)
        ws = merge_phase_output(ws, phase_id, data)
        ok, fails = gate_phase(phase_id, ws)
        assert ok, f"{phase_id} failed: {fails}"
    bp = to_product_blueprint(ws)
    assert "product_type" in bp
    assert len(bp["information_architecture"]["nav"]) >= 3


def test_factory_fails_without_heuristics_when_llm_down():
    async def _run():
        await run_product_factory(
            name="Broken",
            chat=[{"role": "user", "content": "anything"}],
            requirements={},
            preferred_model=None,
            llm_complete=_boom,
            parse_json=_parse,
            use_heuristics_on_failure=False,
        )

    with pytest.raises(ProductFactoryError):
        asyncio.run(_run())
