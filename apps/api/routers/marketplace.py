"""Marketplace router — §5.9 Wilson score ranking."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from auth import get_current_user, require_permission
from database import get_db
from models import User, Agent, MarketplaceListing, Review, AuditLog
from engines.marketplace.ranking import wilson_score

router = APIRouter()


class PublishRequest(BaseModel):
    agent_id: str


class ReviewRequest(BaseModel):
    rating: int        # 1–5
    would_recommend: bool
    text: str | None = None


@router.get("/")
async def list_marketplace(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("marketplace.read")),
    sort_by: str = "wilson_score",
):
    result = await db.execute(
        select(MarketplaceListing, Agent)
        .join(Agent, Agent.id == MarketplaceListing.agent_id)
        .where(MarketplaceListing.visibility == "public")
        .order_by(MarketplaceListing.wilson_score.desc())
    )
    rows = result.all()
    return [
        {
            "id": listing.id,
            "agent_id": listing.agent_id,
            "name": agent.name,
            "specialty": agent.specialty or agent.name,
            "domain": agent.spec.domain if agent.spec else "general",
            "rating_count": listing.rating_count,
            "rating_avg": round(listing.rating_sum / listing.rating_count, 2) if listing.rating_count > 0 else 0.0,
            "recommend_count": listing.recommend_count,
            "wilson_score": listing.wilson_score,
            "published_at": listing.published_at.isoformat(),
        }
        for listing, agent in rows
    ]


@router.post("/", status_code=201)
async def publish_agent(
    req: PublishRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("marketplace.publish")),
):
    # Verify agent ownership + org isolation
    agent_result = await db.execute(
        select(Agent).where(Agent.id == req.agent_id, Agent.org_id == current_user.org_id)
    )
    agent = agent_result.scalar_one_or_none()
    if not agent:
        raise HTTPException(404, {"error": {"code": "agent.not_found", "message": "Agent not found", "retryable": False}})

    existing = await db.execute(
        select(MarketplaceListing).where(MarketplaceListing.agent_id == req.agent_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, {"error": {"code": "marketplace.already_published", "message": "Agent already published", "retryable": False}})

    listing = MarketplaceListing(agent_id=req.agent_id, org_id=current_user.org_id)
    db.add(listing)
    await db.flush()

    db.add(AuditLog(actor_id=current_user.id, action="marketplace.publish", target_type="listing", target_id=listing.id))
    return {"listing_id": listing.id}


@router.post("/{listing_id}/review", status_code=201)
async def add_review(
    listing_id: str,
    req: ReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("marketplace.review")),
):
    if not 1 <= req.rating <= 5:
        raise HTTPException(400, {"error": {"code": "review.invalid_rating", "message": "Rating must be 1–5", "retryable": False}})

    listing_result = await db.execute(
        select(MarketplaceListing).where(MarketplaceListing.id == listing_id)
    )
    listing = listing_result.scalar_one_or_none()
    if not listing:
        raise HTTPException(404, {"error": {"code": "marketplace.not_found", "message": "Listing not found", "retryable": False}})

    review = Review(
        listing_id=listing_id,
        user_id=current_user.id,
        rating=req.rating,
        would_recommend=req.would_recommend,
        text=req.text,
    )
    db.add(review)

    # Update listing stats
    listing.rating_count += 1
    listing.rating_sum += req.rating
    if req.would_recommend:
        listing.recommend_count += 1

    # Recompute Wilson score (§5.9)
    listing.wilson_score = wilson_score(listing.recommend_count, listing.rating_count)

    db.add(AuditLog(actor_id=current_user.id, action="marketplace.review", target_type="listing", target_id=listing_id))
    return {"wilson_score": listing.wilson_score}
