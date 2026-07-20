"""
§1.1 Completeness — slot weights and filled() heuristics.
Engineering Spec Draft v0.1
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from engines.spec.schema import (
    ALL_SLOTS,
    OPTIONAL_SLOTS,
    REQUIRED_SLOTS,
    AgentSpecV1,
    DOMAIN_SET,
    OUTPUT_SET,
    TONE_SET,
)

GENERIC_PHRASES = {
    "help",
    "assist",
    "be helpful",
    "help with groceries",
    "general help",
    "do stuff",
    "anything",
    "chatgpt",
}


def _nonempty_str(v: Any) -> bool:
    return isinstance(v, str) and bool(v.strip())


def _specific_str(v: str, min_len: int = 24) -> bool:
    s = v.strip().lower()
    if len(s) < min_len:
        return False
    if s in GENERIC_PHRASES:
        return False
    # generic-keyword density: short answers that are mostly stopwords score unfilled-ish
    generics = ("help", "stuff", "things", "general", "anything", "something")
    tokens = s.split()
    if not tokens:
        return False
    generic_ratio = sum(1 for t in tokens if t in generics) / len(tokens)
    return generic_ratio < 0.45


def slot_filled(spec: AgentSpecV1, slot: str) -> bool:
    """Binary filled check used by completeness (§1.1)."""
    if slot == "purpose":
        return _specific_str(spec.purpose, min_len=20)
    if slot == "target_user":
        return _nonempty_str(spec.target_user) and len(spec.target_user.strip()) >= 8
    if slot == "domain":
        return spec.domain in DOMAIN_SET
    if slot == "tone":
        return spec.tone in TONE_SET
    if slot == "capabilities":
        return bool(spec.capabilities) and any(len(c.strip()) >= 8 for c in spec.capabilities)
    if slot == "constraints":
        return bool(spec.constraints) and any(len(c.strip()) >= 8 for c in spec.constraints)
    if slot == "escalation":
        return _specific_str(spec.escalation, min_len=20)
    if slot == "output_format":
        return _nonempty_str(spec.output_format)
    if slot == "tools":
        return bool(spec.tools)
    if slot == "knowledge_sources":
        return bool(spec.knowledge_sources)
    return False


def slot_weight(slot: str) -> int:
    return 2 if slot in REQUIRED_SLOTS else 1


def completeness(spec: AgentSpecV1) -> float:
    """
    completeness(spec) = sum(weight_i * filled(slot_i)) / sum(weight_i)
    required weight = 2, optional weight = 1
    """
    num = 0.0
    den = 0.0
    for slot in ALL_SLOTS:
        w = slot_weight(slot)
        den += w
        if slot_filled(spec, slot):
            num += w
    if den <= 0:
        return 0.0
    return round(num / den, 4)


def all_required_filled(spec: AgentSpecV1) -> bool:
    return all(slot_filled(spec, s) for s in REQUIRED_SLOTS)


def next_unfilled_slot(spec: AgentSpecV1) -> str | None:
    """Highest-weight unfilled slot — required before optional."""
    for slot in REQUIRED_SLOTS:
        if not slot_filled(spec, slot):
            return slot
    for slot in OPTIONAL_SLOTS:
        if not slot_filled(spec, slot):
            return slot
    return None


@dataclass
class PreviewGate:
    ready: bool
    completeness: float
    missing_required: list[str]
    message: str


def preview_offer(spec: AgentSpecV1) -> PreviewGate:
    """
    Offer preview when completeness ≥ 0.85 and all required slots filled (§1.1).
    """
    c = completeness(spec)
    missing = [s for s in REQUIRED_SLOTS if not slot_filled(spec, s)]
    ready = c >= 0.85 and not missing
    if ready:
        msg = "Generate preview now, or keep refining optional fields?"
    elif missing:
        msg = f"Still need required: {', '.join(missing)}"
    else:
        msg = f"Completeness {c:.0%} — keep refining until ≥ 85%."
    return PreviewGate(ready=ready, completeness=c, missing_required=missing, message=msg)
