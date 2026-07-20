"""Execution Intelligence Layer — ledger, telemetry, stats cache, adaptive scoring."""
from __future__ import annotations

import json
import time
from pathlib import Path

import pytest

from engines.intelligence.ledger import ModelUsage, RunLedger, RunRecord, new_run_id
from engines.intelligence.telemetry import ProviderTelemetry
from engines.intelligence.stats_cache import ModelStatisticsCache
from engines.intelligence.adaptive import ADAPTIVE_WEIGHTS, blend_score, observation_confidence
from engines.intelligence.recorder import record_execution


@pytest.fixture()
def tmp_ledger(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> RunLedger:
    path = tmp_path / "ledger.jsonl"
    ledger = RunLedger(path=path)
    monkeypatch.setattr("engines.intelligence.ledger._ledger", ledger)
    monkeypatch.setattr("engines.intelligence.recorder.get_ledger", lambda: ledger)
    return ledger


@pytest.fixture()
def tmp_cache(tmp_path: Path, tmp_ledger: RunLedger, monkeypatch: pytest.MonkeyPatch) -> ModelStatisticsCache:
    cache = ModelStatisticsCache(path=tmp_path / "stats.json")
    monkeypatch.setattr("engines.intelligence.stats_cache._cache", cache)
    monkeypatch.setattr("engines.intelligence.recorder.get_stats_cache", lambda: cache)
    monkeypatch.setattr("engines.intelligence.adaptive.get_stats_cache", lambda: cache)
    return cache


def test_ledger_append_only(tmp_ledger: RunLedger):
    rid = new_run_id()
    rec = RunRecord(
        run_id=rid,
        timestamp=time.time(),
        task_type="coding",
        models=[ModelUsage(model="gpt-4o-mini", provider="openai", role="coding")],
        status="success",
        runtime_ms=1200,
        input_tokens=100,
        output_tokens=50,
        estimated_cost=0.01,
    )
    tmp_ledger.append(rec)
    assert tmp_ledger.get(rid) is not None
    assert tmp_ledger.count() == 1

    # Disk is append-only JSONL
    lines = tmp_ledger._path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1
    assert json.loads(lines[0])["run_id"] == rid


def test_ledger_rating_patch(tmp_ledger: RunLedger):
    rid = new_run_id()
    tmp_ledger.append(
        RunRecord(run_id=rid, timestamp=time.time(), status="success", models=[])
    )
    updated = tmp_ledger.set_rating(rid, 5)
    assert updated is not None
    assert updated.user_rating == 5
    lines = tmp_ledger._path.read_text(encoding="utf-8").strip().splitlines()
    assert any(json.loads(l).get("type") == "rating_patch" for l in lines)

    # Reload preserves rating
    reloaded = RunLedger(path=tmp_ledger._path)
    assert reloaded.get(rid).user_rating == 5


def test_provider_telemetry_windows():
    tel = ProviderTelemetry()
    tel.record(provider="openai", model="gpt-4o", latency_ms=800, success=True)
    tel.record(provider="openai", model="gpt-4o", latency_ms=900, success=True)
    tel.record(
        provider="openai",
        model="gpt-4o",
        latency_ms=2000,
        success=False,
        error_type="rate_limit",
        status_code=429,
    )
    s = tel.stats("openai", "24h")
    assert s.samples == 3
    assert 0.6 <= s.success_rate <= 0.7
    assert s.rate_limit_rate > 0
    health = tel.health_score("openai")
    assert 0.0 < health < 1.0


def test_stats_cache_from_ledger(tmp_ledger: RunLedger, tmp_cache: ModelStatisticsCache):
    for i in range(5):
        tmp_ledger.append(
            RunRecord(
                run_id=new_run_id(),
                timestamp=time.time(),
                task_type="coding",
                models=[
                    ModelUsage(
                        model="gpt-4o-mini",
                        provider="openai",
                        role="coding",
                        runtime_ms=500 + i * 10,
                        estimated_cost=0.01,
                    )
                ],
                status="success",
                runtime_ms=500,
                user_rating=4 if i % 2 == 0 else None,
            )
        )
    n = tmp_cache.rebuild_from_ledger(tmp_ledger)
    assert n >= 1
    stats = tmp_cache.get("gpt-4o-mini")
    assert stats is not None
    assert stats.samples == 5
    assert stats.success_rate == 1.0
    assert stats.rating_count >= 1


def test_observation_confidence_ramps():
    assert observation_confidence(0) == 0.0
    assert observation_confidence(25) == 0.5
    assert observation_confidence(50) == 1.0
    assert observation_confidence(100) == 1.0


def test_blend_score_disabled_returns_registry(monkeypatch: pytest.MonkeyPatch, tmp_cache: ModelStatisticsCache):
    monkeypatch.setattr("engines.intelligence.adaptive.adaptive_enabled", lambda: False)
    score, breakdown = blend_score(model_name="gpt-4o-mini", registry_score=0.9, task_type="coding")
    assert score == 0.9
    assert breakdown["adaptive"] == 0.0


def test_blend_score_adaptive(monkeypatch: pytest.MonkeyPatch, tmp_ledger: RunLedger, tmp_cache: ModelStatisticsCache):
    monkeypatch.setattr("engines.intelligence.adaptive.adaptive_enabled", lambda: True)
    # Seed enough samples for partial confidence
    for _ in range(20):
        tmp_ledger.append(
            RunRecord(
                run_id=new_run_id(),
                timestamp=time.time(),
                task_type="coding",
                models=[ModelUsage(model="gpt-4o-mini", provider="openai", runtime_ms=600)],
                status="success",
                runtime_ms=600,
                user_rating=5,
            )
        )
    tmp_cache.rebuild_from_ledger(tmp_ledger)
    monkeypatch.setattr(
        "engines.intelligence.adaptive.get_telemetry",
        lambda: type("T", (), {"health_score": staticmethod(lambda p, w="24h": 0.9)})(),
    )
    score, breakdown = blend_score(model_name="gpt-4o-mini", registry_score=0.5, task_type="coding")
    assert 0.0 <= score <= 1.0
    assert breakdown["confidence"] == pytest.approx(0.4, abs=0.01)
    assert sum(ADAPTIVE_WEIGHTS.values()) == pytest.approx(1.0)


def test_record_execution_updates_cache(tmp_ledger: RunLedger, tmp_cache: ModelStatisticsCache):
    rec = record_execution(
        user_id="u1",
        agent_id="a1",
        task_type="reasoning",
        prompt_preview="prove this theorem",
        models=[{"model": "claude-3-5-sonnet", "role": "reasoning", "runtime_ms": 900, "estimated_cost": 0.02}],
        status="success",
        runtime_ms=900,
        input_tokens=200,
        output_tokens=100,
        estimated_cost=0.02,
        mode="single",
    )
    assert tmp_ledger.get(rec.run_id) is not None
    stats = tmp_cache.get("claude-3-5-sonnet")
    assert stats is not None
    assert stats.samples >= 1
