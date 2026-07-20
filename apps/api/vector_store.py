"""Qdrant vector store client initialisation."""
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams
from config import settings

_client: AsyncQdrantClient | None = None

MEMORY_COLLECTION = "omnia_memory"
EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 output dimension


async def init_qdrant() -> None:
    global _client
    _client = AsyncQdrantClient(url=settings.QDRANT_URL)
    # Create collection if it doesn't exist
    existing = await _client.get_collections()
    names = [c.name for c in existing.collections]
    if MEMORY_COLLECTION not in names:
        await _client.create_collection(
            collection_name=MEMORY_COLLECTION,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )


def get_qdrant() -> AsyncQdrantClient:
    if _client is None:
        raise RuntimeError("Qdrant not initialised")
    return _client
