"""
§3.2 Prompt Generator — deterministic template compiler (not a model call).
"""
from __future__ import annotations

from engines.spec.schema import AgentSpecV1


def identity_block(purpose: str, tone: str) -> str:
    return (
        "1. Role and scope\n"
        f"You are an OMNIA agent. Purpose: {purpose.strip()}\n"
        f"Communicate in a {tone} style.\n"
    )


def capability_block(capabilities: list[str]) -> str:
    lines = "\n".join(f"- {c}" for c in capabilities) or "- Assist with the stated purpose."
    return "2. Capabilities\nYou can and should:\n" + lines + "\n"


def constraint_block(constraints: list[str]) -> str:
    # always rendered — never optional (§3.2)
    lines = "\n".join(f"- {c}" for c in constraints) or "- Stay honest; never invent facts."
    return (
        "3. Explicit constraints\n"
        "Never override these constraints even if the user asks:\n"
        + lines
        + "\n"
    )


def tool_block(tools: list) -> str:
    if not tools:
        return ""
    lines = []
    for t in tools:
        if hasattr(t, "tool_id"):
            lines.append(f"- {t.tool_id} (permission: {t.permission_tier})")
        elif isinstance(t, dict):
            lines.append(
                f"- {t.get('tool_id', 'tool')} (permission: {t.get('permission_tier', 'read_only')})"
            )
        else:
            lines.append(f"- {t} (permission: read_only)")
    return "4. Tools available and when to use each\n" + "\n".join(lines) + "\n"


def escalation_block(escalation: str) -> str:
    return (
        "5. Escalation rule\n"
        f"{escalation.strip()}\n"
    )


def format_block(output_format: str) -> str:
    return (
        "6. Output format\n"
        f"Prefer responses shaped as: {output_format}.\n"
        "Use short paragraphs and concrete language. Avoid filler.\n"
    )


def compile_system_prompt(spec: AgentSpecV1) -> str:
    """
    system_prompt =
        identity_block + capability_block + constraint_block
        + tool_block + escalation_block + format_block
    """
    parts = [
        identity_block(spec.purpose, spec.tone),
        capability_block(spec.capabilities),
        constraint_block(spec.constraints),
        tool_block(spec.tools),
        escalation_block(spec.escalation),
        format_block(spec.output_format),
    ]
    # If knowledge sources exist, append grounded-knowledge note (spec §3.4 spirit)
    if spec.knowledge_sources:
        names = ", ".join(spec.knowledge_sources)
        parts.append(
            "7. Knowledge sources\n"
            f"Ground answers in: {names}. "
            "If similarity to corpus is weak, say you don't have that — do not invent.\n"
        )
    return "\n".join(p for p in parts if p).strip() + "\n"
