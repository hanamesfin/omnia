"""
Product-inspiration detection — never clone branded AIs.

When a user says "Create Claude" / "ChatGPT" / "Cursor", OMNIA treats that as
inspiration: ask what they like, advise improvements, design an original agent.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class KnownProduct:
    id: str
    name: str
    aliases: tuple[str, ...]
    aspect_chips: tuple[str, ...]
    improve_chips: tuple[str, ...]
    strengths: tuple[str, ...]


KNOWN_PRODUCTS: tuple[KnownProduct, ...] = (
    KnownProduct(
        id="claude",
        name="Claude",
        aliases=("claude", "anthropic", "claude ai", "claude.ai"),
        aspect_chips=(
            "Deep reasoning",
            "Long-context conversations",
            "Coding assistance",
            "Writing quality",
            "Research",
            "Calm personality",
            "Step-by-step explanations",
            "Something else",
        ),
        improve_chips=(
            "Ground answers in my files & docs",
            "Stronger coding + review workflow",
            "Research with sources I can verify",
            "Calmer, safer defaults than a clone",
            "Specialize for my industry",
        ),
        strengths=("careful reasoning", "long context", "clear writing", "thoughtful refusals"),
    ),
    KnownProduct(
        id="chatgpt",
        name="ChatGPT",
        aliases=("chatgpt", "chat gpt", "gpt-4", "gpt4", "openai chat", "like gpt"),
        aspect_chips=(
            "Versatile all-round help",
            "Fast brainstorming",
            "Coding assistance",
            "Writing & drafting",
            "Tools / browsing feel",
            "Friendly personality",
            "Something else",
        ),
        improve_chips=(
            "Tighter specialty with clear success criteria",
            "Memory of my projects — not a generic chat",
            "Safer tool use with explicit escalation",
            "Workflows for my job, not one-size-fits-all",
            "Uploadable knowledge corpus",
        ),
        strengths=("broad capability", "approachable tone", "quick iteration"),
    ),
    KnownProduct(
        id="cursor",
        name="Cursor",
        aliases=("cursor", "cursor ai", "cursor.sh", "cursor ide"),
        aspect_chips=(
            "Inline coding help",
            "Repo-aware edits",
            "Agentic multi-file changes",
            "Code review quality",
            "Speed of iteration",
            "Chat-in-editor UX ideas",
            "Something else",
        ),
        improve_chips=(
            "Safer diffs — explain before big edits",
            "Test-and-verify loop after changes",
            "Domain standards (my stack / style guide)",
            "Pair-programming coach mode",
            "PR-ready summaries",
        ),
        strengths=("coding workflow", "repo context", "iterative edits"),
    ),
    KnownProduct(
        id="perplexity",
        name="Perplexity",
        aliases=("perplexity", "perplexity.ai", "perplexity ai"),
        aspect_chips=(
            "Cited research answers",
            "Fast web synthesis",
            "Follow-up questioning",
            "Neutral tone",
            "Comparisons & summaries",
            "Something else",
        ),
        improve_chips=(
            "Verify claims against my uploaded sources",
            "Decision briefs with residual risks",
            "Industry-specific research workflows",
            "Offline / private corpus first",
            "Clear 'unknown' when evidence is thin",
        ),
        strengths=("research synthesis", "citations vibe", "concise answers"),
    ),
    KnownProduct(
        id="lovable",
        name="Lovable",
        aliases=("lovable", "lovable.dev", "gpt engineer", "gptengineer"),
        aspect_chips=(
            "App scaffolding speed",
            "UI generation",
            "Full-stack prototypes",
            "Prompt-to-product flow",
            "Something else",
        ),
        improve_chips=(
            "Production-minded structure, not just a demo",
            "Accessibility & design system constraints",
            "Clear handoff to engineers",
            "Security defaults in generated UI",
            "Specialize for my product niche",
        ),
        strengths=("rapid prototyping", "UI momentum", "product scaffolding"),
    ),
    KnownProduct(
        id="devin",
        name="Devin",
        aliases=("devin", "devin ai", "cognition devin"),
        aspect_chips=(
            "Autonomous coding tasks",
            "Long-running agent loops",
            "Bug fixing",
            "Planning before coding",
            "Something else",
        ),
        improve_chips=(
            "Human checkpoints before risky actions",
            "Smaller, testable task slices",
            "Tight success criteria per run",
            "Repo conventions enforcement",
            "Transparent plan → act → verify",
        ),
        strengths=("agentic coding", "task planning", "iteration"),
    ),
)


def _blob_from_answers(answers: dict[str, Any] | None, extra: str = "") -> str:
    parts = [extra]
    if answers:
        parts.extend(str(v) for v in answers.values() if v is not None)
    return " ".join(parts).lower()


def detect_product(text: str = "", answers: dict[str, Any] | None = None) -> KnownProduct | None:
    """Return the strongest product mention, or None."""
    blob = _blob_from_answers(answers, text)
    if not blob.strip():
        return None
    # Prefer longest alias match to avoid short false positives
    best: KnownProduct | None = None
    best_len = 0
    for product in KNOWN_PRODUCTS:
        for alias in product.aliases:
            if alias in blob and len(alias) > best_len:
                best = product
                best_len = len(alias)
    return best


def inspiration_active(answers: dict[str, Any]) -> bool:
    return bool(answers.get("inspiration_product") or detect_product(answers=answers))


def ensure_inspiration_meta(answers: dict[str, Any], user_text: str = "") -> dict[str, Any]:
    """Persist product id/name when detected; never claim a clone."""
    out = dict(answers)
    product = detect_product(user_text, out)
    if product and not out.get("inspiration_product"):
        out["inspiration_product"] = product.name
        out["inspiration_product_id"] = product.id
        out["originality_rule"] = (
            f"Inspired by {product.name}'s strengths — original OMNIA agent, not a clone "
            f"or proprietary recreation."
        )
    return out


def aspect_chips_for(answers: dict[str, Any]) -> list[str]:
    pid = str(answers.get("inspiration_product_id") or "")
    product = next((p for p in KNOWN_PRODUCTS if p.id == pid), None)
    if not product:
        product = detect_product(answers=answers)
    if not product:
        return [
            "Deep reasoning",
            "Coding assistance",
            "Writing quality",
            "Research",
            "Personality / tone",
            "Workflow / UX ideas",
            "Something else",
        ]
    return list(product.aspect_chips)


def improve_chips_for(answers: dict[str, Any]) -> list[str]:
    pid = str(answers.get("inspiration_product_id") or "")
    product = next((p for p in KNOWN_PRODUCTS if p.id == pid), None)
    if not product:
        product = detect_product(answers=answers)
    base = list(product.improve_chips) if product else [
        "Clearer specialty and success criteria",
        "Better workflow automation",
        "Stronger guardrails",
        "Grounding in my knowledge files",
        "Better UX for my users",
    ]
    return base


def format_inspiration_question(answers: dict[str, Any]) -> str:
    name = str(answers.get("inspiration_product") or "that product")
    return (
        f"I can help you create an AI inspired by {name}'s strengths — not a clone. "
        f"Which aspects are most important to you?"
    )


def format_improve_question(answers: dict[str, Any]) -> str:
    name = str(answers.get("inspiration_product") or "the product you mentioned")
    return (
        f"As your AI architect: we won't recreate {name}. "
        f"What should we improve or specialize so yours is uniquely yours?"
    )


def advisor_insights(answers: dict[str, Any]) -> list[str]:
    """Startup-advisor style notes for blueprint / Create insight strip."""
    notes: list[str] = []
    product = None
    pid = str(answers.get("inspiration_product_id") or "")
    if pid:
        product = next((p for p in KNOWN_PRODUCTS if p.id == pid), None)
    if not product:
        product = detect_product(answers=answers)
    if product:
        notes.append(
            f"Inspiration: {product.name} — designing an original agent, never a brand clone."
        )
        aspects = str(answers.get("inspiration_aspects") or "").strip()
        if aspects:
            notes.append(f"Priorities you named: {aspects}.")
        improve = str(answers.get("improve_focus") or "").strip()
        if improve:
            notes.append(f"Improvement focus: {improve}.")
        else:
            notes.append(
                "Next: pick differentiators (workflows, corpus, guardrails) so this isn't a copy."
            )
    return notes


def originality_constraints(answers: dict[str, Any]) -> list[str]:
    """Hard rules folded into generation / prompts."""
    product = str(answers.get("inspiration_product") or "").strip()
    if not product:
        return []
    return [
        f"Do not claim to be {product} or any proprietary product.",
        f"Do not recreate {product}'s branded UI, trademark, or proprietary system prompt.",
        f"You may pursue similar goals (inspired by: {answers.get('inspiration_aspects', 'user priorities')}) "
        f"as an original OMNIA agent.",
    ]


def needs_inspiration_interview(answers: dict[str, Any]) -> bool:
    """True when a product was referenced but aspects not yet collected."""
    if answers.get("inspiration_aspects"):
        return False
    return detect_product(answers=answers) is not None
