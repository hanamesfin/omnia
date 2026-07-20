"""Local JSON knowledge store for standalone (no Postgres required)."""
from __future__ import annotations

import json
import threading
import time
from pathlib import Path
from typing import Any

from engines.knowledge.embedder import cosine
from engines.knowledge.store import (
    DocStatus,
    KnowledgeChunk,
    KnowledgeDocument,
    SearchHit,
)


class LocalKnowledgeStore:
    def __init__(self, root: Path | None = None) -> None:
        base = Path(__file__).resolve().parents[2]
        self._root = root or (base / ".omnia_knowledge")
        self._root.mkdir(parents=True, exist_ok=True)
        self._docs_path = self._root / "documents.json"
        self._chunks_path = self._root / "chunks.json"
        self._lock = threading.Lock()
        self._docs: dict[str, KnowledgeDocument] = {}
        self._chunks: dict[str, list[KnowledgeChunk]] = {}
        self._load()

    def _load(self) -> None:
        if self._docs_path.exists():
            try:
                raw = json.loads(self._docs_path.read_text(encoding="utf-8"))
                for row in raw.get("documents") or []:
                    doc = KnowledgeDocument.from_dict(row)
                    self._docs[doc.id] = doc
            except Exception:
                pass
        if self._chunks_path.exists():
            try:
                raw = json.loads(self._chunks_path.read_text(encoding="utf-8"))
                for doc_id, rows in (raw.get("chunks") or {}).items():
                    self._chunks[doc_id] = [
                        KnowledgeChunk(
                            id=str(c["id"]),
                            document_id=str(c["document_id"]),
                            chunk_index=int(c["chunk_index"]),
                            chunk_text=str(c["chunk_text"]),
                            embedding=list(c.get("embedding") or []),
                            metadata=dict(c.get("metadata") or {}),
                        )
                        for c in rows
                    ]
            except Exception:
                pass

    def _save(self) -> None:
        self._root.mkdir(parents=True, exist_ok=True)
        self._docs_path.write_text(
            json.dumps({"documents": [d.to_dict() for d in self._docs.values()]}, indent=2),
            encoding="utf-8",
        )
        payload: dict[str, Any] = {
            "chunks": {
                doc_id: [c.to_dict() for c in chunks]
                for doc_id, chunks in self._chunks.items()
            }
        }
        self._chunks_path.write_text(json.dumps(payload), encoding="utf-8")

    def upsert_document(self, doc: KnowledgeDocument) -> KnowledgeDocument:
        with self._lock:
            doc.updated_at = time.time()
            self._docs[doc.id] = doc
            self._save()
            return doc

    def get_document(self, doc_id: str) -> KnowledgeDocument | None:
        return self._docs.get(doc_id)

    def set_status(self, doc_id: str, status: DocStatus, error: str = "") -> KnowledgeDocument | None:
        with self._lock:
            doc = self._docs.get(doc_id)
            if not doc:
                return None
            doc.status = status
            doc.error = error
            doc.updated_at = time.time()
            self._save()
            return doc

    def list_documents(
        self,
        *,
        session_id: str | None = None,
        agent_id: str | None = None,
        owner_id: str | None = None,
    ) -> list[KnowledgeDocument]:
        docs = list(self._docs.values())
        if session_id is not None:
            docs = [d for d in docs if d.session_id == session_id]
        if agent_id is not None:
            docs = [d for d in docs if d.agent_id == agent_id]
        if owner_id is not None:
            docs = [d for d in docs if d.owner_id == owner_id]
        return sorted(docs, key=lambda d: d.created_at)

    def replace_chunks(self, document_id: str, chunks: list[KnowledgeChunk]) -> None:
        with self._lock:
            self._chunks[document_id] = chunks
            self._save()

    def bind_agent(self, session_id: str, agent_id: str) -> int:
        with self._lock:
            n = 0
            for doc in self._docs.values():
                if doc.session_id == session_id:
                    doc.agent_id = agent_id
                    doc.updated_at = time.time()
                    n += 1
            self._save()
            return n

    def search(
        self,
        query_embedding: list[float],
        *,
        session_id: str | None = None,
        agent_id: str | None = None,
        document_id: str | None = None,
        top_k: int = 5,
    ) -> list[SearchHit]:
        docs = self.list_documents(session_id=session_id, agent_id=agent_id)
        if document_id:
            docs = [d for d in docs if d.id == document_id]
        doc_map = {d.id: d for d in docs}
        hits: list[SearchHit] = []
        for did, chunks in self._chunks.items():
            if did not in doc_map:
                continue
            doc = doc_map[did]
            if doc.status != "ready":
                continue
            for ch in chunks:
                score = cosine(query_embedding, ch.embedding)
                hits.append(
                    SearchHit(
                        chunk_text=ch.chunk_text,
                        score=score,
                        document_id=did,
                        filename=doc.filename,
                        chunk_index=ch.chunk_index,
                        metadata=dict(ch.metadata),
                    )
                )
        hits.sort(key=lambda h: h.score, reverse=True)
        return hits[: max(1, top_k)]

    def delete_session_docs(self, session_id: str, keep_upload_ids: set[str] | None = None) -> None:
        keep = keep_upload_ids or set()
        with self._lock:
            remove_ids = [
                d.id
                for d in self._docs.values()
                if d.session_id == session_id and d.upload_id not in keep
            ]
            for rid in remove_ids:
                self._docs.pop(rid, None)
                self._chunks.pop(rid, None)
            self._save()

    def delete_agent_docs(self, agent_id: str) -> int:
        """Remove all knowledge docs/chunks bound to an agent (CON-01 / agent delete)."""
        with self._lock:
            remove_ids = [d.id for d in self._docs.values() if d.agent_id == agent_id]
            for rid in remove_ids:
                self._docs.pop(rid, None)
                self._chunks.pop(rid, None)
            if remove_ids:
                self._save()
            return len(remove_ids)

    def clear_all(self) -> None:
        """Full wipe for demo reset (DEF-02)."""
        with self._lock:
            self._docs.clear()
            self._chunks.clear()
            self._save()
