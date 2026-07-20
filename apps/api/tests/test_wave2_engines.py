"""Wave-2 engines: DNA, semantic diff, drift, post-mortem, tenancy."""
from __future__ import annotations

from engines.lineage.dna import compute_dna, find_similar, lineage_chain, similarity
from engines.lineage.diff import diff_snapshots, snapshot_from_agent
from engines.ops.drift import analyze_drift
from engines.ops.postmortem import diagnose_failure
from engines.tenancy.isolation import postgres_schema_name, redis_key


def test_dna_fingerprint_stable_and_sensitive():
    a = compute_dna(
        specialization="Bug triage",
        domain="coding",
        kind="tool",
        tools=["code_execution"],
    )
    b = compute_dna(
        specialization="Bug triage",
        domain="coding",
        kind="tool",
        tools=["code_execution"],
    )
    c = compute_dna(
        specialization="Cover letters",
        domain="content",
        kind="transformer",
        tools=["web_search"],
    )
    assert a.fingerprint == b.fingerprint
    assert a.fingerprint != c.fingerprint
    assert similarity(a, b) == 1.0
    assert similarity(a, c) < 0.5


def test_find_similar_and_lineage():
    parent = compute_dna(specialization="Support", domain="customer_support", kind="chat")
    child = compute_dna(
        specialization="Support tone",
        domain="customer_support",
        kind="chat",
        parent_agent_id="p1",
        root_agent_id="p1",
        remix_depth=1,
    )
    catalog = [
        ("p1", parent),
        ("other", compute_dna(specialization="CSV", domain="data_analysis", kind="analyzer")),
    ]
    hits = find_similar(child, catalog, top_k=3, min_score=0.1)
    assert hits and hits[0]["agent_id"] == "p1"

    agents = {
        "p1": {
            "name": "Parent",
            "developer": "Labs",
            "dna": parent.to_dict(),
        },
        "c1": {
            "name": "Child",
            "developer": "You",
            "dna": child.to_dict(),
            "parent_agent_id": "p1",
        },
    }
    chain = lineage_chain("c1", agents)
    assert [x["agent_id"] for x in chain] == ["p1", "c1"]


def test_semantic_diff_layers():
    before = snapshot_from_agent(
        {
            "name": "A",
            "specialty": "old",
            "domain": "coding",
            "kind": "tool",
            "create_tier": "normal",
            "model_id": "gpt-4o-mini",
            "prompt_text": "hello",
            "tools": ["web_search"],
            "spec": {"memory_strategy": "session"},
            "aqs": {"aqs": 0.8, "test_pass_rate": 0.9},
        }
    )
    after = snapshot_from_agent(
        {
            "name": "A",
            "specialty": "new mission",
            "domain": "coding",
            "kind": "tool",
            "create_tier": "enterprise",
            "model_id": "gpt-4o",
            "prompt_text": "hello world",
            "tools": ["web_search", "code_execution"],
            "spec": {"memory_strategy": "long_term"},
            "aqs": {"aqs": 0.85, "test_pass_rate": 0.95},
        }
    )
    diff = diff_snapshots(before, after)
    assert diff.significant
    layers = {c.layer for c in diff.changes}
    assert "identity" in layers or "tier" in layers
    assert any("Tools" in (c.summary or "") or c.layer == "tools" for c in diff.changes)


def test_drift_nudges():
    nudges = analyze_drift(
        recent_costs=[0.01, 0.01, 0.02, 0.03],
        recent_success=[0.95, 0.9, 0.7, 0.6],
        recent_latency_ms=[800, 900, 2000, 3000],
        aqs_history=[0.9, 0.7],
    )
    codes = {n.code for n in nudges}
    assert "cost.climbing" in codes
    assert "reliability.drop" in codes
    assert "aqs.regress" in codes


def test_postmortem_maps_layers():
    pm = diagnose_failure("knowledge_search returned no matching documents")
    assert pm.layer == "knowledge"
    pm2 = diagnose_failure("tool timed out after 30s")
    assert pm2.layer == "tools"
    pm3 = diagnose_failure("weird failure xyz")
    assert pm3.layer == "unknown"


def test_tenant_isolation_helpers():
    assert redis_key("Acme Corp!", "agent", "a1") == "omnia:acme_corp:agent:a1"
    assert postgres_schema_name("public") == "public"
    assert postgres_schema_name("org-acme") == "tenant_org_acme"
