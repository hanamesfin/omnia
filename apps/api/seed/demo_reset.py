"""
Demo Reset Script — §11.1 / DEF-02
Drops all tables, recreates them, clears knowledge + stats caches, seeds demo data.
Runnable via: docker-compose exec api python seed/demo_reset.py
"""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from database import engine, Base
from models import (
    Organization,
    User,
    Agent,
    AgentSpec,
    AgentVersion,
    MarketplaceListing,
    Evaluation,
)
from engines.knowledge import get_knowledge_store, reset_knowledge_store_for_tests
from engines.intelligence.stats_cache import ModelStatisticsCache

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _clear_auxiliary_stores() -> None:
    """DEF-02: wipe knowledge (vector/local) and model stats cache, not just Postgres."""
    root = Path(__file__).resolve().parents[1]
    try:
        store = get_knowledge_store()
        if hasattr(store, "clear_all"):
            store.clear_all()
            logger.info("Cleared knowledge store")
    except Exception as e:
        logger.warning("Knowledge clear skipped: %s", e)
    finally:
        reset_knowledge_store_for_tests(None)

    try:
        from engines.lifecycle.events import get_event_log

        get_event_log().truncate()
        logger.info("Truncated agent lifecycle event log")
    except Exception as e:
        logger.warning("Event log clear skipped: %s", e)

    stats_path = root / ".omnia_model_stats.json"
    cache = ModelStatisticsCache(path=stats_path)
    # Empty rebuild from empty ledger path — wipe file.
    if stats_path.exists():
        stats_path.unlink()
        logger.info("Removed model stats cache file")
    # Also clear in-memory singleton if loaded
    try:
        from engines.intelligence import stats_cache as sc

        sc._cache = ModelStatisticsCache(path=stats_path)
    except Exception as e:
        logger.warning("Stats cache reset skipped: %s", e)


async def reset_demo():
    logger.info("Dropping all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        logger.info("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)

    _clear_auxiliary_stores()

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        logger.info("Seeding data...")

        org = Organization(name="Defense Demo Corp")
        session.add(org)
        await session.flush()

        admin_user = User(
            email="admin@demo.com",
            display_name="Demo Admin",
            # Catalog ownership only — session login blocked in auth layer
            hashed_password="",
            role="admin",
            org_id=org.id,
        )
        viewer_user = User(
            email="viewer@demo.com",
            display_name="Demo Viewer",
            hashed_password="",
            role="viewer",
            org_id=org.id,
        )
        session.add_all([admin_user, viewer_user])
        await session.flush()

        cs_spec = AgentSpec(
            user_id=admin_user.id,
            domain="customer_support",
            primary_goal="Help users reset passwords",
            technical_level=2,
            formality=4,
            autonomy_preference=2,
            constraints=["No personal data"],
            suggested_tools=[],
            matched_templates=[],
            rules_fired=["formality≥4→formal_tone"],
        )
        session.add(cs_spec)
        await session.flush()

        cs_agent = Agent(
            name="SupportBot",
            spec_id=cs_spec.id,
            owner_id=admin_user.id,
            org_id=org.id,
            model_id="gpt-4o-mini",
            status="active",
            current_version=1,
        )
        session.add(cs_agent)
        await session.flush()

        session.add(
            AgentVersion(
                agent_id=cs_agent.id,
                version_number=1,
                prompt_text=(
                    "1. Role: Customer support.\n2. Tone: Formal.\n3. Tools: None.\n"
                    "4. Constraints: No personal data.\n5. Escalate: When asked for passwords."
                ),
                linter_result={"passed": True, "checks": [], "word_count": 20, "fk_grade": 8.0},
                model_selection_result={},
            )
        )

        for i in range(10):
            session.add(
                Evaluation(
                    agent_id=cs_agent.id,
                    latency_ms=800 + i * 10,
                    success=True,
                    user_rating=4.5,
                    tokens_used=150,
                    cost_usd=0.001,
                    composite_score=0.85 + (i * 0.01),
                )
            )

        session.add(
            Evaluation(
                agent_id=cs_agent.id,
                latency_ms=900,
                success=True,
                user_rating=1.0,
                tokens_used=150,
                cost_usd=0.001,
                composite_score=0.30,
            )
        )

        code_spec = AgentSpec(
            user_id=admin_user.id,
            domain="coding",
            primary_goal="Write Python scripts",
            technical_level=5,
            formality=3,
            autonomy_preference=5,
            constraints=[],
            suggested_tools=["code_execution"],
            matched_templates=[],
            rules_fired=[],
        )
        session.add(code_spec)
        await session.flush()

        code_agent = Agent(
            name="PyExpert",
            spec_id=code_spec.id,
            owner_id=admin_user.id,
            org_id=org.id,
            model_id="gpt-4o",
            status="active",
            current_version=1,
        )
        session.add(code_agent)
        await session.flush()

        session.add(
            AgentVersion(
                agent_id=code_agent.id,
                version_number=1,
                prompt_text=(
                    "1. Role: Code assistant.\n2. Tone: Technical.\n3. Tools: code_execution.\n"
                    "4. Constraints: None.\n5. Escalate: When not about code."
                ),
                linter_result={"passed": True, "checks": [], "word_count": 20, "fk_grade": 8.0},
                model_selection_result={},
            )
        )

        session.add(
            MarketplaceListing(
                agent_id=code_agent.id,
                org_id=org.id,
                rating_count=50,
                rating_sum=240,
                recommend_count=48,
                wilson_score=0.88,
            )
        )

        await session.commit()
        logger.info(
            "Demo reset complete! Seeded 1 Org, 2 Users, 2 Agents, 1 Marketplace Listing, 11 Evaluations."
        )


if __name__ == "__main__":
    asyncio.run(reset_demo())
