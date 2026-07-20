"""Redis connection pool — used for session memory tier and Celery broker."""
import redis.asyncio as aioredis
from config import settings

_redis: aioredis.Redis | None = None


async def init_redis() -> None:
    global _redis
    _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


def get_redis() -> aioredis.Redis:
    if _redis is None:
        raise RuntimeError("Redis not initialised")
    return _redis
