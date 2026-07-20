"""Async index pipeline: chunk → embed → store."""
from __future__ import annotations

import asyncio
from typing import Callable

import structlog

from engines.knowledge.chunker import chunk_text
from engines.knowledge.embedder import embed
from engines.knowledge.store import KnowledgeChunk, KnowledgeStore, new_id

log = structlog.get_logger()

TextLoader = Callable[[str], str]


async def index_document(
    store: KnowledgeStore,
    document_id: str,
    *,
    load_text: TextLoader,
) -> None:
    """
    Mark processing → chunk+embed → ready|failed.
    `load_text(upload_id)` returns full extracted text for the upload.
    """
    doc = store.get_document(document_id)
    if not doc:
        return
    store.set_status(document_id, "processing")
    try:
        text = await asyncio.to_thread(load_text, doc.upload_id)
        pieces = chunk_text(text)
        if not pieces:
            store.set_status(document_id, "failed", error="No extractable text")
            return

        chunks: list[KnowledgeChunk] = []
        for i, piece in enumerate(pieces):
            emb = await asyncio.to_thread(embed, piece)
            chunks.append(
                KnowledgeChunk(
                    id=new_id(),
                    document_id=document_id,
                    chunk_index=i,
                    chunk_text=piece,
                    embedding=emb,
                    metadata={"filename": doc.filename},
                )
            )
        store.replace_chunks(document_id, chunks)
        store.set_status(document_id, "ready")
        log.info("knowledge.indexed", document_id=document_id, chunks=len(chunks))
    except Exception as e:
        log.warning("knowledge.index_failed", document_id=document_id, error=str(e))
        store.set_status(document_id, "failed", error=str(e)[:500])


def schedule_index(
    store: KnowledgeStore,
    document_id: str,
    *,
    load_text: TextLoader,
) -> None:
    """Fire-and-forget indexing on the running event loop."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(index_document(store, document_id, load_text=load_text))
    except RuntimeError:
        asyncio.run(index_document(store, document_id, load_text=load_text))
