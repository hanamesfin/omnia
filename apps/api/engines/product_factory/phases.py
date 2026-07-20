"""Ordered invent phases for the Product Factory."""

from __future__ import annotations

PHASE_ORDER: list[str] = [
    "classify",
    "strategy",
    "prd",
    "ia",
    "design_system",
    "page_ux",
    "architecture",
    "ai_core",
]

PHASE_LABELS: dict[str, str] = {
    "classify": "Product classification",
    "strategy": "Strategy & UVP",
    "prd": "Requirements (PRD)",
    "ia": "Information architecture",
    "design_system": "Brand & design system",
    "page_ux": "Page UX specs",
    "architecture": "Technical architecture",
    "ai_core": "AI core (prompt & tools)",
}

# Which workspace keys each phase writes.
PHASE_OUTPUT_KEYS: dict[str, list[str]] = {
    "classify": ["product_type", "platform", "ai_core_role", "daily_workflow"],
    "strategy": ["uvp", "target_users", "problem_worth_solving", "market_notes"],
    "prd": ["prd"],
    "ia": ["information_architecture"],
    "design_system": ["design_system"],
    "page_ux": ["page_specs"],
    "architecture": ["architecture"],
    "ai_core": ["ai_core"],
}
