"""Tests for E2B sandbox utilities (Piston fallback + helpers)."""
from __future__ import annotations

import asyncio
import json

from sandbox_utils import (
    E2bSandboxSession,
    format_result_text,
    run_python_code_piston,
    slim_result_for_llm,
)


def test_slim_result_for_llm_strips_image_payloads():
    data = {
        "success": True,
        "stdout": "ok",
        "images": ["base64data"],
    }
    slim = slim_result_for_llm(data)
    assert slim["images"] == ["[chart 1 rendered for the user]"]
    assert slim["stdout"] == "ok"


def test_format_result_text_success():
    text = format_result_text(
        {
            "success": True,
            "sandbox": "piston",
            "stdout": "42",
            "images": ["x"],
        }
    )
    assert "sandbox=piston" in text
    assert "42" in text
    assert "charts: 1 image(s)" in text


def test_format_result_text_error():
    text = format_result_text(
        {
            "success": False,
            "error_name": "SyntaxError",
            "error_value": "invalid syntax",
            "traceback": "line 1",
        }
    )
    assert "SyntaxError" in text
    assert "invalid syntax" in text


def test_piston_fallback_returns_json_shape(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"run": {"stdout": "omnia\n", "stderr": "", "code": 0}}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, json):
            return FakeResponse()

    monkeypatch.setattr("sandbox_utils.httpx.AsyncClient", lambda **kwargs: FakeClient())

    data = asyncio.run(run_python_code_piston("print('omnia')"))
    assert data.get("success") is True
    assert data.get("sandbox") == "piston"
    assert "omnia" in (data.get("stdout") or "")


def test_e2b_session_available_flag_without_key(monkeypatch):
    monkeypatch.setattr("sandbox_utils.settings.E2B_API_KEY", "")
    session = E2bSandboxSession()
    assert session.available is False


def test_dumps_roundtrip_fields():
    payload = {
        "success": True,
        "sandbox": "e2b",
        "stdout": "hi",
        "stderr": "",
        "images": [],
        "result_text": None,
    }
    raw = json.dumps(payload)
    parsed = json.loads(raw)
    assert parsed["sandbox"] == "e2b"
