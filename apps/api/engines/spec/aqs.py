"""
§2.1 Agent Quality Score (AQS)
AQS = 0.30·Coverage + 0.25·Safety + 0.25·Clarity + 0.20·TestPassRate
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from engines.spec.completeness import completeness, slot_filled
from engines.spec.schema import REQUIRED_SLOTS, AgentSpecV1, SpecScores

GENERIC_CONSTRAINT_MARKERS = {
    "be safe",
    "be careful",
    "don't be bad",
    "be good",
    "stay safe",
}


def _specificity(text: str) -> float:
    """Length + inverse generic-keyword ratio → near 0 for 'be safe', near 1 for precise constraints."""
    s = (text or "").strip().lower()
    if not s:
        return 0.0
    if s in GENERIC_CONSTRAINT_MARKERS:
        return 0.05
    length_score = min(1.0, len(s) / 80.0)
    generics = ("safe", "good", "nice", "careful", "properly", "appropriately", "always", "never")
    tokens = re.findall(r"[a-z0-9']+", s)
    if not tokens:
        return 0.0
    # Prefer concrete nouns / verbs — penalize only ultra-generic short clauses
    if len(tokens) <= 3 and any(t in generics for t in tokens):
        return max(0.1, length_score * 0.3)
    return round(0.35 * length_score + 0.65 * min(1.0, len(tokens) / 12.0), 4)


def coverage_score(spec: AgentSpecV1) -> float:
    """Fraction of required sections filled and specific."""
    if not REQUIRED_SLOTS:
        return 0.0
    scores = []
    for slot in REQUIRED_SLOTS:
        if not slot_filled(spec, slot):
            scores.append(0.0)
            continue
        if slot == "purpose":
            scores.append(_specificity(spec.purpose))
        elif slot == "escalation":
            scores.append(_specificity(spec.escalation))
        elif slot == "capabilities":
            scores.append(
                sum(_specificity(c) for c in spec.capabilities) / max(1, len(spec.capabilities))
            )
        elif slot == "constraints":
            scores.append(
                sum(_specificity(c) for c in spec.constraints) / max(1, len(spec.constraints))
            )
        else:
            scores.append(1.0 if slot_filled(spec, slot) else 0.0)
    # Blend binary completeness with specificity
    filled_frac = completeness(spec)  # includes optional — bias with required-only fraction
    req_frac = sum(1 for s in REQUIRED_SLOTS if slot_filled(spec, s)) / len(REQUIRED_SLOTS)
    spec_avg = sum(scores) / len(scores)
    return round(0.45 * req_frac + 0.55 * spec_avg, 4)


def _required_constraint_categories(spec: AgentSpecV1) -> list[str]:
    """Categories that must exist given attached tools (§2.1 SafetyScore)."""
    cats = ["scope", "honesty"]
    tiers = {t.permission_tier for t in spec.tools}
    tool_ids = " ".join(t.tool_id for t in spec.tools).lower()
    if any(x in tool_ids for x in ("data", "file", "upload", "memory", "knowledge", "db")):
        cats.append("data_handling")
    if "side_effecting" in tiers or "destructive" in tiers:
        cats.append("confirmation")
    if "destructive" in tiers:
        cats.append("irreversible_actions")
    if spec.domain == "finance":
        cats.append("data_handling")
    return cats


def _constraint_covers(category: str, constraints: list[str]) -> bool:
    blob = " ".join(constraints).lower()
    needles = {
        "scope": ("out of scope", "only help", "within", "refuse", "can't help", "cannot help"),
        "honesty": ("never invent", "don't invent", "hallucin", "honest", "cite", "not fabricate"),
        "data_handling": (
            "personal data",
            "retain",
            "privacy",
            "confidential",
            "do not store",
            "data handling",
            "PII",
            "financ",
        ),
        "confirmation": ("confirm", "ask before", "approval", "permission"),
        "irreversible_actions": ("irreversible", "destructive", "delete", "charge", "never send"),
    }
    return any(n.lower() in blob for n in needles.get(category, ()))


def safety_score(spec: AgentSpecV1) -> float:
    """1 − (missing required constraint categories ÷ total required categories)."""
    cats = _required_constraint_categories(spec)
    if not cats:
        return 1.0
    missing = sum(1 for c in cats if not _constraint_covers(c, spec.constraints))
    return round(max(0.0, 1.0 - missing / len(cats)), 4)


def clarity_score(system_prompt: str) -> float:
    """
    Readability heuristic on the compiled system prompt:
    average sentence length, ambiguous-pronoun rate, passive-voice rate.
    Higher is clearer.
    """
    text = (system_prompt or "").strip()
    if not text:
        return 0.0
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    words = re.findall(r"[A-Za-z']+", text)
    if not sentences or not words:
        return 0.0
    avg_len = len(words) / len(sentences)
    # Ideal ~12–22 words/sentence
    if avg_len <= 22:
        len_score = 1.0
    else:
        len_score = max(0.2, 1.0 - (avg_len - 22) / 40.0)

    pronouns = {"it", "this", "that", "they", "them", "these", "those"}
    pronoun_rate = sum(1 for w in words if w.lower() in pronouns) / len(words)
    pronoun_score = max(0.0, 1.0 - pronoun_rate * 8.0)

    passive_hits = len(re.findall(r"\b(is|are|was|were|be|been)\s+\w+ed\b", text.lower()))
    passive_rate = passive_hits / max(1, len(sentences))
    passive_score = max(0.0, 1.0 - passive_rate * 1.5)

    return round(0.45 * len_score + 0.30 * pronoun_score + 0.25 * passive_score, 4)


def aqs(
    coverage: float,
    safety: float,
    clarity: float,
    test_pass_rate: float,
) -> float:
    """AQS = 0.30·C + 0.25·S + 0.25·Cl + 0.20·T"""
    raw = 0.30 * coverage + 0.25 * safety + 0.25 * clarity + 0.20 * test_pass_rate
    # Half-up to 3dp so worked example 0.8975 → 0.898 (matches Spec §5)
    return int(raw * 1000 + 0.5) / 1000.0


@dataclass
class AQSResult:
    coverage: float
    safety: float
    clarity: float
    test_pass_rate: float
    aqs: float

    def as_scores(self) -> SpecScores:
        return SpecScores(
            coverage=self.coverage,
            safety=self.safety,
            clarity=self.clarity,
            test_pass_rate=self.test_pass_rate,
            aqs=self.aqs,
        )


def score_agent(spec: AgentSpecV1, system_prompt: str, test_pass_rate: float) -> AQSResult:
    c = coverage_score(spec)
    s = safety_score(spec)
    cl = clarity_score(system_prompt)
    t = max(0.0, min(1.0, float(test_pass_rate)))
    return AQSResult(
        coverage=c,
        safety=s,
        clarity=cl,
        test_pass_rate=t,
        aqs=aqs(c, s, cl, t),
    )
