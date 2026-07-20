"""Google Cloud Translation API (v2) — detect + translate."""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from config import settings

log = structlog.get_logger(__name__)

TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"
DETECT_URL = "https://translation.googleapis.com/language/translate/v2/detect"
LANGUAGES_URL = "https://translation.googleapis.com/language/translate/v2/languages"


class TranslateError(Exception):
    """User-facing translate failure."""


def translate_api_key() -> str:
    """Prefer dedicated translate key; fall back to Google AI key."""
    return (settings.GOOGLE_TRANSLATE_API_KEY or settings.GOOGLE_API_KEY or "").strip()


def translate_configured() -> bool:
    return bool(translate_api_key())


async def google_translate(
    text: str,
    *,
    target: str,
    source: str | None = None,
    format: str = "text",
) -> dict[str, Any]:
    """
    Translate text via Google Cloud Translation API v2.
    Returns {translated_text, detected_source_language, target}.
    """
    key = translate_api_key()
    if not key:
        raise TranslateError(
            "Google Translate is not configured. Set GOOGLE_TRANSLATE_API_KEY "
            "(or GOOGLE_API_KEY) in the API .env."
        )
    q = (text or "").strip()
    if not q:
        raise TranslateError("Nothing to translate.")
    tgt = (target or "").strip().lower()
    if not tgt:
        raise TranslateError("target language is required (e.g. en, es, ar, zh).")
    if len(q) > 45000:
        raise TranslateError("Text too long (max ~45k characters per request).")

    payload: dict[str, Any] = {"q": q, "target": tgt, "format": format if format in ("text", "html") else "text"}
    src = (source or "").strip().lower()
    if src and src not in ("auto", "detect"):
        payload["source"] = src

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(TRANSLATE_URL, params={"key": key}, json=payload)
    if r.status_code >= 400:
        detail = _error_detail(r)
        log.warning("google_translate.failed", status=r.status_code, detail=detail[:200])
        raise TranslateError(detail)

    data = r.json().get("data") or {}
    translations = data.get("translations") or []
    if not translations:
        raise TranslateError("Empty translation response from Google.")
    row = translations[0]
    return {
        "translated_text": str(row.get("translatedText") or ""),
        "detected_source_language": str(row.get("detectedSourceLanguage") or src or ""),
        "target": tgt,
        "provider": "google_cloud_translation_v2",
    }


async def google_detect_language(text: str) -> dict[str, Any]:
    key = translate_api_key()
    if not key:
        raise TranslateError(
            "Google Translate is not configured. Set GOOGLE_TRANSLATE_API_KEY "
            "(or GOOGLE_API_KEY) in the API .env."
        )
    q = (text or "").strip()
    if not q:
        raise TranslateError("Nothing to detect.")
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(DETECT_URL, params={"key": key}, json={"q": q[:5000]})
    if r.status_code >= 400:
        raise TranslateError(_error_detail(r))
    detections = ((r.json().get("data") or {}).get("detections") or [[]])[0]
    if not detections:
        return {"language": "", "confidence": 0.0}
    top = detections[0]
    return {
        "language": str(top.get("language") or ""),
        "confidence": float(top.get("confidence") or 0.0),
        "provider": "google_cloud_translation_v2",
    }


def _error_detail(r: httpx.Response) -> str:
    try:
        body = r.json()
        err = body.get("error") or {}
        msg = err.get("message") or r.text
        return f"Google Translate error ({r.status_code}): {msg}"
    except Exception:
        return f"Google Translate error ({r.status_code}): {r.text[:300]}"
