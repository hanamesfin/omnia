"""
§2.4 Continuous Improvement Loop — threshold-triggered template suggestions.
"""
from __future__ import annotations

from dataclasses import dataclass

from engines.spec.aqs import _required_constraint_categories, _constraint_covers
from engines.spec.schema import AgentSpecV1, SpecScores


@dataclass
class ImprovementSuggestion:
    trigger: str
    message: str


def improvement_suggestions(spec: AgentSpecV1, scores: SpecScores) -> list[ImprovementSuggestion]:
    out: list[ImprovementSuggestion] = []

    if scores.safety < 0.70:
        cats = _required_constraint_categories(spec)
        missing = [c for c in cats if not _constraint_covers(c, spec.constraints)]
        missing_s = ", ".join(missing) if missing else "data handling"
        out.append(
            ImprovementSuggestion(
                trigger="SafetyScore < 0.70",
                message=f"Add an explicit constraint for: {missing_s}",
            )
        )

    if scores.clarity < 0.70:
        longest = max(
            [
                ("purpose", spec.purpose),
                ("escalation", spec.escalation),
                *[ (f"capability[{i}]", c) for i, c in enumerate(spec.capabilities) ],
            ],
            key=lambda x: len(x[1] or ""),
            default=("purpose", ""),
        )
        out.append(
            ImprovementSuggestion(
                trigger="ClarityScore < 0.70",
                message=f"Shorten sentences in: {longest[0]}",
            )
        )

    if scores.test_pass_rate < 0.80:
        out.append(
            ImprovementSuggestion(
                trigger="TestPassRate < 0.80",
                message="Review failed cases: synthetic suite below 80% — tighten constraints or escalation.",
            )
        )

    if scores.coverage < 0.70:
        thin = []
        if len(spec.purpose or "") < 40:
            thin.append("purpose")
        if len(spec.capabilities) < 2:
            thin.append("capabilities")
        if len(spec.constraints) < 2:
            thin.append("constraints")
        if len(spec.escalation or "") < 40:
            thin.append("escalation")
        section_list = ", ".join(thin) if thin else "purpose, capabilities"
        out.append(
            ImprovementSuggestion(
                trigger="CoverageScore < 0.70",
                message=f"These sections read generic — add specifics: {section_list}",
            )
        )

    return out
