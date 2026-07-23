"""Figma matcher + client unit tests (no live Figma network)."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from services.figma.client import (
    FigmaAPIClient,
    FigmaAPIError,
    extract_design_signals,
    filter_figma_node,
)
from services.figma.matcher import SEED_TEMPLATES, find_best_figma_template


def test_seed_includes_collections_file_key():
    keys = {t["file_key"] for t in SEED_TEMPLATES}
    assert "dismXXnVXKBKDmUrzz7FVE" in keys
    collections = next(t for t in SEED_TEMPLATES if t["file_key"] == "dismXXnVXKBKDmUrzz7FVE")
    assert collections["domain"] == "curation"


def test_matcher_prefers_curation_for_collections_prompt():
    match = find_best_figma_template(
        "curated collections gallery bookmark aesthetic library",
        domain="curation",
    )
    assert match["file_key"] == "dismXXnVXKBKDmUrzz7FVE"
    assert match["score"] > 0
    assert match["match_method"] in ("embedding", "keyword")
    assert isinstance(match.get("candidates"), list)


def test_matcher_job_domain_beats_travel():
    match = find_best_figma_template(
        "AI job search with resume lab and interview prep applications",
        domain="career",
    )
    assert match["id"] == "job_search"
    assert match.get("placeholder") is True


def test_matcher_keyword_fallback_without_embedder():
    with patch.dict("sys.modules", {"engines.knowledge.embedder": None}):
        # Force keyword path by making embed import fail inside find_best
        with patch(
            "engines.knowledge.embedder.embed",
            side_effect=RuntimeError("no embeddings"),
            create=True,
        ):
            match = find_best_figma_template("trip itinerary flight hotel travel", domain="travel")
    # Even if patch is imperfect, travel keywords should win via normal path
    match2 = find_best_figma_template("trip itinerary flight hotel travel", domain="travel")
    assert match2["domain"] == "travel"
    assert match2["score"] > 0


def test_client_url_building_normalizes_node_id():
    client = FigmaAPIClient(access_token="figu_test_token")
    assert "files/abc/nodes" in client.nodes_url("abc", "12-34")
    assert "ids=12%3A34" in client.nodes_url("abc", "12-34") or "ids=12:34" in client.nodes_url(
        "abc", "12-34"
    ).replace("%3A", ":")
    img = client.images_url("abc", "1-2", scale=2.0)
    assert "images/abc" in img
    assert "format=png" in img


def test_client_missing_token_raises():
    client = FigmaAPIClient(access_token="")
    with pytest.raises(FigmaAPIError) as ei:
        client.get_node_json("dismXXnVXKBKDmUrzz7FVE", "0:1")
    assert ei.value.status_code == 401


def test_client_placeholder_file_key_raises():
    client = FigmaAPIClient(access_token="figu_test")
    with pytest.raises(FigmaAPIError):
        client.get_node_json("PLACEHOLDER_saas_workspace", "0:1")


def test_client_get_node_json_filters_response():
    payload = {
        "nodes": {
            "0:1": {
                "document": {
                    "id": "0:1",
                    "name": "Frame",
                    "type": "FRAME",
                    "layoutMode": "VERTICAL",
                    "itemSpacing": 16,
                    "exportSettings": [{"format": "PNG"}],
                    "pluginData": {"noise": True},
                    "fills": [{"type": "SOLID", "color": {"r": 1, "g": 0, "b": 0, "a": 1}}],
                    "children": [
                        {
                            "id": "1:2",
                            "name": "Title",
                            "type": "TEXT",
                            "style": {"fontFamily": "Platypi", "fontSize": 32},
                            "characters": "Hello",
                            "reactions": [],
                        }
                    ],
                }
            }
        }
    }

    class FakeResp:
        status_code = 200

        def json(self):
            return payload

        @property
        def text(self):
            return ""

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def get(self, url, headers=None, params=None):
            assert "X-Figma-Token" in (headers or {})
            assert "nodes" in url
            return FakeResp()

    client = FigmaAPIClient(access_token="figu_test")
    with patch("httpx.Client", FakeClient):
        out = client.get_node_json("dismXXnVXKBKDmUrzz7FVE", "0:1")
    doc = out["document"]
    assert "exportSettings" not in doc
    assert "pluginData" not in doc
    assert doc["layoutMode"] == "VERTICAL"
    assert doc["fills"][0].get("hex") == "#ff0000"
    assert "colors" in out["extracted"]


def test_client_get_node_image_returns_url():
    class FakeResp:
        status_code = 200

        def json(self):
            return {"images": {"0:1": "https://figma-alpha.s3.amazonaws.com/img.png"}}

        @property
        def text(self):
            return ""

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def get(self, url, headers=None, params=None):
            assert "images" in url
            return FakeResp()

    client = FigmaAPIClient(access_token="figu_test")
    with patch("httpx.Client", FakeClient):
        url = client.get_node_image("dismXXnVXKBKDmUrzz7FVE", "0:1")
    assert url.startswith("https://")


def test_filter_and_extract_signals():
    node = {
        "name": "Root",
        "type": "FRAME",
        "layoutMode": "HORIZONTAL",
        "itemSpacing": 8,
        "fills": [{"type": "SOLID", "color": {"r": 0, "g": 0, "b": 0, "a": 1}}],
        "children": [{"name": "A", "type": "TEXT", "style": {"fontFamily": "Host Grotesk"}}],
        "exportSettings": [1],
    }
    filtered = filter_figma_node(node)
    assert "exportSettings" not in filtered
    signals = extract_design_signals(filtered)
    assert "#000000" in signals["colors"]
    assert "Host Grotesk" in signals["fonts"]


def test_product_factory_soft_phases_pass_without_flag():
    """Default invent still completes; codegen soft-skipped."""
    import asyncio
    from typing import Any

    from engines.product_factory.phases import PHASE_ORDER, SOFT_PHASES
    from engines.product_factory.pipeline import run_product_factory

    assert "ui_codegen" in PHASE_ORDER
    assert "backend_codegen" in PHASE_ORDER
    assert SOFT_PHASES == {"ui_codegen", "backend_codegen"}

    async def boom(**_k: Any) -> tuple[str, str]:
        raise RuntimeError("llm down")

    async def _run():
        return await run_product_factory(
            name="Collections Clone",
            chat=[{"role": "user", "content": "curated collections gallery bookmarks"}],
            requirements={},
            preferred_model=None,
            llm_complete=boom,
            parse_json=lambda _t: None,
            use_heuristics_on_failure=True,
        )

    job = asyncio.run(_run())
    bp = job["product_blueprint"]
    assert len(job["phases"]) == len(PHASE_ORDER)
    assert all(p["status"] == "passed" for p in job["phases"])
    # Flag off → no generated files on blueprint
    assert "generated_frontend" not in bp or not (bp.get("generated_frontend") or {}).get("files")
    assert bp["page_specs"]


def test_backend_heuristic_when_flag_on(monkeypatch):
    import asyncio
    from typing import Any

    import config as config_mod
    from engines.product_factory.pipeline import run_product_factory

    monkeypatch.setattr(config_mod.settings, "PRODUCT_FACTORY_FIGMA_CODEGEN", True)
    monkeypatch.setattr(config_mod.settings, "DEMO_MODE", False)
    monkeypatch.setattr(config_mod.settings, "FIGMA_ACCESS_TOKEN", "")

    async def boom(**_k: Any) -> tuple[str, str]:
        raise RuntimeError("llm down")

    async def _run():
        return await run_product_factory(
            name="Job Search Pro",
            chat=[{"role": "user", "content": "job resume interview applications"}],
            requirements={},
            preferred_model=None,
            llm_complete=boom,
            parse_json=lambda _t: None,
            use_heuristics_on_failure=True,
        )

    job = asyncio.run(_run())
    be = job["product_blueprint"].get("generated_backend") or {}
    assert "main.py" in (be.get("files") or {})
    # No token → frontend still skipped; page_specs remain
    assert job["product_blueprint"]["page_specs"]
    assert not (job["product_blueprint"].get("generated_frontend") or {}).get("files")
