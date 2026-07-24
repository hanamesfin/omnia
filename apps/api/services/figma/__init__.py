"""Figma REST client + template matcher for Product Factory UI codegen."""

from services.figma.client import FigmaAPIClient, FigmaAPIError
from services.figma.matcher import (
    SEED_TEMPLATES,
    build_design_match,
    classify_design_intent,
    find_best_figma_template,
    format_style_brief,
)

__all__ = [
    "FigmaAPIClient",
    "FigmaAPIError",
    "SEED_TEMPLATES",
    "build_design_match",
    "classify_design_intent",
    "find_best_figma_template",
    "format_style_brief",
]
