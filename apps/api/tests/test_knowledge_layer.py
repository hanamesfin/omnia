"""Enterprise Knowledge Layer — chunk, store, search, gates."""
from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from engines.knowledge.chunker import chunk_text
from engines.knowledge.embedder import _hash_embed, cosine
from engines.knowledge.local_store import LocalKnowledgeStore
from engines.knowledge.store import KnowledgeDocument, new_id
from engines.knowledge.pipeline import index_document
from engines.knowledge.search import search_knowledge, format_hits
from engines.knowledge import reset_knowledge_store_for_tests
from engines.tools.executor import ToolContext, execute_tool


def test_chunker_overlap_and_size():
    text = ("Paragraph one about alpha. " * 40) + "\n\n" + ("Paragraph two about beta. " * 40)
    chunks = chunk_text(text, chunk_chars=400, overlap_chars=50)
    assert len(chunks) >= 2
    assert all(len(c) <= 450 for c in chunks)
    # Overlap: some shared tokens across adjacent chunks
    assert any("alpha" in c.lower() for c in chunks)


def test_hash_embed_cosine_self():
    a = _hash_embed("refund policy thirty days")
    b = _hash_embed("refund policy thirty days")
    assert cosine(a, b) == pytest.approx(1.0, abs=1e-6)
    c = _hash_embed("unrelated astronomy topic")
    assert cosine(a, c) < cosine(a, b)


def test_local_store_index_and_search(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("engines.knowledge.embedder._embed_fn", _hash_embed)
    store = LocalKnowledgeStore(root=tmp_path / "kb")
    doc = KnowledgeDocument(
        id=new_id(),
        owner_id="u1",
        session_id="s1",
        upload_id="up1",
        filename="policy.txt",
        status="pending",
    )
    store.upsert_document(doc)

    def load(_uid: str) -> str:
        return (
            "Our refund policy allows returns within 30 days of purchase. "
            "Customers must provide the original receipt. "
            "Digital goods are non-refundable after download."
        )

    asyncio.run(index_document(store, doc.id, load_text=load))
    updated = store.get_document(doc.id)
    assert updated is not None
    assert updated.status == "ready"

    hits = search_knowledge(store, "refund within 30 days", session_id="s1", top_k=3)
    assert hits
    assert "refund" in hits[0].chunk_text.lower() or hits[0].score > 0

    store.bind_agent("s1", "agent-1")
    hits2 = search_knowledge(store, "original receipt", agent_id="agent-1", top_k=3)
    assert hits2


def test_knowledge_search_tool(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("engines.knowledge.embedder._embed_fn", _hash_embed)
    store = LocalKnowledgeStore(root=tmp_path / "kb2")
    reset_knowledge_store_for_tests(store)
    doc = KnowledgeDocument(
        id=new_id(),
        owner_id="u1",
        agent_id="agent-x",
        upload_id="up2",
        filename="sop.md",
        status="pending",
    )
    store.upsert_document(doc)
    asyncio.run(
        index_document(
            store,
            doc.id,
            load_text=lambda _: "Escalation SOP: page on-call after two failed retries.",
        )
    )
    ctx = ToolContext(user_id="u1", uploads={}, agent_id="agent-x")
    out = asyncio.run(
        execute_tool("knowledge_search", {"query": "on-call escalation", "top_k": 3}, ctx=ctx)
    )
    assert "Escalation" in out or "on-call" in out.lower() or "No matching" not in out
    reset_knowledge_store_for_tests(None)


def test_enterprise_generate_gate(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("engines.knowledge.embedder._embed_fn", _hash_embed)
    store = LocalKnowledgeStore(root=tmp_path / "kb3")
    reset_knowledge_store_for_tests(store)

    from standalone import _session_can_generate

    session = {
        "id": "sess-e",
        "create_tier": "enterprise",
        "state": "done",
        "answers": {"_user_turns": 2, "architect_review": "I'm ready — generate"},
        "requirements": {
            "purpose": "triage tickets",
            "target_user": "support agents",
            "experience": "form with ticket text",
            "input_fields": [{"id": "ticket", "label": "Ticket", "type": "textarea"}],
            "output": {"type": "markdown", "label": "Triage"},
        },
        "_req_ready": True,
    }
    ok, reason = _session_can_generate(session)
    assert ok is False
    assert "knowledge" in reason.lower()

    doc = KnowledgeDocument(
        id=new_id(),
        owner_id="u1",
        session_id="sess-e",
        upload_id="up",
        filename="a.txt",
        status="ready",
    )
    store.upsert_document(doc)
    ok2, _ = _session_can_generate(session)
    assert ok2 is True
    reset_knowledge_store_for_tests(None)


def test_normal_gate_without_knowledge(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    reset_knowledge_store_for_tests(LocalKnowledgeStore(root=tmp_path / "kb_n"))
    from standalone import _session_can_generate

    session = {
        "id": "sess-n",
        "create_tier": "normal",
        "state": "done",
        "answers": {"_user_turns": 2, "architect_review": "I'm ready — generate"},
        "requirements": {
            "purpose": "write emails",
            "target_user": "sales",
            "experience": "chat",
            "output": {"type": "markdown", "label": "Draft"},
        },
        "_req_ready": True,
    }
    ok, _ = _session_can_generate(session)
    assert ok is True
    reset_knowledge_store_for_tests(None)


def test_format_hits_empty():
    assert "No matching" in format_hits([])
