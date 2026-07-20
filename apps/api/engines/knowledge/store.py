"""Knowledge store interface + document/chunk records."""
from __future__ import annotations

import time
import uuid
from dataclasses import asdict, dataclass, field
from typing import Any, Literal, Protocol

DocStatus = Literal["pending", "processing", "ready", "failed"]


def new_id() -> str:
    return str(uuid.uuid4())


@dataclass
class KnowledgeDocument:
    id: str
    owner_id: str
    filename: str
    upload_id: str = ""
    session_id: str | None = None
    agent_id: str | None = None
    status: DocStatus = "pending"
    error: str = ""
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> KnowledgeDocument:
        return cls(
            id=str(raw["id"]),
            owner_id=str(raw.get("owner_id") or ""),
            filename=str(raw.get("filename") or ""),
            upload_id=str(raw.get("upload_id") or ""),
            session_id=raw.get("session_id"),
            agent_id=raw.get("agent_id"),
            status=raw.get("status") or "pending",  # type: ignore[arg-type]
            error=str(raw.get("error") or ""),
            created_at=float(raw.get("created_at") or time.time()),
            updated_at=float(raw.get("updated_at") or time.time()),
        )


@dataclass
class KnowledgeChunk:
    id: str
    document_id: str
    chunk_index: int
    chunk_text: str
    embedding: list[float]
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class SearchHit:
    chunk_text: str
    score: float
    document_id: str
    filename: str = ""
    chunk_index: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class KnowledgeStore(Protocol):
    def upsert_document(self, doc: KnowledgeDocument) -> KnowledgeDocument: ...
    def get_document(self, doc_id: str) -> KnowledgeDocument | None: ...
    def set_status(self, doc_id: str, status: DocStatus, error: str = "") -> KnowledgeDocument | None: ...
    def list_documents(
        self,
        *,
        session_id: str | None = None,
        agent_id: str | None = None,
        owner_id: str | None = None,
    ) -> list[KnowledgeDocument]: ...
    def replace_chunks(self, document_id: str, chunks: list[KnowledgeChunk]) -> None: ...
    def bind_agent(self, session_id: str, agent_id: str) -> int: ...
    def search(
        self,
        query_embedding: list[float],
        *,
        session_id: str | None = None,
        agent_id: str | None = None,
        document_id: str | None = None,
        top_k: int = 5,
    ) -> list[SearchHit]: ...
    def delete_session_docs(self, session_id: str, keep_upload_ids: set[str] | None = None) -> None: ...
    def delete_agent_docs(self, agent_id: str) -> int: ...
    def clear_all(self) -> None: ...
