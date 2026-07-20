"""
User Intelligence Engine — §5.1
Open architect interview (not a rigid questionnaire).

Flow:
  welcome → design (open, adaptive) → done

Rules:
- Never auto-end the interview.
- Require MIN_USER_TURNS before the user may opt in to generate.
- Done only when the user explicitly chooses to finish.
- Next questions should build on prior answers and avoid repeats.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from engines.agent_architect.inspiration import (
    detect_product,
    ensure_inspiration_meta,
    needs_inspiration_interview,
)
from engines.user_intelligence.adaptive import normalize_domain

AnswerType = Literal["chip", "freetext"]

# Minimum user messages before "I'm ready — generate" is allowed.
MIN_USER_TURNS = 4

FINISH_PHRASES = (
    "looks good — generate",
    "i'm ready — generate",
    "im ready — generate",
    "ready — generate",
    "generate the agent",
    "create the agent",
)

INTERVIEW_FSM: dict[str, dict[str, Any]] = {
    "welcome": {
        "question": (
            "I'm your AI product architect. Tell me what this agent should do — "
            "a problem, a workflow, who it's for, or an inspiration. "
            "We'll keep designing until you say you're ready; we never clone a branded AI."
        ),
        "chips": [
            "A coding workflow agent",
            "A research / analysis agent",
            "Inspired by Claude — but original",
            "Inspired by ChatGPT — but specialized",
            "Something unique for my job",
        ],
        "next_state": "design",
        "answer_key": "welcome_ack",
    },
    "design": {
        "question": "What else should shape this agent?",
        "chips": [
            "Who will use it?",
            "What success looks like",
            "Tools it needs",
            "Hard limits / guardrails",
            "Personality & tone",
        ],
        "next_state": "design",
        "answer_key": None,
    },
    "done": {
        "question": None,
        "chips": [],
        "next_state": None,
        "answer_key": None,
    },
}

ORDERED_STATES = ["welcome", "design", "done"]

PROGRESS_BY_STATE: dict[str, int] = {
    "welcome": 0,
    "design": 40,
    "done": 100,
}

# Topics the adaptive interviewer should cover without repeating.
DESIGN_TOPICS: list[dict[str, str]] = [
    {"id": "mission", "hint": "primary mission / what success looks like"},
    {"id": "users", "hint": "who will use it and in what situations"},
    {"id": "shape", "hint": "product shape — chat, tool, analyzer, automation"},
    {"id": "domain", "hint": "domain specialty (coding, research, support, …)"},
    {"id": "tools", "hint": "tools, files, memory, or APIs it needs"},
    {"id": "constraints", "hint": "hard limits and guardrails"},
    {"id": "tone", "hint": "personality, tone, and when to ask first"},
    {"id": "edge", "hint": "edge cases or failure modes to handle carefully"},
]


@dataclass
class FSMStep:
    state: str
    question: str | None
    chips: list[str]
    is_done: bool
    progress: int  # 0–100
    can_finish: bool = False
    user_turns: int = 0
    min_turns: int = MIN_USER_TURNS
    next_topic: str | None = None


def normalize_answer(answer_type: AnswerType | str, value: str) -> str:
    return value.strip()


def is_finish_intent(text: str) -> bool:
    t = (text or "").strip().lower()
    if not t:
        return False
    if any(p in t for p in FINISH_PHRASES):
        return True
    if t in ("looks good", "generate", "i'm ready", "im ready", "ready", "done", "finish"):
        return True
    if ("ready" in t or "looks good" in t) and "generate" in t:
        return True
    return False


def user_turn_count(answers: dict[str, Any]) -> int:
    return int(answers.get("_user_turns") or 0)


def covered_topics(answers: dict[str, Any]) -> list[str]:
    raw = answers.get("_covered_topics") or []
    if isinstance(raw, list):
        return [str(x) for x in raw]
    return []


def next_uncovered_topic(answers: dict[str, Any]) -> dict[str, str] | None:
    have = set(covered_topics(answers))
    for topic in DESIGN_TOPICS:
        if topic["id"] not in have:
            return topic
    return None


def _infer_topic_from_answer(answer: str, focus: str | None) -> str | None:
    """Map a user reply onto a design topic so we don't re-ask it."""
    if focus:
        return focus
    t = (answer or "").lower()
    if any(k in t for k in ("who", "user", "customer", "team", "for my", "audience")):
        return "users"
    if any(k in t for k in ("success", "mission", "goal", "should", "help me", "i want")):
        return "mission"
    if any(k in t for k in ("chat", "tool", "analyzer", "automat", "transform", "companion")):
        return "shape"
    if any(k in t for k in ("coding", "research", "support", "content", "data", "domain")):
        return "domain"
    if any(k in t for k in ("tool", "api", "file", "memory", "search", "code execution")):
        return "tools"
    if any(k in t for k in ("never", "don't", "guard", "limit", "privacy", "no ")):
        return "constraints"
    if any(k in t for k in ("tone", "formal", "friendly", "calm", "personality", "ask first")):
        return "tone"
    if any(k in t for k in ("edge", "fail", "wrong", "risk", "error")):
        return "edge"
    return None


def _enrich_answers_from_text(answers: dict[str, Any], text: str) -> dict[str, Any]:
    """Fill blueprint fields from free chat without forcing repeated questions."""
    out = dict(answers)
    lower = text.lower()
    turns = list(out.get("_design_notes") or [])
    turns.append(text.strip())
    out["_design_notes"] = turns[-24:]

    if not out.get("goal_detail") and len(text.strip()) > 12:
        # Prefer the most concrete mission-like answer so far
        out["goal_detail"] = text.strip()[:400]

    if not out.get("domain_raw"):
        guessed = normalize_domain(text)
        if guessed != "general" or any(
            k in lower for k in ("general", "assistant", "everything", "omni")
        ):
            out["domain_raw"] = text if guessed == "general" and "general" in lower else (
                {
                    "coding": "Coding",
                    "research": "Research",
                    "content": "Content",
                    "customer_support": "Customer Support",
                    "data_analysis": "Data Analysis",
                    "general": "General assistant (breadth + judgment)",
                }.get(guessed, text[:80])
            )

    if not out.get("kind_raw"):
        if "frontier" in lower or "omni" in lower:
            out["kind_raw"] = "Frontier chat (files + tools + memory)"
        elif "transform" in lower or "rewrite" in lower:
            out["kind_raw"] = "Transformer (rewrite / convert)"
        elif "analy" in lower:
            out["kind_raw"] = "Analyzer (insights from input)"
        elif "automat" in lower or "workflow" in lower:
            out["kind_raw"] = "Automation (repeatable workflow)"
        elif "tool" in lower or "one-shot" in lower:
            out["kind_raw"] = "One-shot tool"
        elif "chat" in lower or "companion" in lower:
            out["kind_raw"] = "Chat companion"

    if not out.get("constraints_raw") and any(
        k in lower for k in ("never", "don't", "no personal", "guardrail", "only english", "privacy")
    ):
        out["constraints_raw"] = text.strip()[:240]

    if not out.get("tone_raw") and any(
        k in lower for k in ("calm", "friendly", "formal", "technical", "tone", "personality")
    ):
        out["tone_raw"] = text.strip()[:160]

    return out


def _design_chips(answers: dict[str, Any], can_finish: bool) -> list[str]:
    topic = next_uncovered_topic(answers)
    chips: list[str] = []
    if can_finish:
        chips.append("I'm ready — generate")
    if topic:
        hints = {
            "mission": "Define the core mission",
            "users": "Who will use it",
            "shape": "Chat companion",
            "domain": "Coding specialty",
            "tools": "Needs files + tools",
            "constraints": "Stay honest — never invent facts",
            "tone": "Calm & precise · ask on ambiguity",
            "edge": "Handle failures carefully",
        }
        chips.append(hints.get(topic["id"], topic["hint"]))
    # Keep a few open prompts that aren't "same question again"
    for extra in ("Add a constraint", "Change the personality", "Narrow the specialty"):
        if extra not in chips:
            chips.append(extra)
        if len(chips) >= 5:
            break
    return chips[:5]


def _progress_for(answers: dict[str, Any], state: str) -> int:
    if state == "done":
        return 100
    turns = user_turn_count(answers)
    covered = len(covered_topics(answers))
    # Soft progress: min-turn path + topic coverage, never forced to 100 until done
    base = min(85, int((turns / max(MIN_USER_TURNS, 1)) * 55) + covered * 5)
    return max(8, min(92, base))


def advance_fsm(
    current_state: str,
    answers: dict[str, Any],
    user_answer: str,
    answer_type: AnswerType | str = "freetext",
) -> tuple[dict[str, Any], FSMStep]:
    if current_state not in INTERVIEW_FSM:
        # Recover unknown/legacy states into open design
        current_state = "design" if current_state != "done" else "done"

    node = INTERVIEW_FSM[current_state]
    normalized = normalize_answer(answer_type, user_answer)
    answers = dict(answers)

    focus = str(answers.get("_next_topic") or "") or None

    if node.get("answer_key"):
        answers[node["answer_key"]] = normalized
        answers[f"{node['answer_key']}_type"] = answer_type

    answers = ensure_inspiration_meta(answers, normalized)
    if detect_product(answers=answers) and not answers.get("inspiration_product"):
        answers = ensure_inspiration_meta(answers, "")

    # Count every user turn in the open interview
    if current_state in ("welcome", "design"):
        answers["_user_turns"] = user_turn_count(answers) + 1
        answers = _enrich_answers_from_text(answers, normalized)

        topic_id = _infer_topic_from_answer(normalized, focus)
        if topic_id:
            covered = covered_topics(answers)
            if topic_id not in covered:
                covered.append(topic_id)
            answers["_covered_topics"] = covered

    turns = user_turn_count(answers)
    can_finish = turns >= MIN_USER_TURNS
    wants_finish = is_finish_intent(normalized)

    # Inspiration branch: soft-cover topics, but stay in design (never trap the user)
    if needs_inspiration_interview(answers) and "inspiration" not in covered_topics(answers):
        # Keep designing; blueprint_preview / generate still care about aspects
        pass

    if current_state == "done":
        return answers, FSMStep(
            state="done",
            question=None,
            chips=[],
            is_done=True,
            progress=100,
            can_finish=True,
            user_turns=turns,
            min_turns=MIN_USER_TURNS,
        )

    if current_state == "welcome":
        next_state = "design"
    elif wants_finish and can_finish:
        next_state = "done"
        answers["architect_review"] = "I'm ready — generate"
    else:
        next_state = "design"
        if wants_finish and not can_finish:
            # Explicitly not done — keep chatting
            answers["_early_finish_attempt"] = True

    nxt = next_uncovered_topic(answers)
    answers["_next_topic"] = nxt["id"] if nxt else None

    if next_state == "done":
        question = None
        chips: list[str] = []
    else:
        if wants_finish and not can_finish:
            remaining = MIN_USER_TURNS - turns
            question = (
                f"Almost — I need at least {remaining} more detail"
                f"{'s' if remaining != 1 else ''} before we generate. "
                f"What else matters for this agent?"
            )
        elif nxt:
            question = f"Based on that — {nxt['hint']}?"
        else:
            question = (
                "We've covered a lot. Want to refine anything else, "
                "or are you ready to generate?"
            )
        chips = _design_chips(answers, can_finish and next_state == "design")

    return answers, FSMStep(
        state=next_state,
        question=question,
        chips=chips,
        is_done=(next_state == "done"),
        progress=_progress_for(answers, next_state),
        can_finish=can_finish,
        user_turns=turns,
        min_turns=MIN_USER_TURNS,
        next_topic=answers.get("_next_topic"),
    )


def get_initial_step() -> FSMStep:
    node = INTERVIEW_FSM["welcome"]
    return FSMStep(
        state="welcome",
        question=node["question"],
        chips=list(node["chips"]),
        is_done=False,
        progress=0,
        can_finish=False,
        user_turns=0,
        min_turns=MIN_USER_TURNS,
    )
