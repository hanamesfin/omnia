"""Ordered invent phases for the Product Factory."""

from __future__ import annotations

PHASE_ORDER: list[str] = [
    "classify",
    "strategy",
    "prd",
    "ia",
    "design_system",
    "page_ux",
    # Soft codegen phases: Figma vision UI → FastAPI backend stubs.
    # Soft-gated — skipped when PRODUCT_FACTORY_FIGMA_CODEGEN is off / no token.
    "ui_codegen",
    "architecture",
    "backend_codegen",
    "ai_core",
]

PHASE_LABELS: dict[str, str] = {
    "classify": "Product classification",
    "strategy": "Strategy & UVP",
    "prd": "Requirements (PRD)",
    "ia": "Information architecture",
    "design_system": "Brand & design system",
    "page_ux": "Page UX specs",
    "ui_codegen": "Figma UI codegen",
    "architecture": "Technical architecture",
    "backend_codegen": "Backend scaffold",
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
    "ui_codegen": ["generated_frontend", "figma_template"],
    "architecture": ["architecture"],
    "backend_codegen": ["generated_backend"],
    "ai_core": ["ai_core"],
}

# Soft phases never hard-fail invent when codegen is skipped.
SOFT_PHASES: set[str] = {"ui_codegen", "backend_codegen"}
