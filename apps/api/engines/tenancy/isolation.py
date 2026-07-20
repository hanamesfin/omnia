"""
Enterprise tenant isolation helpers.

Phase 1 (shipped): namespaced Redis keys + schema name helpers.
Phase 2 (ops): create schema-per-tenant in Postgres — see docs.
"""
from __future__ import annotations

import re


_SAFE = re.compile(r"[^a-z0-9_]+")


def normalize_tenant_id(raw: str | None) -> str:
    tid = _SAFE.sub("_", (raw or "public").strip().lower()).strip("_")
    return tid or "public"


def redis_key(tenant_id: str, *parts: str) -> str:
    """Namespace Redis keys: omnia:{tenant}:{…}"""
    tid = normalize_tenant_id(tenant_id)
    rest = ":".join(str(p) for p in parts if p is not None and str(p) != "")
    return f"omnia:{tid}:{rest}" if rest else f"omnia:{tid}"


def postgres_schema_name(tenant_id: str) -> str:
    """
    Schema-per-tenant name. Enterprise orgs get dedicated schemas;
    Normal/demo stay on `public`.
    """
    tid = normalize_tenant_id(tenant_id)
    if tid in ("public", "demo", "default"):
        return "public"
    return f"tenant_{tid[:48]}"


def search_path_sql(tenant_id: str) -> str:
    schema = postgres_schema_name(tenant_id)
    if schema == "public":
        return "SET search_path TO public"
    return f"SET search_path TO {schema}, public"
