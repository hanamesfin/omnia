"""
Celery worker for background jobs.
Handles tasks like long-running generations, evaluations, etc.
"""
from celery import Celery
from config import settings

celery = Celery(
    "omnia_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery.task(name="dummy_background_task")
def dummy_background_task(arg: str):
    """Placeholder for Phase 2 background tasks (e.g., long workflows)."""
    return f"Processed {arg}"
