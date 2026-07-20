"""
Memory Engine — §5.6
Tiered retrieval-augmented context:
  - Session tier: Redis (cleared on session end)
  - Episodic tier: Postgres + Qdrant (persisted per project/task)
  - Long-term tier: Postgres (preference accumulation, rule-based promotion)

Embeddings: all-MiniLM-L6-v2 (local, offline-capable — §11.2)
"""
from __future__ import annotations

import json
import uuid
from functools import lru_cache
from typing import Optional

from sentence_transformers import SentenceTransformer
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue

from cache import get_redis
from vector_store import get_qdrant, MEMORY_COLLECTION

# Load once at module import; model is pre-downloaded in the Dockerfile
@lru_cache(maxsize=1)
def _get_embedder() -> SentenceTransformer:
    return SentenceTransformer("all-MiniLM-L6-v2")


def embed(text: str) -> list[float]:
    """Embed a string using the local sentence-transformer model."""
    model = _get_embedder()
    return model.encode(text, normalize_embeddings=True).tolist()


# ─── Session tier (Redis) ─────────────────────────────────────────────────────

SESSION_TTL = 3600  # 1 hour


async def append_session_message(session_id: str, role: str, content: str) -> None:
    """Push a message to the session chat history in Redis."""
    redis = get_redis()
    key = f"session:{session_id}:messages"
    entry = json.dumps({"role": role, "content": content})
    await redis.rpush(key, entry)
    await redis.expire(key, SESSION_TTL)


async def get_session_messages(session_id: str) -> list[dict]:
    """Retrieve all messages in a session."""
    redis = get_redis()
    key = f"session:{session_id}:messages"
    raw = await redis.lrange(key, 0, -1)
    return [json.loads(r) for r in raw]


async def clear_session(session_id: str) -> None:
    redis = get_redis()
    await redis.delete(f"session:{session_id}:messages")


# ─── Episodic tier (Qdrant + Postgres, via caller) ───────────────────────────

async def store_episodic_chunk(
    owner_id: str,
    agent_id: str,
    content: str,
    chunk_id: Optional[str] = None,
) -> str:
    """Embed content and store in Qdrant for semantic retrieval."""
    qdrant = get_qdrant()
    cid = chunk_id or str(uuid.uuid4())
    vector = embed(content)
    await qdrant.upsert(
        collection_name=MEMORY_COLLECTION,
        points=[PointStruct(
            id=cid,
            vector=vector,
            payload={"owner_id": owner_id, "agent_id": agent_id, "tier": "episodic", "content": content},
        )],
    )
    return cid


async def retrieve_relevant_context(
    owner_id: str,
    query: str,
    agent_id: Optional[str] = None,
    top_k: int = 5,
) -> list[str]:
    """
    §5.6: embed query, cosine-search Qdrant, return top-k content strings
    to inject into the LLM context.
    """
    qdrant = get_qdrant()
    query_vector = embed(query)

    # Filter by owner; optionally also by agent
    filter_conditions = [FieldCondition(key="owner_id", match=MatchValue(value=owner_id))]
    if agent_id:
        filter_conditions.append(FieldCondition(key="agent_id", match=MatchValue(value=agent_id)))

    results = await qdrant.search(
        collection_name=MEMORY_COLLECTION,
        query_vector=query_vector,
        query_filter=Filter(must=filter_conditions),
        limit=top_k,
        with_payload=True,
    )
    return [r.payload.get("content", "") for r in results if r.payload]
