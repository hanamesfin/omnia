"""Adaptive interview helpers — domain-aware chips + live blueprint preview."""
from __future__ import annotations

from typing import Any

from engines.agent_architect.inspiration import (
    advisor_insights,
    aspect_chips_for,
    improve_chips_for,
    originality_constraints,
)

DOMAIN_TASK_CHIPS: dict[str, list[str]] = {
    "coding": [
        "Review pull requests for risk",
        "Debug a failing stack trace",
        "Write tests for a module",
        "Explain unfamiliar code",
    ],
    "research": [
        "Distill papers into decisions",
        "Compare competing sources",
        "Build a brief for stakeholders",
        "Find open questions in a topic",
    ],
    "content": [
        "Draft a cover letter",
        "Rewrite for clarity and tone",
        "Outline a long-form piece",
        "Edit marketing copy",
    ],
    "customer_support": [
        "Answer product FAQs safely",
        "Triage tickets by urgency",
        "Draft empathetic replies",
        "Escalate edge cases cleanly",
    ],
    "data_analysis": [
        "Explain trends in a CSV",
        "Find anomalies in metrics",
        "Summarize a dashboard",
        "Propose next analyses",
    ],
    "general": [
        "Reason, write, code, and analyze for my work",
        "Help with anything I attach or ask",
        "Plan multi-step projects end-to-end",
        "Act as a lifelong thought partner",
    ],
}


def normalize_domain(raw: str) -> str:
    t = (raw or "").lower()
    if any(k in t for k in ("chatgpt", "claude", "general ai", "omni", "frontier", "everything", "universal", "breadth")):
        return "general"
    if any(k in t for k in ("code", "coding", "programming", "debug", "pr", "software", "cursor", "devin")):
        return "coding"
    if any(k in t for k in ("research", "paper", "literature", "study", "perplexity")):
        return "research"
    if any(k in t for k in ("content", "writing", "blog", "copy", "letter")):
        return "content"
    if any(k in t for k in ("support", "customer", "ticket", "help desk")):
        return "customer_support"
    if any(k in t for k in ("data", "csv", "analytics", "spreadsheet")):
        return "data_analysis"
    return "general"


def adaptive_chips_for_state(
    state: str,
    answers: dict[str, Any],
    *,
    can_finish: bool = False,
) -> list[str] | None:
    """Override default chips when we can be smarter from prior answers."""
    if state == "design":
        chips: list[str] = []
        if can_finish:
            chips.append("I'm ready — generate")
        notes = " ".join(str(v) for v in answers.values()).lower()
        # Suggest angles that aren't already obvious in prior answers
        suggestions = [
            ("users" not in notes and "who" not in notes, "Who will use it?"),
            ("success" not in notes and "mission" not in notes, "What does success look like?"),
            ("never" not in notes and "don't" not in notes, "Add a hard limit"),
            ("tone" not in notes and "calm" not in notes and "formal" not in notes, "Set the personality"),
            ("tool" not in notes and "file" not in notes, "Which tools or files?"),
            (True, "Narrow the specialty"),
            (True, "Describe an edge case"),
        ]
        for ok, label in suggestions:
            if ok and label not in chips:
                chips.append(label)
            if len(chips) >= 5:
                break
        return chips
    if state == "inspiration_aspects":
        return aspect_chips_for(answers)
    if state == "improve_idea":
        return improve_chips_for(answers)
    if state == "architect_review":
        return ["I'm ready — generate", "Keep refining"]
    if state == "goal_detail":
        domain = normalize_domain(str(answers.get("domain_raw", "")))
        kind = str(answers.get("kind_raw", "")).lower()
        chips = list(DOMAIN_TASK_CHIPS.get(domain, DOMAIN_TASK_CHIPS["general"]))
        aspects = str(answers.get("inspiration_aspects") or "").lower()
        if answers.get("inspiration_product") or "frontier" in kind:
            inspired = [
                f"Prioritize: {answers.get('inspiration_aspects', 'depth + usefulness')}"
                if answers.get("inspiration_aspects")
                else "Reason deeply across my work",
                "Help with anything I attach or ask",
                "Deep research + clear recommendations",
                "Pair-program and review my work",
            ]
            if "cod" in aspects:
                inspired.insert(1, "Ship careful code reviews and patches")
            if "writ" in aspects:
                inspired.insert(1, "Draft and edit with a calm, precise voice")
            if "research" in aspects:
                inspired.insert(1, "Synthesize sources without inventing citations")
            return inspired[:5]
        if "transform" in kind:
            return [
                "Rewrite for a new audience",
                "Convert format A → format B",
                "Polish rough notes into prose",
                "Localize copy without inventing claims",
            ]
        if "analy" in kind:
            return [
                "Extract decisions and risks",
                "Find anomalies and outliers",
                "Compare two sources",
                "Produce a one-page brief",
            ]
        if "automat" in kind:
            return [
                "Sort and label incoming items",
                "Apply a checklist to each input",
                "Escalate only edge cases",
                "Produce a daily digest",
            ]
        if "tool" in kind or "one-shot" in kind:
            return [
                "Paste input → structured report",
                "Score and prioritize items",
                "Validate against a checklist",
                "Generate a first draft artifact",
            ]
        return chips
    return None


def blueprint_preview(answers: dict[str, Any]) -> dict[str, Any]:
    """
    Live, explainable preview while the interview is still running.
    Rule-based — no LLM required — so Create feels intelligent immediately.
    """
    domain = normalize_domain(str(answers.get("domain_raw", "")))
    goal = str(answers.get("goal_detail", "")).strip()
    constraints = str(answers.get("constraints_raw", "")).strip()
    tone = str(answers.get("tone_raw", "")).strip()
    blob = " ".join(str(v) for v in answers.values()).lower()
    inspired = bool(answers.get("inspiration_product"))
    frontier = inspired or any(
        k in blob
        for k in (
            "chatgpt",
            "claude",
            "general ai",
            "frontier",
            "omni",
            "help with anything",
            "general assistant",
            "breadth",
        )
    ) or (
        domain == "general"
        and any(k in str(answers.get("domain_raw", "")).lower() for k in ("general", "chatgpt", "claude", "breadth"))
    )

    formality = 3
    autonomy = 3
    tl = tone.lower()
    if "calm" in tl or "friendly" in tl or "simple" in tl:
        formality = 2 if "formal" not in tl else 5
    if "formal" in tl:
        formality = 5
    elif "technical" in tl:
        formality = 4
    if "always ask" in tl:
        autonomy = 1
    elif "fully autonomous" in tl:
        autonomy = 5
    elif "mostly autonomous" in tl or "technical" in tl:
        autonomy = 4

    product = str(answers.get("inspiration_product") or "").strip()
    if frontier and product:
        archetype = f"Original Omni · inspired by {product}"
    elif frontier:
        archetype = "Frontier Omni Assistant"
    else:
        archetype = {
            "coding": "Code Reviewer",
            "research": "Research Analyst",
            "content": "Creative Writer",
            "customer_support": "Formal Support Agent",
            "data_analysis": "Data Analyst",
            "general": "General Assistant",
        }.get(domain, "General Assistant")

    confidence = 0.3
    if answers.get("domain_raw"):
        confidence += 0.15
    if answers.get("kind_raw"):
        confidence += 0.1
    if goal:
        confidence += 0.2
    if constraints and constraints.lower() != "skip":
        confidence += 0.08
    if tone:
        confidence += 0.08
    if answers.get("inspiration_aspects"):
        confidence += 0.1
    if answers.get("improve_focus"):
        confidence += 0.08
    if frontier:
        confidence = min(0.98, confidence + 0.05)

    insights: list[str] = list(advisor_insights(answers))
    kind_raw = str(answers.get("kind_raw", ""))
    capabilities: list[str] = []
    if frontier:
        capabilities = [
            "Deep reasoning",
            "Files & images",
            "Tools & code",
            "Long-term memory",
            "Cross-domain help",
        ]
        if not any("Inspiration:" in i for i in insights):
            insights.append("Frontier stack for breadth — still an original OMNIA agent.")
        insights.append("Will prefer high-reasoning models; never claim a brand identity.")
    elif kind_raw:
        insights.append(f"Product shape: {kind_raw.split('(')[0].strip()} — not assumed to be chat.")
    if domain == "coding" and not frontier:
        insights.append("Will weight reasoning and code-safety in model selection.")
    if "no external" in constraints.lower():
        insights.append("Memory stays session-scoped — no outbound tool calls.")
    if autonomy >= 4:
        insights.append("High autonomy — escalation rules must stay explicit.")
    if formality >= 4:
        insights.append("Formal register locked for generated tone guidance.")
    if not insights and domain != "general":
        insights.append(f"Primary signal so far: {domain.replace('_', ' ')} specialty.")

    original_constraints = originality_constraints(answers)
    constraint_list: list[str] = []
    if constraints and constraints.lower() != "skip":
        constraint_list.append(constraints)
    constraint_list.extend(original_constraints)

    if answers.get("context_corpus") or answers.get("context_file_names"):
        confidence = min(0.98, confidence + 0.06)
        insights.insert(0, f"Grounded in uploaded files: {answers.get('context_file_names', 'corpus')}.")
        preview_caps = list(capabilities)
        if "Files & images" not in preview_caps and "Files & corpus" not in preview_caps:
            preview_caps = ["Files & corpus", *preview_caps]
        capabilities = preview_caps

    review = str(answers.get("architect_review") or "")
    ready = (
        "looks good" in review.lower()
        or "generate" in review.lower()
        or "ready" in review.lower()
    )

    return {
        "domain": domain,
        "archetype": archetype,
        "primary_goal": goal or "Waiting for task detail…",
        "formality": formality,
        "autonomy": autonomy,
        "confidence": round(min(0.98, confidence), 2),
        "insights": insights,
        "constraints": constraint_list,
        "kind_raw": kind_raw,
        "capability_tier": "frontier" if frontier else "specialist",
        "capabilities": capabilities,
        "context_files": len(str(answers.get("context_file_names", "")).split(", ")) if answers.get("context_file_names") else 0,
        "inspiration_product": product or None,
        "inspiration_aspects": answers.get("inspiration_aspects"),
        "improve_focus": answers.get("improve_focus"),
        "originality_rule": answers.get("originality_rule"),
        "architect_ready": ready,
    }
