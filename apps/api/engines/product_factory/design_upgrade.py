"""
Retroactively apply Builder's Blueprint / Base44-style design strategy
to existing catalog agents (seeds + persisted STORE).

Heuristic-only path — works without FIGMA tokens:
  classify_design_intent → find_best_figma_template → distinctive design_system
Never forces Collections/Trove unless the agent is the Trove seed / curation match.
"""

from __future__ import annotations

from typing import Any

STRATEGY_MIGRATION = {"source": "design_strategy_v1", "version": 2}

_GENERIC_PERSONALITIES = frozenset(
    {
        "",
        "focused, capable, and clear",
        "distinctive_utility",
        "professional",
        "clear",
        "capable",
    }
)

_LEGACY_SOURCES = frozenset({"legacy_agent", "legacy", ""})


def is_collections_agent(agent: dict[str, Any]) -> bool:
    """True only for Trove / Collections products — keep their DS intact."""
    name = str(agent.get("name") or "").strip().lower()
    aid = str(agent.get("id") or "").strip().lower()
    if name == "trove" or aid in {"agent-seed-trove", "demo"}:
        return True
    bp = agent.get("product_blueprint") or {}
    if not isinstance(bp, dict):
        return False
    pt = str(bp.get("product_type") or "").lower()
    ds = bp.get("design_system") if isinstance(bp.get("design_system"), dict) else {}
    personality = str(ds.get("personality") or "").lower()
    if "collections" in pt or personality == "curated_calm":
        return True
    return False


def _has_color_tokens(bp: dict[str, Any]) -> bool:
    ds = bp.get("design_system") if isinstance(bp.get("design_system"), dict) else {}
    tokens = ds.get("tokens") if isinstance(ds.get("tokens"), dict) else {}
    colors = tokens.get("colors") if isinstance(tokens.get("colors"), dict) else {}
    return bool(colors.get("bg") and (colors.get("accent") or colors.get("fg")))


def _has_design_match(bp: dict[str, Any]) -> bool:
    dm = bp.get("design_match") if isinstance(bp.get("design_match"), dict) else {}
    return bool(dm.get("template_id") or dm.get("archetype"))


def _ia_page_count(bp: dict[str, Any]) -> int:
    ia = bp.get("information_architecture") if isinstance(bp.get("information_architecture"), dict) else {}
    pages = ia.get("pages") or []
    nav = ia.get("nav") or []
    return max(
        len(pages) if isinstance(pages, list) else 0,
        len(nav) if isinstance(nav, list) else 0,
    )


def _migration_source(bp: dict[str, Any]) -> str:
    mig = bp.get("migration") if isinstance(bp.get("migration"), dict) else {}
    return str(mig.get("source") or "").strip().lower()


def needs_design_strategy_upgrade(agent: dict[str, Any]) -> bool:
    """
    Weak / legacy / generic blueprints need strategy upgrade.
    Collections/Trove never auto-rewritten here (caller keeps them intact).
    """
    if is_collections_agent(agent):
        bp = agent.get("product_blueprint") or {}
        # Ensure design_match is present on Trove for Discover cues; otherwise skip.
        if isinstance(bp, dict) and bp.get("product_type") == "Collections App" and _has_design_match(bp):
            return False
        if isinstance(bp, dict) and bp.get("product_type") == "Collections App":
            return True  # attach design_match only
        return True

    bp = agent.get("product_blueprint")
    if not isinstance(bp, dict) or not bp:
        return True

    src = _migration_source(bp)
    if src in _LEGACY_SOURCES or src == "legacy_agent":
        return True
    if src == STRATEGY_MIGRATION["source"] and int(bp.get("migration", {}).get("version") or 0) >= 2:
        if _has_color_tokens(bp) and _has_design_match(bp):
            return False

    ds = bp.get("design_system") if isinstance(bp.get("design_system"), dict) else {}
    personality = str(ds.get("personality") or "").strip().lower()
    if personality in _GENERIC_PERSONALITIES:
        return True
    if not _has_color_tokens(bp):
        return True
    if not _has_design_match(bp):
        return True
    if _ia_page_count(bp) < 2:
        return True
    return False


def _agent_prompt_blob(agent: dict[str, Any]) -> str:
    parts = [
        str(agent.get("name") or ""),
        str(agent.get("specialty") or ""),
        str(agent.get("domain") or ""),
        str(agent.get("kind") or ""),
        str((agent.get("spec") or {}).get("role") or ""),
        str(agent.get("prompt_text") or "")[:800],
    ]
    return "\n".join(p for p in parts if p).strip()


def _design_system_from_match(
    design_match: dict[str, Any],
    *,
    name: str,
    specialty: str,
    family_ds: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Merge matcher token_hints / style into a distinctive standalone design_system."""
    base = dict(family_ds or {})
    hints = design_match.get("token_hints") if isinstance(design_match.get("token_hints"), dict) else {}
    base_tokens = base.get("tokens") if isinstance(base.get("tokens"), dict) else {}
    base_colors = dict(base_tokens.get("colors") or {})
    base_typo = dict(base_tokens.get("typography") or {})

    bg = str(hints.get("bg") or base_colors.get("bg") or "#f6f5f2")
    fg = str(hints.get("fg") or base_colors.get("fg") or "#141414")
    accent = str(hints.get("accent") or base_colors.get("accent") or fg)
    muted = str(hints.get("muted") or base_colors.get("muted") or "#6b6b6b")
    surface = str(hints.get("surface") or base_colors.get("surface") or "#ffffff")
    border = str(base_colors.get("border") or "rgba(20,20,20,0.1)")

    font_display = str(
        hints.get("font_display") or base_typo.get("font_display") or "Fraunces"
    )
    font_sans = str(hints.get("font_sans") or base_typo.get("font_sans") or "DM Sans")
    font_mono = str(hints.get("font_mono") or base_typo.get("font_mono") or "IBM Plex Mono")

    mood = str(design_match.get("mood") or "").strip()
    archetype = str(design_match.get("archetype") or "product").strip()
    tags = [str(t) for t in (design_match.get("style_tags") or [])[:4]]
    personality = str(base.get("personality") or "").strip()
    if not personality or personality.lower() in _GENERIC_PERSONALITIES:
        tag_bit = tags[0] if tags else "utility"
        mood_bit = mood or "focused"
        personality = f"{mood_bit}_{tag_bit}"[:80]

    refs = list(base.get("references") or [])
    for r in design_match.get("reference_descriptors") or []:
        if r and r not in refs:
            refs.append(str(r)[:120])
    for app in design_match.get("reference_apps") or []:
        line = f"{app} — borrowed restraint"
        if line not in refs:
            refs.append(line[:120])
    # Never leak Collections refs onto non-curation products
    arch = archetype.lower()
    if arch != "gallery_curation":
        refs = [
            r
            for r in refs
            if "trove" not in r.lower() and "collections app" not in r.lower()
        ]

    goals = list(base.get("emotional_goals") or [])
    if mood and mood not in goals:
        goals = [mood, *goals][:6]
    if not goals:
        goals = ["clarity", "focus"]

    nav = str(hints.get("nav") or "bottom_pill")
    chrome = dict(base.get("chrome") or {})
    chrome.setdefault("mode", "standalone")
    chrome.setdefault("omnia_shell", False)
    chrome.setdefault("product_nav_only", True)
    chrome["nav_placement"] = str(chrome.get("nav_placement") or nav or "bottom_pill")[:32]
    chrome.setdefault("top_bar", "centered_brand")

    radius = base_tokens.get("radius") or "14px"
    if isinstance(radius, dict):
        radius_out = radius
    else:
        radius_out = {
            "media": "8px",
            "card": str(radius),
            "pill": "999px",
            "control": "0.625rem",
        }

    motion = dict(base_tokens.get("motion") or {})
    motion.setdefault("enter", "fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1)")
    motion.setdefault("micro", "140ms cubic-bezier(0.22, 1, 0.36, 1)")
    motion.setdefault("emphasis", "nav-pill layout spring")

    return {
        "personality": personality[:80],
        "emotional_goals": goals[:6],
        "references": refs[:6],
        "chrome": chrome,
        "tokens": {
            "colors": {
                "bg": bg,
                "fg": fg,
                "accent": accent,
                "muted": muted,
                "border": border,
                "surface": surface,
            },
            "typography": {
                "font_display": font_display,
                "font_sans": font_sans,
                "font_mono": font_mono,
            },
            "space": dict(base_tokens.get("space") or base_tokens.get("spacing") or {
                "unit": "4px",
                "gutter": "20px",
                "section": "2.5rem",
                "nav_pad": "34px",
            }),
            "spacing": dict(base_tokens.get("spacing") or {
                "unit": "4px",
                "gutter": "20px",
                "section": "2.5rem",
            }),
            "radius": radius_out,
            "motion": motion,
            "shadow": str(base_tokens.get("shadow") or "soft elevation"),
        },
        "match_summary": {
            "name": name[:80],
            "specialty": specialty[:160],
            "archetype": archetype[:64],
            "mood": mood[:64],
        },
    }


def _figma_template_blob(match: dict[str, Any], dm: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": match.get("id") or dm.get("template_id"),
        "file_key": match.get("file_key"),
        "node_id": match.get("node_id"),
        "domain": match.get("domain") or dm.get("domain"),
        "product_archetype": match.get("product_archetype") or dm.get("archetype"),
        "style_tags": list(match.get("style_tags") or dm.get("style_tags") or [])[:8],
        "score": match.get("score") or dm.get("score"),
        "match_method": match.get("match_method") or dm.get("match_method"),
        "match_reason": match.get("match_reason") or dm.get("rationale"),
        "placeholder": bool(match.get("placeholder")),
        "candidates": list(match.get("candidates") or dm.get("candidates") or [])[:4],
    }


def _family_for_agent(agent: dict[str, Any], design_match: dict[str, Any]) -> dict[str, Any]:
    from engines.product_factory.specialists import heuristic_phase

    name = str(agent.get("name") or "Agent")
    transcript = _agent_prompt_blob(agent)
    # Bias family inference with matcher archetype / domain
    hint = " ".join(
        [
            transcript,
            str(design_match.get("archetype") or ""),
            str(design_match.get("domain") or ""),
            str(design_match.get("function") or ""),
            " ".join(str(t) for t in (design_match.get("style_tags") or [])[:4]),
        ]
    )
    classify = heuristic_phase("classify", {}, name=name, transcript=hint)
    ia = heuristic_phase("ia", {**classify}, name=name, transcript=hint)
    ds = heuristic_phase("design_system", {**classify, **ia}, name=name, transcript=hint)
    page_ux = heuristic_phase("page_ux", {**classify, **ia}, name=name, transcript=hint)
    strategy = heuristic_phase("strategy", {**classify}, name=name, transcript=hint)
    return {
        **classify,
        **ia,
        **ds,
        **page_ux,
        **strategy,
    }


def _collections_design_match() -> tuple[dict[str, Any], dict[str, Any]]:
    from services.figma.matcher import find_best_figma_template

    match = find_best_figma_template(
        "Trove Collections App curated gallery masonry feed artworks quotes publications",
        domain="curation",
    )
    return match, match.get("design_match") or {}


def attach_collections_design_match(bp: dict[str, Any]) -> dict[str, Any]:
    """Keep Collections IA/DS; attach design_match for Discover cues."""
    out = dict(bp)
    if _has_design_match(out):
        mig = dict(out.get("migration") or {})
        mig.update(STRATEGY_MIGRATION)
        out["migration"] = mig
        return out
    match, dm = _collections_design_match()
    out["design_match"] = dm
    out["figma_template"] = _figma_template_blob(match, dm)
    out["migration"] = dict(STRATEGY_MIGRATION)
    return out


def strategy_product_blueprint(agent: dict[str, Any]) -> dict[str, Any]:
    """
    Build a distinctive product blueprint from name/specialty/domain via matcher.
    Does not force Collections unless agent is Trove / curation identity.
    """
    from services.figma.matcher import find_best_figma_template

    name = str(agent.get("name") or "AI Agent")
    specialty = str(agent.get("specialty") or agent.get("domain") or "AI assistant")
    domain = str(agent.get("domain") or "")

    if is_collections_agent(agent):
        # Caller should use Collections blueprint; this path is a safety net.
        match, dm = _collections_design_match()
        return {
            "product_type": "Collections App",
            "uvp": specialty,
            "daily_workflow": f"Browse and organize with {name}.",
            "design_match": dm,
            "figma_template": _figma_template_blob(match, dm),
            "migration": dict(STRATEGY_MIGRATION),
        }

    prompt = _agent_prompt_blob(agent)
    match = find_best_figma_template(prompt, domain=domain, top_k=4)
    dm = dict(match.get("design_match") or {})

    # Guard: never apply gallery_curation shell to non-Trove agents
    if str(dm.get("archetype") or "").lower() == "gallery_curation":
        # Re-match with anti-curation bias in prompt
        match = find_best_figma_template(
            f"{prompt}\nvertical saas workspace tool utility — not a gallery",
            domain=domain or "saas",
            top_k=4,
        )
        dm = dict(match.get("design_match") or {})
        if str(dm.get("archetype") or "").lower() == "gallery_curation":
            dm["archetype"] = "b2b_workspace"
            dm["template_id"] = "saas_workspace"

    family = _family_for_agent(agent, dm)
    # If family still returned Collections (keyword collision), force generic saas
    if str(family.get("product_type") or "").lower().startswith("collections"):
        from engines.product_factory.specialists import heuristic_phase

        family = {
            **heuristic_phase("classify", {}, name=name, transcript=f"{specialty} saas workspace tool"),
            **heuristic_phase("ia", {}, name=name, transcript=f"{specialty} saas workspace tool"),
            **heuristic_phase("design_system", {}, name=name, transcript=f"{specialty} saas workspace tool"),
            **heuristic_phase("page_ux", {}, name=name, transcript=f"{specialty} saas workspace tool"),
            **heuristic_phase("strategy", {}, name=name, transcript=f"{specialty} saas workspace tool"),
        }

    family_ds = family.get("design_system") if isinstance(family.get("design_system"), dict) else {}
    design_system = _design_system_from_match(
        dm, name=name, specialty=specialty, family_ds=family_ds
    )

    ia = family.get("information_architecture") or {"pages": [], "nav": []}
    page_specs = family.get("page_specs") or {}

    return {
        "product_type": family.get("product_type") or f"{name} Workspace",
        "uvp": family.get("uvp") or specialty,
        "daily_workflow": family.get("daily_workflow")
        or f"Open {name}, describe the task, and review or refine the result.",
        "problem_worth_solving": family.get("problem_worth_solving") or "",
        "target_users": list(family.get("target_users") or []),
        "information_architecture": ia,
        "design_system": design_system,
        "page_specs": page_specs,
        "design_match": dm,
        "figma_template": _figma_template_blob(match, dm),
        "migration": dict(STRATEGY_MIGRATION),
    }


def _patch_design_onto_blueprint(
    bp: dict[str, Any],
    agent: dict[str, Any],
) -> dict[str, Any]:
    """Keep rich IA; refresh design_system + design_match from matcher."""
    from services.figma.matcher import find_best_figma_template

    name = str(agent.get("name") or "AI Agent")
    specialty = str(agent.get("specialty") or "")
    domain = str(agent.get("domain") or "")
    prompt = _agent_prompt_blob(agent)
    match = find_best_figma_template(prompt, domain=domain, top_k=4)
    dm = dict(match.get("design_match") or {})

    if str(dm.get("archetype") or "").lower() == "gallery_curation" and not is_collections_agent(agent):
        match = find_best_figma_template(
            f"{prompt}\nvertical saas workspace — not gallery",
            domain=domain or "saas",
        )
        dm = dict(match.get("design_match") or {})

    existing_ds = bp.get("design_system") if isinstance(bp.get("design_system"), dict) else {}
    out = dict(bp)
    out["design_system"] = _design_system_from_match(
        dm, name=name, specialty=specialty, family_ds=existing_ds
    )
    out["design_match"] = dm
    out["figma_template"] = _figma_template_blob(match, dm)
    out["migration"] = dict(STRATEGY_MIGRATION)
    return out


def upgrade_agent_design(agent: dict[str, Any], *, trove_blueprint_fn=None) -> bool:
    """
    Mutate agent product_blueprint in place when weak/legacy/generic.
    Returns True if changed.
    """
    if not needs_design_strategy_upgrade(agent):
        return False

    if is_collections_agent(agent):
        existing = agent.get("product_blueprint")
        if trove_blueprint_fn and (
            not isinstance(existing, dict) or existing.get("product_type") != "Collections App"
        ):
            agent["product_blueprint"] = attach_collections_design_match(trove_blueprint_fn())
        elif isinstance(existing, dict):
            agent["product_blueprint"] = attach_collections_design_match(existing)
        elif trove_blueprint_fn:
            agent["product_blueprint"] = attach_collections_design_match(trove_blueprint_fn())
        else:
            return False
        return True

    bp = agent.get("product_blueprint")
    # Rich non-legacy IA: patch DS only
    if (
        isinstance(bp, dict)
        and _ia_page_count(bp) >= 4
        and _migration_source(bp) not in _LEGACY_SOURCES
        and str(bp.get("product_type") or "").lower() not in {"", "assistant workspace", "chat workspace"}
    ):
        agent["product_blueprint"] = _patch_design_onto_blueprint(bp, agent)
    else:
        agent["product_blueprint"] = strategy_product_blueprint(agent)
    return True


def upgrade_store_agents(
    agents: dict[str, Any],
    *,
    trove_blueprint_fn=None,
) -> int:
    """Upgrade all weak agents in a STORE agents map. Returns count changed."""
    changed = 0
    for agent in agents.values():
        if not isinstance(agent, dict):
            continue
        if upgrade_agent_design(agent, trove_blueprint_fn=trove_blueprint_fn):
            changed += 1
    return changed


def listing_design_cues(agent: dict[str, Any]) -> dict[str, Any] | None:
    """Compact design identity for Discover cards (mood / accent / archetype)."""
    bp = agent.get("product_blueprint") if isinstance(agent.get("product_blueprint"), dict) else {}
    if not bp:
        return None
    dm = bp.get("design_match") if isinstance(bp.get("design_match"), dict) else {}
    ds = bp.get("design_system") if isinstance(bp.get("design_system"), dict) else {}
    tokens = ds.get("tokens") if isinstance(ds.get("tokens"), dict) else {}
    colors = tokens.get("colors") if isinstance(tokens.get("colors"), dict) else {}
    if not dm and not colors:
        return None
    tags = [str(t)[:40] for t in (dm.get("style_tags") or [])[:4]]
    return {
        "mood": str(dm.get("mood") or "")[:64] or None,
        "archetype": str(dm.get("archetype") or "")[:64] or None,
        "domain": str(dm.get("domain") or agent.get("domain") or "")[:40] or None,
        "style_tags": tags,
        "personality": str(ds.get("personality") or "")[:80] or None,
        "accent": str(colors.get("accent") or "")[:32] or None,
        "bg": str(colors.get("bg") or "")[:32] or None,
        "fg": str(colors.get("fg") or "")[:32] or None,
        "template_id": str(dm.get("template_id") or "")[:64] or None,
    }
