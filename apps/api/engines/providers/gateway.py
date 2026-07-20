"""Shared LLM provider helpers — no standalone imports."""
from __future__ import annotations

from engines.model_selection.registry import openrouter_id_for, openrouter_model_map

OPENROUTER_MODEL_IDS: dict[str, str] = openrouter_model_map()

DEFAULT_PAID_MODEL = "openai/gpt-4o-mini"

# Prefer free models with native tool/function calling (Llama 3.3, Qwen).
_FREE_MODEL_FALLBACKS = (
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3-coder:free",
    "google/gemma-4-26b-a4b-it:free",
    "openai/gpt-oss-20b:free",
    "openrouter/free",
)


class ModelQuotaError(RuntimeError):
    """Rate limit / empty balance — try next model."""


def resolve_openrouter_model(model_id: str) -> str:
    return openrouter_id_for(model_id)


def fallback_model_chain(preferred: str | None, *, llm_usable) -> list[str]:
    chain: list[str] = []
    preferred = (preferred or "").strip() or None
    if preferred:
        chain.append(preferred)
    # Prefer short Omnia id if present in catalog
    paid = "gpt-4o-mini"
    if llm_usable(paid) and paid not in chain:
        chain.append(paid)
    if llm_usable(DEFAULT_PAID_MODEL) and DEFAULT_PAID_MODEL not in chain:
        chain.append(DEFAULT_PAID_MODEL)
    for free in _FREE_MODEL_FALLBACKS:
        if free not in chain:
            chain.append(free)
    return [m for m in chain if llm_usable(m)]
