"""
OMNIA API — FastAPI application factory.
"""
from contextlib import asynccontextmanager
import structlog

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import engine, Base
from cache import init_redis
from vector_store import init_qdrant

from routers import auth, agents, interview, workflows, marketplace, evaluation, models as models_router

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start-up and shutdown lifecycle."""
    log.info("omnia.startup", mode="demo" if settings.DEMO_MODE else "live")

    # Initialise external connections
    await init_redis()
    await init_qdrant()

    yield

    log.info("omnia.shutdown")


app = FastAPI(
    title="OMNIA API",
    version="0.1.0",
    description="Adaptive AI Agent Creation Ecosystem",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router,        prefix="/api/v1/auth",        tags=["Auth"])
app.include_router(interview.router,   prefix="/api/v1/interview",   tags=["Interview"])
app.include_router(agents.router,      prefix="/api/v1/agents",      tags=["Agents"])
app.include_router(workflows.router,   prefix="/api/v1/workflows",   tags=["Workflows"])
app.include_router(evaluation.router,  prefix="/api/v1/agents",      tags=["Evaluation"])
app.include_router(marketplace.router, prefix="/api/v1/marketplace", tags=["Marketplace"])
app.include_router(models_router.router, prefix="/api/v1/models",    tags=["Models"])


@app.get("/health")
async def health():
    return {"status": "ok", "demo_mode": settings.DEMO_MODE}
