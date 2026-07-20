"""Enterprise Knowledge Layer — RAG over uploaded documents."""
from __future__ import annotations

from pathlib import Path

from engines.knowledge.local_store import LocalKnowledgeStore
from engines.knowledge.pg_store import PgKnowledgeStore
from engines.knowledge.store import KnowledgeDocument, KnowledgeStore, new_id
from engines.knowledge.pipeline import schedule_index, index_document
from engines.knowledge.search import search_knowledge, format_hits

_store: KnowledgeStore | None = None


def get_knowledge_store(root: Path | None = None) -> KnowledgeStore:
    """Prefer Postgres when available; otherwise local JSON store."""
    global _store
    if root is not None:
        return LocalKnowledgeStore(root=root)
    if _store is None:
        pg = PgKnowledgeStore()
        _store = pg if pg.available else LocalKnowledgeStore()
    return _store


def reset_knowledge_store_for_tests(store: KnowledgeStore | None = None) -> None:
    global _store
    _store = store


__all__ = [
    "KnowledgeDocument",
    "KnowledgeStore",
    "LocalKnowledgeStore",
    "PgKnowledgeStore",
    "get_knowledge_store",
    "reset_knowledge_store_for_tests",
    "new_id",
    "schedule_index",
    "index_document",
    "search_knowledge",
    "format_hits",
]
