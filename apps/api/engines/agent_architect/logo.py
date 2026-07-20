"""
Agent logo suggestions — App Store–style motif + palette from purpose.
Ranks motifs by how hard they hit the generated agent's brief.
Optional DALL·E illustrated icons when a real OpenAI key is present.
"""
from __future__ import annotations

from typing import Any

from config import settings

MOTIF_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("bug", ("bug", "triage", "debug", "error", "stack", "crash")),
    ("code", ("code", "pr", "review", "diff", "git", "dev", "program", "swift", "python")),
    ("pen", ("write", "letter", "content", "draft", "essay", "copy", "blog", "notes")),
    ("book", ("research", "source", "study", "learn", "education", "paper", "read")),
    ("chart", ("data", "csv", "table", "analy", "insight", "metric", "budget", "financ")),
    ("chat", ("chat", "support", "companion", "conversation", "help desk", "qa")),
    ("inbox", ("inbox", "email", "mail", "message", "sorter", "label")),
    ("shield", ("safe", "secur", "privacy", "policy", "compliance", "guard")),
    ("waves", ("audio", "voice", "music", "sound", "meeting", "transcript")),
    ("leaf", ("health", "wellness", "green", "nature", "calm")),
    ("bolt", ("fast", "auto", "automation", "workflow", "speed", "power")),
    ("target", ("goal", "plan", "coach", "focus", "habit")),
    ("gear", ("tool", "util", "settings", "ops", "system")),
    ("heart", ("care", "wellbeing", "empathy", "mental")),
    ("globe", ("translate", "world", "travel", "local", "language", "global")),
    ("spark", ("omni", "general", "ai", "assistant", "frontier", "chatgpt")),
]

PALETTES = [
    "ocean", "mint", "violet", "sunset", "rose", "graphite", "indigo", "teal",
]

MOTIF_LABELS = {
    "spark": "Spark",
    "chat": "Conversation",
    "code": "Developer",
    "bug": "Debug",
    "pen": "Writer",
    "book": "Research",
    "chart": "Insights",
    "shield": "Trust",
    "inbox": "Inbox",
    "waves": "Audio",
    "leaf": "Wellness",
    "bolt": "Automation",
    "target": "Coach",
    "gear": "Tools",
    "heart": "Care",
    "globe": "World",
}

# Soft fallbacks when the brief only weakly matches
_FALLBACK_MOTIFS = ("spark", "bolt", "globe", "gear", "target", "chat", "pen", "chart")


def _score_motifs(*texts: str) -> list[tuple[str, int]]:
    blob = " ".join(texts).lower()
    scored: list[tuple[str, int]] = []
    for motif, keys in MOTIF_KEYWORDS:
        hits = sum(1 for k in keys if k in blob)
        if hits:
            # Name/purpose hits should surface first; multi-keyword = stronger fit
            scored.append((motif, hits * 10 + (4 if motif in blob else 0)))
    scored.sort(key=lambda x: (-x[1], x[0]))
    return scored


def _hash(s: str) -> int:
    h = 0
    for ch in s:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return h


def suggest_logos(
    *,
    name: str,
    purpose: str = "",
    domain: str = "",
    kind: str = "",
    count: int = 4,
) -> list[dict[str, Any]]:
    """Return logo options ordered by how well they hit this agent."""
    ranked = _score_motifs(name, purpose, domain, kind)
    motifs: list[str] = [m for m, _ in ranked]
    for m in _FALLBACK_MOTIFS:
        if m not in motifs:
            motifs.append(m)
        if len(motifs) >= count:
            break
    h = _hash(f"{name}|{purpose}|{domain}")
    out: list[dict[str, Any]] = []
    for i, motif in enumerate(motifs[:count]):
        fit = next((s for m, s in ranked if m == motif), 0)
        palette_id = PALETTES[(h + i * 3) % len(PALETTES)]
        label = f"{MOTIF_LABELS.get(motif, motif)} · {palette_id}"
        if i == 0 and fit > 0:
            label = f"Best fit · {label}"
        out.append(
            {
                "motif": motif,
                "palette_id": palette_id,
                "label": label,
                "fit_score": fit,
            }
        )
    return out


def _openai_usable() -> bool:
    key = (settings.OPENAI_API_KEY or "").strip()
    return bool(key) and not key.startswith("sk-your-") and key != "sk-unset"


async def maybe_illustrate_logo(logo: dict[str, Any], name: str, purpose: str) -> dict[str, Any]:
    """Attach an illustrated DALL·E app icon when live key exists; else unchanged."""
    if not _openai_usable() or settings.DEMO_MODE:
        return logo
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.strip())
        motif = logo.get("motif") or "spark"
        brief = (purpose or name or "AI assistant").strip()[:160]
        prompt = (
            "Premium iOS app icon, soft rounded squircle canvas filling the frame, "
            "rich illustrated 3D object (not a flat glyph), soft studio lighting, "
            f"subject inspired by '{motif}' that clearly represents the app '{name}': {brief}. "
            "Apple App Store product photography vibe — tactile materials, depth, "
            "friendly and polished. No text, no letters, no watermark, no UI chrome, "
            "single centered subject, transparent-feel soft gradient background."
        )
        result = await client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        url = result.data[0].url if result.data else None
        if url:
            return {
                **logo,
                "image_url": url,
                "label": f"Illustrated · {logo.get('label', motif)}",
            }
    except Exception:
        pass
    return logo
