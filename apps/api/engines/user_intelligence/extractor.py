"""
User Intelligence Engine — §5.1 Stage 2: Structured extraction.
One LLM call to convert raw interview answers → typed UserProfile.
Fallback: keyword-based rule table (no LLM needed).
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from openai import AsyncOpenAI

from config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY or "sk-unset")

# ─── Domain keyword fallback table ────────────────────────────────────────────
# Hand-authored keyword→domain map — seed configuration, not trained data.
DOMAIN_KEYWORDS: dict[str, list[str]] = {
    "customer_support": ["support", "customer", "ticket", "help desk", "service", "complaint"],
    "research": ["research", "analyse", "analyze", "literature", "study", "investigate", "summarise", "summarize"],
    "coding": ["code", "coding", "programming", "debug", "software", "python", "javascript", "script"],
    "content": ["content", "writing", "blog", "article", "copy", "social media", "marketing"],
    "data_analysis": ["data", "analysis", "analytics", "chart", "graph", "sql", "spreadsheet", "csv"],
}

TONE_MAP: dict[str, int] = {
    "formal": 5, "professional": 5,
    "friendly": 2, "casual": 2,
    "technical": 4, "precise": 4,
    "simple": 2, "clear": 3,
}

AUTONOMY_MAP: dict[str, int] = {
    "always ask": 1, "ask before": 1,
    "mostly autonomous": 3, "ask on ambiguity": 3,
    "fully autonomous": 5, "just do it": 5,
}


@dataclass
class UserProfile:
    domain: str
    primary_goal: str
    technical_level: int   # 1–5
    formality: int         # 1–5
    autonomy_preference: int  # 1–5
    constraints: list[str]
    suggested_tools: list[str]


EXTRACTION_SYSTEM_PROMPT = """\
Extract a structured profile from interview answers. Return ONLY valid JSON with \
exactly this schema — no prose, no markdown fences:
{
  "domain": "<string>",
  "primary_goal": "<string>",
  "technical_level": <integer 1-5>,
  "formality": <integer 1-5>,
  "autonomy_preference": <integer 1-5>,
  "constraints": ["<string>", ...],
  "suggested_tools": ["<string>", ...]
}
technical_level: 1=non-technical user, 5=expert developer.
formality: 1=very casual, 5=very formal.
autonomy_preference: 1=always confirm with user, 5=fully autonomous."""


async def extract_user_profile(answers: dict[str, Any]) -> UserProfile:
    """
    Stage 2: call the fast LLM to extract a structured UserProfile.
    Validates with Pydantic-style checks; retries once on parse failure;
    falls back to rule-based defaults if both attempts fail.
    """
    answers_text = "\n".join(f"- {k}: {v}" for k, v in answers.items() if v)

    for attempt in range(2):
        extra = "" if attempt == 0 else "\nIMPORTANT: Your previous response was not valid JSON. Return ONLY the JSON object."
        try:
            response = await client.chat.completions.create(
                model=settings.LLM_FAST_MODEL,
                messages=[
                    {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT + extra},
                    {"role": "user", "content": f"Interview answers:\n{answers_text}"},
                ],
                temperature=0.1,
                max_tokens=512,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content
            parsed = json.loads(raw)
            return _validate_profile(parsed)
        except Exception:
            continue

    # Fallback: rule-based defaults from keyword tables
    return _rule_based_fallback(answers)


def _validate_profile(parsed: dict) -> UserProfile:
    def clamp(v, lo=1, hi=5) -> int:
        return max(lo, min(hi, int(v)))

    return UserProfile(
        domain=str(parsed.get("domain", "general")),
        primary_goal=str(parsed.get("primary_goal", "General-purpose assistant")),
        technical_level=clamp(parsed.get("technical_level", 3)),
        formality=clamp(parsed.get("formality", 3)),
        autonomy_preference=clamp(parsed.get("autonomy_preference", 3)),
        constraints=[str(c) for c in parsed.get("constraints", [])],
        suggested_tools=[str(t) for t in parsed.get("suggested_tools", [])],
    )


def _rule_based_fallback(answers: dict[str, Any]) -> UserProfile:
    """Keyword-matching fallback — runs with zero LLM calls."""
    text = " ".join(str(v) for v in answers.values()).lower()

    domain = "general"
    domain_raw = str(answers.get("domain_raw") or "").lower()
    for d, keywords in DOMAIN_KEYWORDS.items():
        if any(kw in text for kw in keywords) or any(kw in domain_raw for kw in keywords):
            domain = d
            break
    # Explicit chip mapping
    if "coding" in domain_raw:
        domain = "coding"
    elif "research" in domain_raw:
        domain = "research"
    elif "content" in domain_raw:
        domain = "content"
    elif "customer" in domain_raw or "support" in domain_raw:
        domain = "customer_support"
    elif "data" in domain_raw:
        domain = "data_analysis"
    elif "general" in domain_raw:
        domain = "general"

    formality = 3
    for kw, score in TONE_MAP.items():
        if kw in text:
            formality = score
            break

    autonomy = 3
    for kw, score in AUTONOMY_MAP.items():
        if kw in text:
            autonomy = score
            break

    constraints = []
    constraint_raw = str(answers.get("constraints_raw") or answers.get("constraints") or "")
    if "no external" in text or "no external" in constraint_raw.lower():
        constraints.append("no external API calls")
    if "english" in text:
        constraints.append("respond in English only")
    if "honest" in text or "never invent" in text:
        constraints.append("never invent facts or citations")
    # Keep free-text constraints when provided
    for line in constraint_raw.replace(",", "\n").split("\n"):
        line = line.strip()
        if line and line.lower() not in ("none", "no", "n/a") and line not in constraints:
            if len(line) > 3:
                constraints.append(line[:160])

    goal_detail = str(answers.get("goal_detail") or "").strip()
    welcome = str(answers.get("welcome_ack") or "").strip()
    improve = str(answers.get("improve_focus") or "").strip()
    goal_parts = [p for p in (goal_detail, welcome, improve) if p]
    goal = " — ".join(dict.fromkeys(goal_parts))[:400] if goal_parts else "General-purpose assistant"

    # Prefer general + richer tools when ChatGPT-class path is chosen
    if any(k in text for k in ("chatgpt", "general ai", "frontier", "omni", "help with anything")):
        domain = "general"
        suggested = [
            "web_search",
            "code_execution",
            "file_read",
            "image_understanding",
            "memory_recall",
        ]
        tech = 5
        if not goal_detail:
            goal = answers.get("goal_detail", "ChatGPT-class general assistant")
    else:
        suggested = []
        tech = 3
        if domain == "coding":
            suggested = ["code_execution", "file_read"]
            tech = 4
        elif domain == "research":
            suggested = ["web_search", "summariser"]
        elif domain == "data_analysis":
            suggested = ["code_execution", "csv_reader"]
            tech = 4

    return UserProfile(
        domain=domain,
        primary_goal=goal,
        technical_level=tech,
        formality=formality,
        autonomy_preference=autonomy,
        constraints=constraints,
        suggested_tools=suggested,
    )
