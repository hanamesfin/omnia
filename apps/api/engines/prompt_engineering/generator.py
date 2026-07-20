"""
Prompt Engineering Engine — §5.3
1. Meta-prompt LLM call → structured 5-section system prompt.
2. Deterministic linter (100% rule-based, no LLM call).
3. Retry-on-lint-fail, then surface error.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional
import json

from openai import AsyncOpenAI

from config import settings
from engines.agent_architect.composer import AgentSpec

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY or "sk-unset")

# ─── Linter Configuration ─────────────────────────────────────────────────────
# Hand-authored conflict pairs — if both terms appear, flag contradiction.
# SEED_CONFIG — extend this list over time.
CONFLICT_PAIRS: list[tuple[str, str]] = [
    ("always ask before acting", "act autonomously without confirmation"),
    ("never use external", "always fetch from the web"),
    ("formal tone only", "casual and conversational"),
    ("only respond in english", "translate to"),
]

REQUIRED_SECTIONS = [
    r"1\.\s*.*(role|scope)",
    r"2\.\s*.*(tone|style)",
    r"3\.\s*.*(tools?|tool)",
    r"4\.\s*.*(constraints?|limits?|never)",
    r"5\.\s*.*(escalat|when to decline|can.t help)",
]

MIN_WORDS = 150
MAX_WORDS = 2200
MAX_FK_GRADE = 16  # Frontier constitutions can be a bit denser



@dataclass
class LintResult:
    passed: bool
    checks: list[dict]   # [{name, passed, message}]
    word_count: int
    fk_grade: float
    failures: list[str]  # human-readable failure reasons


@dataclass
class PromptResult:
    prompt_text: str
    lint: LintResult
    attempts: int


# ─── Meta-prompt template ─────────────────────────────────────────────────────
META_PROMPT_SYSTEM = """\
You write system prompts for AI agents — including ChatGPT-class frontier assistants.
Given a structured AgentSpec JSON, produce a system prompt with EXACTLY these five numbered sections in this order:
1. Role and scope (what the agent does; for frontier agents, emphasize broad capability + specialty focus)
2. Tone and style guidance (how the agent should communicate — natural, precise, trustworthy)
3. Tools available and when to use each (list each tool with usage condition; include files/multimodal if present)
4. Explicit constraints (things the agent must NEVER do)
5. Escalation rule (when to respond "I can't help with that" instead of guessing)

If capability_tier is "frontier", write depth comparable to a modern general chatbot constitution
(files, tools, memory, reasoning depth) while staying within 400–900 words.
Output ONLY the prompt text — no explanation, no preamble, no markdown code fences.\
"""


def _word_count(text: str) -> int:
    return len(text.split())


def _flesch_kincaid_grade(text: str) -> float:
    """
    Closed-form Flesch-Kincaid Grade Level formula.
    FK Grade = 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
    """
    sentences = max(1, len(re.split(r"[.!?]+", text)))
    words = max(1, len(text.split()))
    # Syllable approximation: count vowel groups
    syllables = max(1, len(re.findall(r"[aeiouAEIOU]+", text)))
    grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
    return round(grade, 2)


def lint_prompt(text: str) -> LintResult:
    """
    100% deterministic linter — no LLM call, instant, free.
    """
    checks: list[dict] = []
    failures: list[str] = []
    lower = text.lower()

    # 1. Word count
    wc = _word_count(text)
    wc_pass = MIN_WORDS <= wc <= MAX_WORDS
    checks.append({"name": "word_count", "passed": wc_pass, "message": f"{wc} words (expected {MIN_WORDS}–{MAX_WORDS})"})
    if not wc_pass:
        failures.append(f"Word count {wc} is outside [{MIN_WORDS}, {MAX_WORDS}]")

    # 2. Required sections
    for pattern in REQUIRED_SECTIONS:
        found = bool(re.search(pattern, lower))
        checks.append({"name": f"section:{pattern}", "passed": found, "message": "present" if found else "MISSING"})
        if not found:
            failures.append(f"Required section missing: /{pattern}/")

    # 3. Contradictory constraints
    for a, b in CONFLICT_PAIRS:
        if a in lower and b in lower:
            checks.append({"name": "conflict", "passed": False, "message": f"Contradictory: '{a}' vs '{b}'"})
            failures.append(f"Contradictory constraints: '{a}' vs '{b}'")

    # 4. Readability
    fk = _flesch_kincaid_grade(text)
    fk_pass = fk <= MAX_FK_GRADE
    checks.append({"name": "flesch_kincaid", "passed": fk_pass, "message": f"Grade {fk} (max {MAX_FK_GRADE})"})
    if not fk_pass:
        failures.append(f"Flesch-Kincaid grade {fk} > {MAX_FK_GRADE} (too complex)")

    passed = len(failures) == 0
    return LintResult(passed=passed, checks=checks, word_count=wc, fk_grade=fk, failures=failures)


async def generate_prompt(spec: AgentSpec) -> PromptResult:
    """
    Generate a system prompt from an AgentSpec, lint it,
    retry once with corrections if it fails.
    """
    spec_json = json.dumps({
        "role": spec.role,
        "domain": spec.domain,
        "tone": spec.tone,
        "tools": spec.tools,
        "memory_strategy": spec.memory_strategy,
        "evaluation_criteria": spec.evaluation_criteria,
        "capability_tier": getattr(spec, "capability_tier", "specialist"),
        "capabilities": getattr(spec, "capabilities", []),
        "primary_goal": getattr(spec, "primary_goal", ""),
    }, indent=2)

    correction_suffix = ""

    for attempt in range(1, 3):
        user_content = f"AgentSpec:\n{spec_json}{correction_suffix}"
        response = await client.chat.completions.create(
            model=settings.LLM_GENERATION_MODEL,
            messages=[
                {"role": "system", "content": META_PROMPT_SYSTEM},
                {"role": "user",   "content": user_content},
            ],
            temperature=0.4,
            max_tokens=settings.LLM_MAX_TOKENS,
        )
        prompt_text = response.choices[0].message.content.strip()
        lint = lint_prompt(prompt_text)

        if lint.passed or attempt == 2:
            return PromptResult(prompt_text=prompt_text, lint=lint, attempts=attempt)

        # Build correction message for retry
        correction_suffix = (
            "\n\n---\nLINTER FEEDBACK (must fix in next attempt):\n"
            + "\n".join(f"- {f}" for f in lint.failures)
        )

    # Should never reach here, but satisfy type checker
    return PromptResult(prompt_text=prompt_text, lint=lint, attempts=2)
