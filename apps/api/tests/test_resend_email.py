from __future__ import annotations

import asyncio

from config import settings
from engines.tools.executor import ToolContext, execute_tool
from engines.tools.resend_email import ResendEmailError, send_resend_email


def test_send_email_requires_runtime_confirmation():
    result = asyncio.run(
        execute_tool(
            "send_email",
            {
                "to": "person@example.com",
                "subject": "Hello",
                "text": "Test",
            },
            ctx=ToolContext(user_id="user", uploads={}),
        )
    )
    assert "Confirmation required" in result


def test_resend_email_validates_recipient(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test")
    monkeypatch.setattr(settings, "EMAIL_FROM", "S P <sender@example.com>")

    try:
        asyncio.run(
            send_resend_email(
                to="not-an-email",
                subject="Hello",
                text="Test",
            )
        )
    except ResendEmailError as exc:
        assert "Invalid email address" in str(exc)
    else:
        raise AssertionError("Invalid recipient should fail")


def test_resend_email_sends_expected_payload(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test")
    monkeypatch.setattr(settings, "EMAIL_FROM", "S P <sender@example.com>")
    captured = {}

    class Response:
        status_code = 200

        @staticmethod
        def json():
            return {"id": "email_123"}

    class Client:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, url, *, headers, json):
            captured.update({"url": url, "headers": headers, "json": json})
            return Response()

    monkeypatch.setattr("engines.tools.resend_email.httpx.AsyncClient", Client)
    result = asyncio.run(
        send_resend_email(
            to="person@example.com",
            subject="Hello",
            text="Test body",
        )
    )

    assert result["id"] == "email_123"
    assert result["status"] == "sent"
    assert captured["json"] == {
        "from": "S P <sender@example.com>",
        "to": ["person@example.com"],
        "subject": "Hello",
        "text": "Test body",
    }
    assert captured["headers"]["Authorization"] == "Bearer re_test"
