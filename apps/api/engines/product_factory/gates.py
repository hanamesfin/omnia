"""Hard quality gates between Product Factory phases."""

from __future__ import annotations

from typing import Any

# Ban generic template aesthetics the plan forbids.
_BANNED_PERSONALITIES = {"generic", "default", "template", "purple", "basic"}
_BANNED_FONTS = {"inter", "roboto", "arial", "system", "system-ui"}
_BANNED_COLORS = {"#6366f1", "#8b5cf6", "#7c3aed", "#a855f7", "#4f46e5"}


def gate_phase(phase_id: str, workspace: dict[str, Any]) -> tuple[bool, list[str]]:
    """Return (passed, failure_messages)."""
    failures: list[str] = []

    if phase_id == "classify":
        if not str(workspace.get("product_type") or "").strip():
            failures.append("product_type is required")
        if not str(workspace.get("daily_workflow") or "").strip():
            failures.append("daily_workflow is required")
        if not str(workspace.get("ai_core_role") or "").strip():
            failures.append("ai_core_role is required")

    elif phase_id == "strategy":
        if not str(workspace.get("uvp") or "").strip():
            failures.append("uvp is required")
        users = workspace.get("target_users") or []
        if not isinstance(users, list) or len(users) < 1:
            failures.append("at least one target_user is required")
        if not str(workspace.get("problem_worth_solving") or "").strip():
            failures.append("problem_worth_solving is required")

    elif phase_id == "prd":
        prd = workspace.get("prd") or {}
        if not isinstance(prd, dict):
            failures.append("prd must be an object")
        else:
            fr = prd.get("functional_requirements") or []
            if not isinstance(fr, list) or len(fr) < 2:
                failures.append("prd needs at least 2 functional_requirements")
            if not (prd.get("goals") or prd.get("purpose")):
                failures.append("prd needs goals or purpose")

    elif phase_id == "ia":
        ia = workspace.get("information_architecture") or {}
        pages = ia.get("pages") if isinstance(ia, dict) else []
        nav = ia.get("nav") if isinstance(ia, dict) else []
        if not isinstance(pages, list) or len(pages) < 3:
            failures.append("IA needs at least 3 pages")
        if not isinstance(nav, list) or len(nav) < 3:
            failures.append("IA needs at least 3 nav items")
        page_ids = {str(p.get("id")) for p in pages if isinstance(p, dict)}
        for item in nav or []:
            if isinstance(item, dict):
                nid = str(item.get("id") or "")
                if nid and nid not in page_ids:
                    failures.append(f"nav item '{nid}' not in page inventory")
        # Reject hardcoded generic-only nav
        labels = " ".join(
            str(p.get("label") or p.get("id") or "").lower()
            for p in (pages or [])
            if isinstance(p, dict)
        )
        if set(labels.split()) <= {"home", "dashboard", "settings"} and len(pages) <= 3:
            failures.append("nav is too generic — derive from daily workflow")

    elif phase_id == "design_system":
        ds = workspace.get("design_system") or {}
        personality = str(ds.get("personality") or "").strip().lower()
        if not personality or personality in _BANNED_PERSONALITIES:
            failures.append("design_system needs a distinctive personality")
        tokens = ds.get("tokens") if isinstance(ds, dict) else {}
        if not isinstance(tokens, dict) or not tokens.get("colors"):
            failures.append("design_system tokens.colors required")
        else:
            colors = tokens.get("colors") or {}
            if isinstance(colors, dict):
                for val in colors.values():
                    if str(val).strip().lower() in _BANNED_COLORS:
                        failures.append("avoid generic purple template colors")
                        break
        typo = (tokens or {}).get("typography") if isinstance(tokens, dict) else {}
        if isinstance(typo, dict):
            for key in ("font_sans", "font_display", "family", "sans"):
                font = str(typo.get(key) or "").strip().lower()
                if font and any(b in font for b in _BANNED_FONTS):
                    failures.append("avoid default Inter/Roboto/Arial stacks")
                    break

    elif phase_id == "page_ux":
        ia = workspace.get("information_architecture") or {}
        nav = ia.get("nav") if isinstance(ia, dict) else []
        specs = workspace.get("page_specs") or {}
        deferred = {str(d) for d in (workspace.get("deferred_pages") or [])}
        if not isinstance(specs, dict) or len(specs) < 1:
            failures.append("page_specs required")
        for item in nav or []:
            if not isinstance(item, dict):
                continue
            nid = str(item.get("id") or "")
            if nid and nid not in specs and nid not in deferred:
                failures.append(f"missing page_spec for nav leaf '{nid}'")

    elif phase_id == "ui_codegen":
        # Soft gate: always pass. Empty generated_frontend means skipped/fallback.
        pass

    elif phase_id == "architecture":
        arch = workspace.get("architecture") or {}
        if not isinstance(arch, dict):
            failures.append("architecture required")
        else:
            if not (arch.get("modules") or arch.get("entities")):
                failures.append("architecture needs modules or entities")
            if not str(arch.get("ai_core_integration") or "").strip():
                failures.append("architecture needs ai_core_integration")

    elif phase_id == "backend_codegen":
        # Soft gate: always pass. Missing scaffold is fine when flag/token off.
        pass

    elif phase_id == "ai_core":
        core = workspace.get("ai_core") or {}
        if not isinstance(core, dict):
            failures.append("ai_core required")
        else:
            prompt = str(core.get("system_prompt") or "").strip()
            if len(prompt.split()) < 80:
                failures.append("system_prompt too short (<80 words)")
            iface = core.get("interface_schema") or {}
            mode = str(iface.get("mode") or "").lower() if isinstance(iface, dict) else ""
            fields = iface.get("input_fields") if isinstance(iface, dict) else None
            if mode != "chat" and (not isinstance(fields, list) or len(fields) < 1):
                failures.append("non-chat AI surface needs input_fields")
            if not str(core.get("specialty") or "").strip():
                failures.append("ai_core specialty required")

    return (len(failures) == 0, failures)
