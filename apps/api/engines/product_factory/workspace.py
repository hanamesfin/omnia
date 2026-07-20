"""Accumulating product factory workspace."""

from __future__ import annotations

from copy import deepcopy
from typing import Any


def empty_workspace(*, name: str = "", chat_summary: str = "") -> dict[str, Any]:
    return {
        "name": name,
        "chat_summary": chat_summary,
        "product_type": "",
        "platform": "web",
        "ai_core_role": "",
        "daily_workflow": "",
        "uvp": "",
        "target_users": [],
        "problem_worth_solving": "",
        "market_notes": "",
        "prd": {},
        "information_architecture": {"pages": [], "nav": []},
        "design_system": {"personality": "", "tokens": {}},
        "page_specs": {},
        "architecture": {},
        "ai_core": {},
        "phases": [],
        "deferred_pages": [],
    }


def merge_phase_output(workspace: dict[str, Any], phase_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Merge specialist JSON into the workspace."""
    ws = deepcopy(workspace)
    if not isinstance(data, dict):
        return ws

    # Flat string/list fields
    for key in (
        "product_type",
        "platform",
        "ai_core_role",
        "daily_workflow",
        "uvp",
        "problem_worth_solving",
        "market_notes",
    ):
        if key in data and data[key] not in (None, ""):
            ws[key] = data[key]

    if isinstance(data.get("target_users"), list) and data["target_users"]:
        ws["target_users"] = [str(u)[:120] for u in data["target_users"][:8]]

    if phase_id == "prd" or "prd" in data:
        prd = data.get("prd") if isinstance(data.get("prd"), dict) else data
        if isinstance(prd, dict) and (prd.get("goals") or prd.get("functional_requirements") or prd.get("purpose")):
            ws["prd"] = {
                "purpose": str(prd.get("purpose") or ws.get("uvp") or "")[:400],
                "goals": list(prd.get("goals") or [])[:12],
                "functional_requirements": list(prd.get("functional_requirements") or [])[:24],
                "non_functional_requirements": list(prd.get("non_functional_requirements") or [])[:16],
                "constraints": list(prd.get("constraints") or [])[:16],
                "success_metrics": list(prd.get("success_metrics") or [])[:12],
            }

    if phase_id == "ia" or "information_architecture" in data or "pages" in data:
        ia = data.get("information_architecture") if isinstance(data.get("information_architecture"), dict) else data
        pages = ia.get("pages") if isinstance(ia, dict) else None
        nav = ia.get("nav") if isinstance(ia, dict) else None
        if isinstance(pages, list) or isinstance(nav, list):
            ws["information_architecture"] = {
                "pages": _normalize_pages(pages or []),
                "nav": _normalize_nav(nav or pages or []),
            }
        if isinstance(data.get("deferred_pages"), list):
            ws["deferred_pages"] = [str(p)[:80] for p in data["deferred_pages"][:20]]

    if phase_id == "design_system" or "design_system" in data or "personality" in data:
        ds = data.get("design_system") if isinstance(data.get("design_system"), dict) else data
        if isinstance(ds, dict):
            tokens = ds.get("tokens") if isinstance(ds.get("tokens"), dict) else {}
            ws["design_system"] = {
                "personality": str(ds.get("personality") or "")[:80],
                "emotional_goals": list(ds.get("emotional_goals") or [])[:6],
                "references": list(ds.get("references") or [])[:6],
                "tokens": {
                    "colors": dict(tokens.get("colors") or ds.get("colors") or {}),
                    "typography": dict(tokens.get("typography") or ds.get("typography") or {}),
                    "spacing": dict(tokens.get("spacing") or ds.get("spacing") or {}),
                    "radius": str(tokens.get("radius") or ds.get("radius") or "0.75rem"),
                    "motion": dict(tokens.get("motion") or ds.get("motion") or {}),
                    "shadow": str(tokens.get("shadow") or ds.get("shadow") or "none"),
                },
            }

    if phase_id == "page_ux" or "page_specs" in data:
        specs = data.get("page_specs") if isinstance(data.get("page_specs"), dict) else None
        if specs is None and isinstance(data.get("pages"), list):
            specs = {}
            for item in data["pages"]:
                if isinstance(item, dict) and item.get("id"):
                    specs[str(item["id"])] = item
        if isinstance(specs, dict):
            cleaned: dict[str, Any] = {}
            for pid, spec in list(specs.items())[:16]:
                if not isinstance(spec, dict):
                    continue
                cleaned[str(pid)[:64]] = {
                    "purpose": str(spec.get("purpose") or "")[:300],
                    "primary_users": list(spec.get("primary_users") or [])[:4],
                    "primary_actions": list(spec.get("primary_actions") or [])[:8],
                    "secondary_actions": list(spec.get("secondary_actions") or [])[:6],
                    "empty_state": str(spec.get("empty_state") or "")[:200],
                    "loading_state": str(spec.get("loading_state") or "")[:120],
                    "error_state": str(spec.get("error_state") or "")[:120],
                    "ai_powered": bool(spec.get("ai_powered", False)),
                    "accessibility": str(spec.get("accessibility") or "")[:200],
                }
            ws["page_specs"] = cleaned

    if phase_id == "architecture" or "architecture" in data:
        arch = data.get("architecture") if isinstance(data.get("architecture"), dict) else data
        if isinstance(arch, dict) and (arch.get("modules") or arch.get("entities")):
            ws["architecture"] = {
                "modules": list(arch.get("modules") or [])[:16],
                "entities": list(arch.get("entities") or [])[:20],
                "integrations": list(arch.get("integrations") or [])[:12],
                "ai_core_integration": str(arch.get("ai_core_integration") or "")[:400],
            }

    if phase_id == "ai_core" or "ai_core" in data or "system_prompt" in data:
        core = data.get("ai_core") if isinstance(data.get("ai_core"), dict) else data
        if isinstance(core, dict) and (
            core.get("system_prompt") or core.get("specialty") or core.get("interface_schema")
        ):
            ws["ai_core"] = {
                "specialty": str(core.get("specialty") or "")[:200],
                "domain": str(core.get("domain") or "general")[:40],
                "kind": str(core.get("kind") or "custom")[:80],
                "tone": str(core.get("tone") or "clear")[:80],
                "capabilities": list(core.get("capabilities") or [])[:12],
                "constraints": list(core.get("constraints") or [])[:12],
                "tools": list(core.get("tools") or [])[:16],
                "mcp_servers": list(core.get("mcp_servers") or [])[:12],
                "system_prompt": str(core.get("system_prompt") or "")[:12000],
                "interface_schema": dict(core.get("interface_schema") or {})
                if isinstance(core.get("interface_schema"), dict)
                else {},
                "capability_tier": str(core.get("capability_tier") or "specialist")[:40],
            }

    return ws


def _normalize_pages(pages: list[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in pages:
        if isinstance(item, str):
            pid = item.strip().lower().replace(" ", "_")[:64]
            label = item.strip()[:80]
            if not pid or pid in seen:
                continue
            seen.add(pid)
            out.append({"id": pid, "label": label or pid, "ai_powered": False})
        elif isinstance(item, dict):
            pid = str(item.get("id") or item.get("slug") or item.get("label") or "").strip().lower().replace(" ", "_")[:64]
            if not pid or pid in seen:
                continue
            seen.add(pid)
            out.append(
                {
                    "id": pid,
                    "label": str(item.get("label") or pid)[:80],
                    "ai_powered": bool(item.get("ai_powered", False)),
                    "description": str(item.get("description") or "")[:200],
                }
            )
        if len(out) >= 20:
            break
    return out


def _normalize_nav(nav: list[Any]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in nav:
        if isinstance(item, str):
            pid = item.strip().lower().replace(" ", "_")[:64]
            label = item.strip()[:80]
        elif isinstance(item, dict):
            pid = str(item.get("id") or item.get("page_id") or item.get("label") or "").strip().lower().replace(" ", "_")[:64]
            label = str(item.get("label") or pid)[:80]
        else:
            continue
        if not pid or pid in seen:
            continue
        seen.add(pid)
        out.append({"id": pid, "label": label or pid})
        if len(out) >= 14:
            break
    return out


def to_product_blueprint(workspace: dict[str, Any]) -> dict[str, Any]:
    return {
        "product_type": workspace.get("product_type") or "",
        "platform": workspace.get("platform") or "web",
        "ai_core_role": workspace.get("ai_core_role") or "",
        "daily_workflow": workspace.get("daily_workflow") or "",
        "uvp": workspace.get("uvp") or "",
        "target_users": list(workspace.get("target_users") or []),
        "problem_worth_solving": workspace.get("problem_worth_solving") or "",
        "prd": dict(workspace.get("prd") or {}),
        "information_architecture": dict(workspace.get("information_architecture") or {"pages": [], "nav": []}),
        "design_system": dict(workspace.get("design_system") or {}),
        "page_specs": dict(workspace.get("page_specs") or {}),
        "architecture": dict(workspace.get("architecture") or {}),
        "deferred_pages": list(workspace.get("deferred_pages") or []),
        "phases": list(workspace.get("phases") or []),
    }
