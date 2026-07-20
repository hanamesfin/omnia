"""
OMNIA SQLAlchemy ORM models — all entities.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, Text, ForeignKey,
    JSON, Enum as SAEnum, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector

from database import Base

# ─── Helpers ──────────────────────────────────────────────────────────────────

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

def new_uuid() -> str:
    return str(uuid.uuid4())


# ─── Organisations & Users ────────────────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    budget_cap_tokens: Mapped[int] = mapped_column(Integer, default=500_000)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    users: Mapped[list["User"]] = relationship("User", back_populates="org")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="editor")  # admin | editor | viewer
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    tokens_used_today: Mapped[int] = mapped_column(Integer, default=0)
    last_token_reset: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    org: Mapped["Organization"] = relationship("Organization", back_populates="users")
    agents: Mapped[list["Agent"]] = relationship("Agent", back_populates="owner")


# ─── Interview ────────────────────────────────────────────────────────────────

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(50), default="welcome")  # FSM state (§5.1)
    answers: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


# ─── Agent Spec & Agent ───────────────────────────────────────────────────────

class AgentSpec(Base):
    """Output of the User Intelligence Engine (§5.1) + Agent Architect (§5.2)."""
    __tablename__ = "agent_specs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    domain: Mapped[str] = mapped_column(String(100))
    primary_goal: Mapped[str] = mapped_column(Text)
    technical_level: Mapped[int] = mapped_column(Integer)   # 1–5
    formality: Mapped[int] = mapped_column(Integer)         # 1–5
    autonomy_preference: Mapped[int] = mapped_column(Integer)  # 1–5
    constraints: Mapped[list] = mapped_column(JSONB, default=list)
    suggested_tools: Mapped[list] = mapped_column(JSONB, default=list)
    matched_templates: Mapped[list] = mapped_column(JSONB, default=list)  # [{id, name, score}]
    rules_fired: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    agent: Mapped[Optional["Agent"]] = relationship("Agent", back_populates="spec", uselist=False)


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialty: Mapped[str] = mapped_column(Text, default="")  # one-line specialty for Discover cards
    spec_id: Mapped[str] = mapped_column(String(36), ForeignKey("agent_specs.id"), nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    model_id: Mapped[str] = mapped_column(String(100))  # selected model name
    status: Mapped[str] = mapped_column(String(50), default="generating")  # generating | active | archived
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    # §6.3: cross-agent memory within one user's library — off by default for Discover-added
    share_context: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    spec: Mapped["AgentSpec"] = relationship("AgentSpec", back_populates="agent")
    owner: Mapped["User"] = relationship("User", back_populates="agents")
    versions: Mapped[list["AgentVersion"]] = relationship("AgentVersion", back_populates="agent", order_by="AgentVersion.created_at")
    evaluations: Mapped[list["Evaluation"]] = relationship("Evaluation", back_populates="agent")
    evolution_flags: Mapped[list["EvolutionFlag"]] = relationship("EvolutionFlag", back_populates="agent")
    marketplace_listing: Mapped[Optional["MarketplaceListing"]] = relationship("MarketplaceListing", back_populates="agent", uselist=False)
    library_entries: Mapped[list["AgentLibrary"]] = relationship("AgentLibrary", back_populates="agent")


class AgentLibrary(Base):
    """
    One row per agent on a user's Yours page (§6.3 / §8).
    Created on Save/Publish (Create) or Add to Yours (Discover).
    """
    __tablename__ = "agent_library"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id"), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False)  # created | added_from_explore
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    agent: Mapped["Agent"] = relationship("Agent", back_populates="library_entries")

    __table_args__ = (
        UniqueConstraint("user_id", "agent_id", name="uq_library_user_agent"),
        Index("ix_agent_library_user_source", "user_id", "source"),
    )


class AgentVersion(Base):
    """Every generated prompt is kept; never overwritten (§5.3)."""
    __tablename__ = "agent_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    linter_result: Mapped[dict] = mapped_column(JSONB, default=dict)  # {passed, checks, score}
    model_selection_result: Mapped[dict] = mapped_column(JSONB, default=dict)  # ranked models + scores
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    agent: Mapped["Agent"] = relationship("Agent", back_populates="versions")


# ─── Model Reference (§5.4 — hand-authored seed configuration) ───────────────

class ModelReference(Base):
    """
    Hand-authored reference table — seed configuration, not measured data.
    Values sourced from published model specs and provider pricing pages.
    Mark as SEED_CONFIG — tune from real usage data once available.
    """
    __tablename__ = "model_reference"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # e.g. "gpt-4o"
    provider: Mapped[str] = mapped_column(String(50))  # openai | anthropic | google
    cost_per_1k_tokens: Mapped[float] = mapped_column(Float)   # USD — SEED_CONFIG
    avg_latency_ms: Mapped[int] = mapped_column(Integer)        # ms — SEED_CONFIG
    reasoning_score: Mapped[float] = mapped_column(Float)       # 0–10 — SEED_CONFIG
    creativity_score: Mapped[float] = mapped_column(Float)      # 0–10 — SEED_CONFIG
    privacy_tier: Mapped[int] = mapped_column(Integer)          # 1(low)–5(high) — SEED_CONFIG
    context_window: Mapped[int] = mapped_column(Integer)        # tokens
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


# ─── Workflows (§5.5) ────────────────────────────────────────────────────────

class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    conflict_strategy: Mapped[str] = mapped_column(String(50), default="supervisor")  # majority_vote | supervisor
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    nodes: Mapped[list["WorkflowNode"]] = relationship("WorkflowNode", back_populates="workflow")
    edges: Mapped[list["WorkflowEdge"]] = relationship("WorkflowEdge", back_populates="workflow")
    runs: Mapped[list["WorkflowRun"]] = relationship("WorkflowRun", back_populates="workflow")


class WorkflowNode(Base):
    __tablename__ = "workflow_nodes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workflow_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflows.id"), nullable=False, index=True)
    node_key: Mapped[str] = mapped_column(String(100), nullable=False)  # logical name within workflow
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id"), nullable=False)
    position_x: Mapped[float] = mapped_column(Float, default=0.0)  # canvas position for editor
    position_y: Mapped[float] = mapped_column(Float, default=0.0)

    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="nodes")


class WorkflowEdge(Base):
    __tablename__ = "workflow_edges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workflow_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflows.id"), nullable=False, index=True)
    source_node_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_nodes.id"), nullable=False)
    target_node_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_nodes.id"), nullable=False)

    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="edges")


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    workflow_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflows.id"), nullable=False, index=True)
    initiated_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="running")  # running | complete | failed
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="runs")
    steps: Mapped[list["WorkflowRunStep"]] = relationship("WorkflowRunStep", back_populates="run")


class WorkflowRunStep(Base):
    __tablename__ = "workflow_run_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_runs.id"), nullable=False, index=True)
    node_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_nodes.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending | running | ok | error | needs_review
    input_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    output_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    run: Mapped["WorkflowRun"] = relationship("WorkflowRun", back_populates="steps")


# ─── Memory Chunks (§5.6) ────────────────────────────────────────────────────

class MemoryChunk(Base):
    __tablename__ = "memory_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    agent_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("agents.id"), nullable=True, index=True)
    tier: Mapped[str] = mapped_column(String(50))  # session | episodic | long_term
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(384), nullable=True)
    preference_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # for long-term counting
    mention_count: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_memory_chunks_owner_tier", "owner_id", "tier"),
    )


# ─── Knowledge documents (Enterprise RAG) ─────────────────────────────────────

class KnowledgeDocumentRow(Base):
    __tablename__ = "knowledge_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    agent_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("agents.id"), nullable=True, index=True)
    upload_id: Mapped[str] = mapped_column(String(36), nullable=False, default="")
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending|processing|ready|failed
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    chunks: Mapped[list["KnowledgeChunkRow"]] = relationship(
        "KnowledgeChunkRow", back_populates="document", cascade="all, delete-orphan"
    )


class KnowledgeChunkRow(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(384), nullable=True)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    document: Mapped["KnowledgeDocumentRow"] = relationship(
        "KnowledgeDocumentRow", back_populates="chunks"
    )

    __table_args__ = (
        Index("ix_knowledge_chunks_document_index", "document_id", "chunk_index"),
    )


# ─── Evaluations (§5.7) ──────────────────────────────────────────────────────

class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id"), nullable=False, index=True)
    run_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)  # chat turn or workflow step id
    latency_ms: Mapped[int] = mapped_column(Integer)
    success: Mapped[bool] = mapped_column(Boolean)
    schema_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    user_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 1–5 or null
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    composite_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    judge_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # LLM-as-judge (§5.7)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    agent: Mapped["Agent"] = relationship("Agent", back_populates="evaluations")

    __table_args__ = (
        Index("ix_evaluations_agent_created", "agent_id", "created_at"),
    )


# ─── Evolution Flags (§5.8) ──────────────────────────────────────────────────

class EvolutionFlag(Base):
    __tablename__ = "evolution_flags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id"), nullable=False, index=True)
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    z_score: Mapped[float] = mapped_column(Float)
    rolling_mean: Mapped[float] = mapped_column(Float)
    rolling_std: Mapped[float] = mapped_column(Float)
    offending_score: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(50), default="open")  # open | resolved
    suggestion_text: Mapped[str] = mapped_column(Text, default="")

    agent: Mapped["Agent"] = relationship("Agent", back_populates="evolution_flags")


# ─── Marketplace (§5.9) ──────────────────────────────────────────────────────

class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id"), unique=True, nullable=False, index=True)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    visibility: Mapped[str] = mapped_column(String(50), default="public")  # public | private
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    rating_sum: Mapped[float] = mapped_column(Float, default=0.0)
    recommend_count: Mapped[int] = mapped_column(Integer, default=0)  # for Wilson score (binary)
    wilson_score: Mapped[float] = mapped_column(Float, default=0.0)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    agent: Mapped["Agent"] = relationship("Agent", back_populates="marketplace_listing")
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="listing")


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    listing_id: Mapped[str] = mapped_column(String(36), ForeignKey("marketplace_listings.id"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(Integer)   # 1–5
    would_recommend: Mapped[bool] = mapped_column(Boolean)
    text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    listing: Mapped["MarketplaceListing"] = relationship("MarketplaceListing", back_populates="reviews")

    __table_args__ = (
        UniqueConstraint("listing_id", "user_id", name="uq_one_review_per_user"),
    )


# ─── Audit Log (§8) ──────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    actor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. "agent.generate"
    target_type: Mapped[str] = mapped_column(String(100))             # e.g. "agent"
    target_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_audit_logs_actor_created", "actor_id", "created_at"),
    )
