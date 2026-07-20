"""Resend email delivery — credentials remain on the API server."""
from __future__ import annotations

import re
from typing import Any

import httpx
import structlog

from config import settings

log = structlog.get_logger(__name__)

RESEND_EMAILS_URL = "https://api.resend.com/emails"
EMAIL_TIMEOUT = 30.0
MAX_RECIPIENTS = 20
MAX_SUBJECT_CHARS = 998
MAX_BODY_CHARS = 200_000
_EMAIL_RE = re.compile(r"^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$")


class ResendEmailError(Exception):
    """Safe, user-facing email delivery failure."""


def resend_configured() -> bool:
    return bool((settings.RESEND_API_KEY or "").strip() and (settings.EMAIL_FROM or "").strip())


def _normalize_recipients(value: str | list[str], field: str) -> list[str]:
    raw = [value] if isinstance(value, str) else list(value or [])
    recipients = [str(item).strip() for item in raw if str(item).strip()]
    if not recipients:
        raise ResendEmailError(f"{field} requires at least one email address.")
    if len(recipients) > MAX_RECIPIENTS:
        raise ResendEmailError(f"{field} supports at most {MAX_RECIPIENTS} recipients.")
    invalid = [address for address in recipients if not _EMAIL_RE.match(address)]
    if invalid:
        raise ResendEmailError(f"Invalid email address in {field}.")
    return recipients


async def send_resend_email(
    *,
    to: str | list[str],
    subject: str,
    html: str | None = None,
    text: str | None = None,
    cc: str | list[str] | None = None,
    reply_to: str | None = None,
) -> dict[str, Any]:
    """Send one confirmed email through Resend."""
    key = (settings.RESEND_API_KEY or "").strip()
    sender = (settings.EMAIL_FROM or "").strip()
    if not key or not sender:
        raise ResendEmailError("Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.")

    recipients = _normalize_recipients(to, "to")
    clean_subject = (subject or "").strip()
    if not clean_subject:
        raise ResendEmailError("Email subject is required.")
    if len(clean_subject) > MAX_SUBJECT_CHARS:
        raise ResendEmailError("Email subject is too long.")

    clean_html = (html or "").strip()
    clean_text = (text or "").strip()
    if not clean_html and not clean_text:
        raise ResendEmailError("Email body is required.")
    if len(clean_html) + len(clean_text) > MAX_BODY_CHARS:
        raise ResendEmailError("Email body is too long.")

    payload: dict[str, Any] = {
        "from": sender,
        "to": recipients,
        "subject": clean_subject,
    }
    if clean_html:
        payload["html"] = clean_html
    if clean_text:
        payload["text"] = clean_text
    if cc:
        payload["cc"] = _normalize_recipients(cc, "cc")
    if reply_to:
        payload["reply_to"] = _normalize_recipients(reply_to, "reply_to")[0]

    async with httpx.AsyncClient(timeout=EMAIL_TIMEOUT) as client:
        response = await client.post(
            RESEND_EMAILS_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if response.status_code >= 400:
        try:
            detail = str((response.json() or {}).get("message") or "Resend rejected the email.")
        except Exception:
            detail = "Resend rejected the email."
        log.warning("resend_email.failed", status=response.status_code, detail=detail[:200])
        raise ResendEmailError(detail)

    data = response.json()
    return {
        "id": str(data.get("id") or ""),
        "provider": "resend",
        "to": recipients,
        "subject": clean_subject,
        "status": "sent",
    }
