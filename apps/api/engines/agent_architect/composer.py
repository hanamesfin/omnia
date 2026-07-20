"""
Agent Architect Engine — §5.2
Template matching via cosine similarity + rule-based composition.
No training data required — pure math + authored if/then rules.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

from engines.user_intelligence.extractor import UserProfile
from engines.agent_architect.frontier import (
    FRONTIER_CAPABILITIES,
    FRONTIER_TOOLS,
    is_frontier_ambition,
)

# ─── Agent Archetype Templates ────────────────────────────────────────────────
# Hand-authored library of 15 archetypes.
# Feature vector: [tech_level/5, formality/5, autonomy/5,
#   domain_customer_support, domain_research, domain_coding,
#   domain_content, domain_data, domain_general]
#
# SEED_CONFIG — these values are design decisions, not measured from data.
# Tune from real usage logs once available.

DOMAIN_INDEX = {
    "customer_support": 3,
    "research": 4,
    "coding": 5,
    "content": 6,
    "data_analysis": 7,
    "general": 8,
}
VECTOR_DIM = 9  # 3 continuous + 6 domain one-hot


def _vec(tech: int, form: int, auto: int, domain: str) -> list[float]:
    v = [0.0] * VECTOR_DIM
    v[0] = tech / 5.0
    v[1] = form / 5.0
    v[2] = auto / 5.0
    idx = DOMAIN_INDEX.get(domain, DOMAIN_INDEX["general"])
    v[idx] = 1.0
    return v


TEMPLATES: list[dict[str, Any]] = [
    # Customer Support
    {"id": "cs_formal",     "name": "Formal Support Agent",     "domain": "customer_support", "vector": _vec(2, 5, 2, "customer_support"), "base_tools": ["ticket_lookup", "knowledge_base"], "memory_strategy": "session"},
    {"id": "cs_friendly",   "name": "Friendly Support Agent",   "domain": "customer_support", "vector": _vec(2, 2, 3, "customer_support"), "base_tools": ["ticket_lookup", "faq_search"],     "memory_strategy": "session"},
    # Research
    {"id": "res_analyst",   "name": "Research Analyst",         "domain": "research",         "vector": _vec(4, 4, 4, "research"),         "base_tools": ["web_search", "summariser"],        "memory_strategy": "episodic"},
    {"id": "res_casual",    "name": "Research Buddy",           "domain": "research",         "vector": _vec(3, 2, 3, "research"),         "base_tools": ["web_search"],                      "memory_strategy": "episodic"},
    # Coding
    {"id": "code_auto",     "name": "Autonomous Dev Agent",     "domain": "coding",           "vector": _vec(5, 3, 5, "coding"),           "base_tools": ["code_execution", "file_write"],   "memory_strategy": "episodic"},
    {"id": "code_assist",   "name": "Coding Assistant",         "domain": "coding",           "vector": _vec(4, 3, 2, "coding"),           "base_tools": ["code_execution"],                 "memory_strategy": "session"},
    {"id": "code_review",   "name": "Code Reviewer",            "domain": "coding",           "vector": _vec(5, 4, 3, "coding"),           "base_tools": ["code_lint"],                      "memory_strategy": "session"},
    # Content
    {"id": "cont_creative", "name": "Creative Writer",          "domain": "content",          "vector": _vec(2, 2, 3, "content"),          "base_tools": ["web_search"],                      "memory_strategy": "session"},
    {"id": "cont_editor",   "name": "Content Editor",           "domain": "content",          "vector": _vec(3, 4, 2, "content"),          "base_tools": [],                                  "memory_strategy": "session"},
    {"id": "cont_seo",      "name": "SEO Content Strategist",   "domain": "content",          "vector": _vec(3, 4, 4, "content"),          "base_tools": ["web_search", "keyword_tool"],     "memory_strategy": "episodic"},
    # Data Analysis
    {"id": "data_analyst",  "name": "Data Analyst",             "domain": "data_analysis",    "vector": _vec(4, 4, 4, "data_analysis"),    "base_tools": ["code_execution", "csv_reader"],   "memory_strategy": "episodic"},
    {"id": "data_viz",      "name": "Data Visualisation Agent", "domain": "data_analysis",    "vector": _vec(4, 3, 3, "data_analysis"),    "base_tools": ["code_execution"],                 "memory_strategy": "session"},
    # General
    {"id": "gen_assistant", "name": "General Assistant",        "domain": "general",          "vector": _vec(3, 3, 3, "general"),          "base_tools": ["web_search"],                      "memory_strategy": "session"},
    {"id": "gen_tutor",     "name": "Learning Tutor",           "domain": "general",          "vector": _vec(2, 3, 1, "general"),          "base_tools": [],                                  "memory_strategy": "episodic"},
    {"id": "gen_exec_asst", "name": "Executive Assistant",      "domain": "general",          "vector": _vec(2, 5, 4, "general"),          "base_tools": ["calendar", "email"],              "memory_strategy": "long_term"},
    # ChatGPT-class Omni — high tech, balanced formality, high autonomy
    {"id": "gen_frontier",  "name": "Frontier Omni Assistant",  "domain": "general",          "vector": _vec(5, 3, 4, "general"),          "base_tools": list(FRONTIER_TOOLS),               "memory_strategy": "long_term"},
]


@dataclass
class AgentSpec:
    role: str
    domain: str
    tone: str
    tools: list[str]
    memory_strategy: str
    evaluation_criteria: list[str]
    matched_templates: list[dict]  # [{id, name, score}]
    rules_fired: list[str]
    capability_tier: str = "specialist"  # specialist | frontier
    capabilities: list[str] = field(default_factory=list)
    primary_goal: str = ""
    inspiration_product: str = ""
    inspiration_aspects: str = ""
    improve_focus: str = ""


def _cosine(u: list[float], t: list[float]) -> float:
    """
    cosine similarity = (u · t) / (|u| * |t|)
    Returns 0.0 if either vector is all-zeros.
    """
    dot = sum(a * b for a, b in zip(u, t))
    mag_u = math.sqrt(sum(a * a for a in u))
    mag_t = math.sqrt(sum(b * b for b in t))
    if mag_u == 0 or mag_t == 0:
        return 0.0
    return dot / (mag_u * mag_t)


def _profile_to_vector(profile: UserProfile) -> list[float]:
    v = [0.0] * VECTOR_DIM
    v[0] = profile.technical_level / 5.0
    v[1] = profile.formality / 5.0
    v[2] = profile.autonomy_preference / 5.0
    idx = DOMAIN_INDEX.get(profile.domain, DOMAIN_INDEX["general"])
    v[idx] = 1.0
    return v


def _apply_rules(
    profile: UserProfile,
    top_template: dict[str, Any],
    tools: list[str],
) -> tuple[list[str], str, list[str]]:
    """
    Rule engine — plain if/then authored rules.
    Returns (final_tools, tone, rules_fired).
    """
    rules_fired: list[str] = []
    final_tools = list(tools)

    # Autonomy-based tool additions
    if profile.domain == "coding" and profile.autonomy_preference >= 4:
        if "code_execution" not in final_tools:
            final_tools.append("code_execution")
        rules_fired.append("coding+high_autonomy→add_code_execution")

    # Memory strategy override
    if "no external" in " ".join(profile.constraints).lower():
        top_template["memory_strategy"] = "session_only"
        rules_fired.append("constraint:no_external→session_only_memory")

    # Tone mapping
    if profile.formality <= 2:
        tone = "casual and conversational"
        rules_fired.append("formality≤2→casual_tone")
    elif profile.formality >= 4:
        tone = "formal and professional"
        rules_fired.append("formality≥4→formal_tone")
    else:
        tone = "balanced and clear"

    # Suggested tools from profile
    for tool in profile.suggested_tools:
        if tool not in final_tools:
            final_tools.append(tool)
            rules_fired.append(f"profile_suggested→{tool}")

    return final_tools, tone, rules_fired


def compose_agent_spec(profile: UserProfile, answers: dict[str, Any] | None = None) -> AgentSpec:
    """
    §5.2: cosine-match the profile to template library, apply rule engine,
    return an AgentSpec ready for the Prompt Engineering Engine.
    Frontier / ChatGPT-class ambition forces the Omni template.
    """
    user_vector = _profile_to_vector(profile)
    frontier = is_frontier_ambition(profile, answers)

    # Score all templates
    scored = sorted(
        [{"template": t, "score": _cosine(user_vector, t["vector"])} for t in TEMPLATES],
        key=lambda x: x["score"],
        reverse=True,
    )

    if frontier:
        frontier_t = next(t for t in TEMPLATES if t["id"] == "gen_frontier")
        # Boost frontier to top while keeping transparent alternatives
        scored = [
            {"template": frontier_t, "score": max(0.97, scored[0]["score"] if scored else 0.97)},
            *[x for x in scored if x["template"]["id"] != "gen_frontier"],
        ]

    top3 = scored[:3]
    top_template = dict(top3[0]["template"])

    base_tools = list(top_template["base_tools"])
    final_tools, tone, rules_fired = _apply_rules(profile, top_template, base_tools)

    inspiration_product = str((answers or {}).get("inspiration_product") or "").strip()
    inspiration_aspects = str((answers or {}).get("inspiration_aspects") or "").strip()
    improve_focus = str((answers or {}).get("improve_focus") or "").strip()

    if frontier:
        for t in FRONTIER_TOOLS:
            if t not in final_tools:
                final_tools.append(t)
        top_template["memory_strategy"] = "long_term"
        if inspiration_product:
            rules_fired.append(
                f"inspiration→{inspiration_product}_strengths_not_clone"
            )
        else:
            rules_fired.append("frontier_ambition→original_omni_stack")
        tone = "clear, capable, and precise — calm when complexity rises"
        if inspiration_aspects and "calm" in inspiration_aspects.lower():
            tone = "calm, careful, and precise"
        evaluation_criteria = [
            "Helpful across domains without inventing facts",
            "Uses tools and files when they improve correctness",
            "Explains uncertainty and assumptions",
            "Structures complex answers; stays crisp on simple ones",
            "Escalates only on safety or missing critical evidence",
            "Never impersonates a commercial AI brand",
            "Tone matches a trusted original assistant",
        ]
        if improve_focus:
            evaluation_criteria.append(f"Delivers on improvement focus: {improve_focus}")
        role = (
            f"Original Omni Assistant (inspired by {inspiration_product})"
            if inspiration_product
            else "Frontier Omni Assistant"
        )
        capabilities = list(FRONTIER_CAPABILITIES)
        if inspiration_aspects:
            capabilities = [f"Priority: {inspiration_aspects}", *capabilities]
        tier = "frontier"
    else:
        evaluation_criteria = [
            "Response follows stated constraints",
            "Stays within domain scope",
            "Tone matches specified style",
            "Escalates correctly when out of scope",
        ]
        if "code_execution" in final_tools:
            evaluation_criteria.append("Code output is syntactically valid")
        role = top_template["name"]
        capabilities = []
        tier = "specialist"

    return AgentSpec(
        role=role,
        domain=profile.domain if not frontier else "general",
        tone=tone,
        tools=final_tools,
        memory_strategy=top_template.get("memory_strategy", "session"),
        evaluation_criteria=evaluation_criteria,
        matched_templates=[
            {"id": x["template"]["id"], "name": x["template"]["name"], "score": round(x["score"], 4)}
            for x in top3
        ],
        rules_fired=rules_fired,
        capability_tier=tier,
        capabilities=capabilities,
        primary_goal=profile.primary_goal or "",
        inspiration_product=inspiration_product,
        inspiration_aspects=inspiration_aspects,
        improve_focus=improve_focus,
    )
