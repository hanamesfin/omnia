"""Create knowledge_documents and knowledge_chunks tables."""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260717_knowledge"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_id", sa.String(36), nullable=True),
        sa.Column("agent_id", sa.String(36), sa.ForeignKey("agents.id"), nullable=True),
        sa.Column("upload_id", sa.String(36), nullable=False, server_default=""),
        sa.Column("filename", sa.String(512), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_knowledge_documents_owner_id", "knowledge_documents", ["owner_id"])
    op.create_index("ix_knowledge_documents_session_id", "knowledge_documents", ["session_id"])
    op.create_index("ix_knowledge_documents_agent_id", "knowledge_documents", ["agent_id"])

    op.create_table(
        "knowledge_chunks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "document_id",
            sa.String(36),
            sa.ForeignKey("knowledge_documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("embedding", postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column("meta", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    # Prefer pgvector column when extension exists — recreate as Vector via raw SQL
    op.execute(
        "ALTER TABLE knowledge_chunks DROP COLUMN IF EXISTS embedding; "
        "ALTER TABLE knowledge_chunks ADD COLUMN embedding vector(384);"
    )
    op.create_index(
        "ix_knowledge_chunks_document_index",
        "knowledge_chunks",
        ["document_id", "chunk_index"],
    )


def downgrade() -> None:
    op.drop_table("knowledge_chunks")
    op.drop_table("knowledge_documents")
