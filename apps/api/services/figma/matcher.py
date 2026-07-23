"""Match a user prompt to the best-fitting Figma template via embeddings or keyword fallback."""

from __future__ import annotations

import math
import re
from typing import Any

# Seed index — Collections App Make file is the primary curation/editorial chrome reference.
# Placeholder entries are clearly marked; replace node_ids when real frames are catalogued.
SEED_TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "collections_curation",
        "file_key": "dismXXnVXKBKDmUrzz7FVE",
        "node_id": "0:1",
        "domain": "curation",
        "description": (
            "Collections App / Trove — soft gray canvas, centered brand, frosted bottom pill nav, "
            "editorial display type, white content surfaces, black primary actions, curated collections grid"
        ),
        "design_tokens": {
            "bg": "#f4f4f4",
            "fg": "#000000",
            "surface": "#ffffff",
            "muted": "#999999",
            "font_display": "Platypi",
            "font_sans": "Host Grotesk",
            "nav": "bottom_pill",
        },
        "keywords": [
            "collection",
            "curation",
            "gallery",
            "library",
            "editorial",
            "trove",
            "catalog",
            "bookmark",
            "save",
            "aesthetic",
        ],
        "seed": True,
    },
    {
        "id": "saas_workspace",
        "file_key": "PLACEHOLDER_saas_workspace",  # seed — replace with real file_key
        "node_id": "0:1",
        "domain": "saas",
        "description": (
            "Vertical SaaS workspace — project list, AI work surface, library assets, "
            "insights analytics, integrations, team settings"
        ),
        "design_tokens": {
            "bg": "#f4f4f4",
            "fg": "#000000",
            "surface": "#ffffff",
            "nav": "bottom_pill",
        },
        "keywords": [
            "saas",
            "workspace",
            "project",
            "dashboard",
            "team",
            "integration",
            "insights",
            "productivity",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "clinical_trust",
        "file_key": "PLACEHOLDER_clinical_trust",  # seed — replace with real file_key
        "node_id": "0:1",
        "domain": "healthcare",
        "description": (
            "Clinical product chrome — patient roster, labs, appointments, prescriptions, "
            "compliance audit trail, calm trust palette"
        ),
        "design_tokens": {
            "bg": "#f4f4f4",
            "fg": "#1a2b3c",
            "accent": "#0b6e4f",
            "nav": "bottom_pill",
        },
        "keywords": [
            "medical",
            "patient",
            "clinic",
            "health",
            "lab",
            "prescription",
            "hipaa",
            "clinical",
            "ehr",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "dev_platform",
        "file_key": "PLACEHOLDER_dev_platform",  # seed — replace with real file_key
        "node_id": "0:1",
        "domain": "coding",
        "description": (
            "Developer platform — repositories, pull requests, deployments, terminal, "
            "docs generation, plugin surface"
        ),
        "design_tokens": {
            "bg": "#f4f4f4",
            "fg": "#0b0d10",
            "font_mono": "IBM Plex Mono",
            "nav": "bottom_pill",
        },
        "keywords": [
            "code",
            "repo",
            "pull request",
            "developer",
            "ide",
            "deploy",
            "github",
            "terminal",
            "ci",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "job_search",
        "file_key": "PLACEHOLDER_job_search",  # seed — replace with real file_key
        "node_id": "0:1",
        "domain": "career",
        "description": (
            "Job search product — applications pipeline, resume lab, interview prep, "
            "analytics funnel, career coaching"
        ),
        "design_tokens": {
            "bg": "#f4f4f4",
            "fg": "#0a0a0a",
            "nav": "bottom_pill",
        },
        "keywords": [
            "job",
            "resume",
            "cv",
            "interview",
            "career",
            "hiring",
            "application",
            "candidate",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "travel_planner",
        "file_key": "PLACEHOLDER_travel_planner",  # seed — replace with real file_key
        "node_id": "0:1",
        "domain": "travel",
        "description": (
            "Travel planner — trips, itineraries, maps, bookings, budgets, collaborative planning"
        ),
        "design_tokens": {
            "bg": "#f4f4f4",
            "fg": "#1f2a24",
            "nav": "bottom_pill",
        },
        "keywords": [
            "travel",
            "trip",
            "itinerary",
            "flight",
            "hotel",
            "booking",
            "map",
            "vacation",
        ],
        "seed": True,
        "placeholder": True,
    },
]


def find_best_figma_template(user_prompt: str, domain: str = "") -> dict[str, Any]:
    """
    Embed user_prompt and cosine-similarity against the seed template index.
    Falls back to keyword/domain Jaccard (TF-IDF-ish) when embeddings are unavailable.
    Returns top-matching template metadata plus score/method.
    """
    prompt = (user_prompt or "").strip()
    domain_norm = (domain or "").strip().lower()
    index = list(SEED_TEMPLATES)
    if not index:
        return _empty_match()

    # Prefer real Collections file when domain/keywords clearly match curation.
    scored: list[tuple[float, dict[str, Any], str]] = []
    use_embeddings = True
    query_vec: list[float] | None = None
    try:
        from engines.knowledge.embedder import cosine, embed

        query_vec = embed(f"{domain_norm} {prompt}".strip())
        if not query_vec:
            use_embeddings = False
    except Exception:
        use_embeddings = False

    for tmpl in index:
        method = "embedding"
        if use_embeddings and query_vec is not None:
            try:
                from engines.knowledge.embedder import cosine, embed

                doc = " ".join(
                    [
                        str(tmpl.get("domain") or ""),
                        str(tmpl.get("description") or ""),
                        " ".join(tmpl.get("keywords") or []),
                    ]
                )
                score = float(cosine(query_vec, embed(doc)))
            except Exception:
                score = _keyword_score(prompt, domain_norm, tmpl)
                method = "keyword"
        else:
            score = _keyword_score(prompt, domain_norm, tmpl)
            method = "keyword"

        # Soft boost for exact domain tag match
        if domain_norm and domain_norm in str(tmpl.get("domain") or "").lower():
            score += 0.08
        scored.append((score, tmpl, method))

    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best, method = scored[0]
    out = dict(best)
    out["score"] = round(best_score, 4)
    out["match_method"] = method
    out["candidates"] = [
        {
            "id": t.get("id"),
            "domain": t.get("domain"),
            "score": round(s, 4),
            "placeholder": bool(t.get("placeholder")),
        }
        for s, t, _ in scored[:4]
    ]
    return out


def _keyword_score(prompt: str, domain: str, tmpl: dict[str, Any]) -> float:
    """Jaccard + TF-IDF-style overlap when embedding API is unavailable."""
    prompt_tokens = _tokenize(f"{domain} {prompt}")
    doc_tokens = _tokenize(
        " ".join(
            [
                str(tmpl.get("domain") or ""),
                str(tmpl.get("description") or ""),
                " ".join(tmpl.get("keywords") or []),
            ]
        )
    )
    if not prompt_tokens or not doc_tokens:
        return 0.0

    # Domain exact match
    domain_bonus = 0.25 if domain and domain == str(tmpl.get("domain") or "").lower() else 0.0

    inter = prompt_tokens & doc_tokens
    union = prompt_tokens | doc_tokens
    jaccard = len(inter) / len(union) if union else 0.0

    # Lightweight IDF: rarer overlapping tokens weigh more within this tiny corpus
    corpus = [_tokenize(str(t.get("description") or "") + " " + " ".join(t.get("keywords") or [])) for t in SEED_TEMPLATES]
    n = len(corpus) or 1
    tfidf = 0.0
    for tok in inter:
        df = sum(1 for c in corpus if tok in c) or 1
        idf = math.log((n + 1) / df) + 1.0
        tfidf += idf
    tfidf_norm = tfidf / (len(inter) * 3.0) if inter else 0.0
    return min(1.0, 0.55 * jaccard + 0.45 * min(1.0, tfidf_norm) + domain_bonus)


def _tokenize(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9_]+", (text or "").lower()) if len(t) > 2}


def _empty_match() -> dict[str, Any]:
    return {
        "id": "",
        "file_key": "",
        "node_id": "",
        "domain": "",
        "description": "",
        "design_tokens": {},
        "score": 0.0,
        "match_method": "none",
        "candidates": [],
    }
