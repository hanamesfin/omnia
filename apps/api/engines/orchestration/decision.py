"""
§1.3 Decision Policy — scored ask / act / answer (not vibes).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ActionKind = Literal["answer", "ask_user", "call_tool"]

MIN_CONFIDENCE = 0.15
HIGH_RISK = 0.85
LOW_RISK = 0.10

IRREVERSIBLE_TAGS = {"irreversible", "send_email", "charge_card", "delete_data", "destructive"}


@dataclass
class ActionOption:
    kind: ActionKind
    expected_value: float
    token_cost: float = 0.05
    latency_penalty: float = 0.05
    tag: str = ""
    tool_id: str | None = None
    content: str = ""


@dataclass
class Decision:
    action: ActionKind
    score: float
    reason: str
    tool_id: str | None = None
    content: str = ""


def cost(action: ActionOption) -> float:
    risk = HIGH_RISK if action.tag in IRREVERSIBLE_TAGS or "irreversible" in action.tag else LOW_RISK
    return action.token_cost + action.latency_penalty + risk


def score_action(action: ActionOption) -> float:
    return action.expected_value - cost(action)


def choose_action(options: list[ActionOption]) -> Decision:
    """
    choose = argmax(score) where score ≥ MIN_CONFIDENCE
    → ask_user if none clear MIN_CONFIDENCE
    → ask_user regardless if top action is irreversible
    """
    if not options:
        return Decision(action="ask_user", score=0.0, reason="no options", content="What should I focus on?")

    ranked = sorted(((score_action(o), o) for o in options), key=lambda x: x[0], reverse=True)
    best_score, best = ranked[0]

    if best.tag in IRREVERSIBLE_TAGS or best.tag == "irreversible":
        return Decision(
            action="ask_user",
            score=best_score,
            reason="top action is irreversible — confirmation required",
            tool_id=best.tool_id,
            content=best.content or f"Confirm before I run {best.tool_id or 'this action'}?",
        )

    if best_score < MIN_CONFIDENCE:
        return Decision(
            action="ask_user",
            score=best_score,
            reason="no action cleared MIN_CONFIDENCE",
            content=best.content or "I need a bit more detail before acting.",
        )

    return Decision(
        action=best.kind,
        score=best_score,
        reason="argmax score",
        tool_id=best.tool_id,
        content=best.content,
    )
