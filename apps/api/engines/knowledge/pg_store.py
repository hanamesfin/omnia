"""Postgres + pgvector knowledge store. Falls back gracefully if DB unavailable."""
from __future__ import annotations

import time
from typing import Any

import structlog

from engines.knowledge.embedder import cosine
from engines.knowledge.store import (
    DocStatus,
    KnowledgeChunk,
    KnowledgeDocument,
    SearchHit,
)

log = structlog.get_logger()


class PgKnowledgeStore:
    """
    Sync-style wrapper using SQLAlchemy sync engine when available.
    Prefer LocalKnowledgeStore for standalone demos without Postgres.
    """

    def __init__(self) -> None:
        self._ok = False
        self._Session = None
        try:
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            from config import settings

            url = (settings.DATABASE_URL or "").replace("+asyncpg", "")
            if not url or "postgresql" not in url:
                return
            engine = create_engine(url, pool_pre_ping=True)
            self._Session = sessionmaker(bind=engine)
            # Ensure tables exist (lightweight; alembic preferred in prod)
            from models import KnowledgeDocumentRow, KnowledgeChunkRow  # noqa: F401
            from database import Base

            Base.metadata.create_all(
                bind=engine,
                tables=[
                    KnowledgeDocumentRow.__table__,
                    KnowledgeChunkRow.__table__,
                ],
            )
            self._ok = True
        except Exception as e:
            log.info("knowledge.pg_unavailable", error=str(e))
            self._ok = False

    @property
    def available(self) -> bool:
        return self._ok and self._Session is not None

    def upsert_document(self, doc: KnowledgeDocument) -> KnowledgeDocument:
        from models import KnowledgeDocumentRow

        assert self._Session
        with self._Session() as s:
            row = s.get(KnowledgeDocumentRow, doc.id)
            if not row:
                row = KnowledgeDocumentRow(id=doc.id)
                s.add(row)
            row.owner_id = doc.owner_id
            row.session_id = doc.session_id
            row.agent_id = doc.agent_id
            row.upload_id = doc.upload_id
            row.filename = doc.filename
            row.status = doc.status
            row.error = doc.error or None
            s.commit()
            return doc

    def get_document(self, doc_id: str) -> KnowledgeDocument | None:
        from models import KnowledgeDocumentRow

        assert self._Session
        with self._Session() as s:
            row = s.get(KnowledgeDocumentRow, doc_id)
            if not row:
                return None
            return self._doc_from_row(row)

    def set_status(self, doc_id: str, status: DocStatus, error: str = "") -> KnowledgeDocument | None:
        from models import KnowledgeDocumentRow

        assert self._Session
        with self._Session() as s:
            row = s.get(KnowledgeDocumentRow, doc_id)
            if not row:
                return None
            row.status = status
            row.error = error or None
            s.commit()
            return self._doc_from_row(row)

    def list_documents(
        self,
        *,
        session_id: str | None = None,
        agent_id: str | None = None,
        owner_id: str | None = None,
    ) -> list[KnowledgeDocument]:
        from models import KnowledgeDocumentRow
        from sqlalchemy import select

        assert self._Session
        with self._Session() as s:
            q = select(KnowledgeDocumentRow)
            if session_id is not None:
                q = q.where(KnowledgeDocumentRow.session_id == session_id)
            if agent_id is not None:
                q = q.where(KnowledgeDocumentRow.agent_id == agent_id)
            if owner_id is not None:
                q = q.where(KnowledgeDocumentRow.owner_id == owner_id)
            rows = s.scalars(q).all()
            return [self._doc_from_row(r) for r in rows]

    def replace_chunks(self, document_id: str, chunks: list[KnowledgeChunk]) -> None:
        from models import KnowledgeChunkRow
        from sqlalchemy import delete

        assert self._Session
        with self._Session() as s:
            s.execute(delete(KnowledgeChunkRow).where(KnowledgeChunkRow.document_id == document_id))
            for ch in chunks:
                s.add(
                    KnowledgeChunkRow(
                        id=ch.id,
                        document_id=ch.document_id,
                        chunk_index=ch.chunk_index,
                        chunk_text=ch.chunk_text,
                        embedding=ch.embedding,
                        meta=ch.metadata,
                    )
                )
            s.commit()

    def bind_agent(self, session_id: str, agent_id: str) -> int:
        from models import KnowledgeDocumentRow
        from sqlalchemy import select

        assert self._Session
        with self._Session() as s:
            rows = s.scalars(
                select(KnowledgeDocumentRow).where(KnowledgeDocumentRow.session_id == session_id)
            ).all()
            for row in rows:
                row.agent_id = agent_id
            s.commit()
            return len(rows)

    def search(
        self,
        query_embedding: list[float],
        *,
        session_id: str | None = None,
        agent_id: str | None = None,
        document_id: str | None = None,
        top_k: int = 5,
    ) -> list[SearchHit]:
        """Cosine in Python over filtered chunks (portable; pgvector distance optional later)."""
        from models import KnowledgeChunkRow, KnowledgeDocumentRow
        from sqlalchemy import select

        assert self._Session
        docs = self.list_documents(session_id=session_id, agent_id=agent_id)
        if document_id:
            docs = [d for d in docs if d.id == document_id]
        ready_ids = {d.id for d in docs if d.status == "ready"}
        doc_map = {d.id: d for d in docs}
        if not ready_ids:
            return []
        with self._Session() as s:
            q = select(KnowledgeChunkRow).where(KnowledgeChunkRow.document_id.in_(ready_ids))
            if document_id:
                q = q.where(KnowledgeChunkRow.document_id == document_id)
            rows = s.scalars(q).all()
        hits: list[SearchHit] = []
        for row in rows:
            emb = list(row.embedding or [])
            score = cosine(query_embedding, emb)
            doc = doc_map.get(row.document_id)
            hits.append(
                SearchHit(
                    chunk_text=row.chunk_text,
                    score=score,
                    document_id=row.document_id,
                    filename=doc.filename if doc else "",
                    chunk_index=row.chunk_index,
                    metadata=dict(row.meta or {}),
                )
            )
        hits.sort(key=lambda h: h.score, reverse=True)
        return hits[: max(1, top_k)]

    def delete_session_docs(self, session_id: str, keep_upload_ids: set[str] | None = None) -> None:
        from models import KnowledgeDocumentRow, KnowledgeChunkRow
        from sqlalchemy import select, delete

        keep = keep_upload_ids or set()
        assert self._Session
        with self._Session() as s:
            rows = s.scalars(
                select(KnowledgeDocumentRow).where(KnowledgeDocumentRow.session_id == session_id)
            ).all()
            for row in rows:
                if row.upload_id in keep:
                    continue
                s.execute(delete(KnowledgeChunkRow).where(KnowledgeChunkRow.document_id == row.id))
                s.delete(row)
            s.commit()

    def delete_agent_docs(self, agent_id: str) -> int:
        from models import KnowledgeDocumentRow, KnowledgeChunkRow
        from sqlalchemy import select, delete

        assert self._Session
        with self._Session() as s:
            rows = s.scalars(
                select(KnowledgeDocumentRow).where(KnowledgeDocumentRow.agent_id == agent_id)
            ).all()
            for row in rows:
                s.execute(delete(KnowledgeChunkRow).where(KnowledgeChunkRow.document_id == row.id))
                s.delete(row)
            s.commit()
            return len(rows)

    def clear_all(self) -> None:
        from models import KnowledgeDocumentRow, KnowledgeChunkRow
        from sqlalchemy import delete

        if not self._Session:
            return
        with self._Session() as s:
            s.execute(delete(KnowledgeChunkRow))
            s.execute(delete(KnowledgeDocumentRow))
            s.commit()

    @staticmethod
    def _doc_from_row(row: Any) -> KnowledgeDocument:
        return KnowledgeDocument(
            id=row.id,
            owner_id=row.owner_id,
            filename=row.filename,
            upload_id=row.upload_id or "",
            session_id=row.session_id,
            agent_id=row.agent_id,
            status=row.status,
            error=row.error or "",
            created_at=time.mktime(row.created_at.timetuple()) if row.created_at else time.time(),
            updated_at=time.mktime(row.updated_at.timetuple()) if row.updated_at else time.time(),
        )
