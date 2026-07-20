"""Query-time retrieval over knowledge chunks."""
from __future__ import annotations

from engines.knowledge.embedder import embed
from engines.knowledge.store import KnowledgeStore, SearchHit


def search_knowledge(
    store: KnowledgeStore,
    query: str,
    *,
    session_id: str | None = None,
    agent_id: str | None = None,
    document_id: str | None = None,
    top_k: int = 5,
) -> list[SearchHit]:
    q = (query or "").strip()
    if not q:
        return []
    emb = embed(q)
    return store.search(
        emb,
        session_id=session_id,
        agent_id=agent_id,
        document_id=document_id,
        top_k=top_k,
    )


def format_hits(hits: list[SearchHit]) -> str:
    if not hits:
        return "No matching knowledge found."
    lines = []
    for i, h in enumerate(hits, 1):
        src = h.filename or h.document_id
        lines.append(f"[{i}] ({src}, score={h.score:.3f})\n{h.chunk_text}")
    return "\n\n".join(lines)
