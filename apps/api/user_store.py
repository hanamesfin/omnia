"""
Durable user store backed by Upstash Redis (REST).

Serverless instances on Vercel do not share memory or disk, so accounts created
on one instance vanish on another — which previously made returning-user sign-in
fail (and, before the fix, silently fell back to a demo admin). This module
persists user records to Upstash so register/login work across every instance.

Falls back to a no-op when Upstash is not configured (local dev uses the
in-memory STORE), so nothing breaks without the env vars.

Configure with either Upstash-native or Vercel KV names:
  UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
  KV_REST_API_URL        / KV_REST_API_TOKEN
"""
from __future__ import annotations

import json
from typing import Any

import structlog

from config import settings

log = structlog.get_logger()

_EMAIL_KEY = "omnia:user:email:{email}"
_ID_KEY = "omnia:user:id:{uid}"


def _config() -> tuple[str, str] | None:
    url = (settings.UPSTASH_REDIS_REST_URL or settings.KV_REST_API_URL or "").strip().rstrip("/")
    token = (settings.UPSTASH_REDIS_REST_TOKEN or settings.KV_REST_API_TOKEN or "").strip()
    if not url or not token:
        return None
    return url, token


def enabled() -> bool:
    return _config() is not None


async def _command(*args: str) -> Any:
    """Run a single Redis command via the Upstash REST endpoint."""
    cfg = _config()
    if not cfg:
        return None
    url, token = cfg
    import httpx

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {token}"},
                json=list(args),
            )
        if resp.status_code != 200:
            log.warning("user_store.http_error", status=resp.status_code)
            return None
        return resp.json().get("result")
    except Exception as exc:  # never let persistence break auth
        log.warning("user_store.command_failed", error=str(exc)[:200])
        return None


def _norm_email(email: str) -> str:
    return (email or "").strip().lower()


async def get_user_by_email(email: str) -> dict | None:
    raw = await _command("GET", _EMAIL_KEY.format(email=_norm_email(email)))
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return None


async def get_user_by_id(uid: str) -> dict | None:
    raw = await _command("GET", _ID_KEY.format(uid=uid))
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return None


async def save_user(user: dict) -> None:
    """Persist under both email and id keys. Best-effort; safe if Upstash is off."""
    if not enabled():
        return
    payload = json.dumps(user, default=str)
    email = _norm_email(str(user.get("email") or ""))
    uid = str(user.get("id") or "")
    if email:
        await _command("SET", _EMAIL_KEY.format(email=email), payload)
    if uid:
        await _command("SET", _ID_KEY.format(uid=uid), payload)
