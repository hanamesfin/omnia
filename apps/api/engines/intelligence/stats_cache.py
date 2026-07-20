"""
Model Statistics Cache — derived aggregates the router queries on every decision.
Updated from the immutable Run Ledger (never scanned live at request time).
"""
from __future__ import annotations

import json
import threading
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from engines.intelligence.ledger import RunLedger, get_ledger
from engines.intelligence.telemetry import get_telemetry
from engines.model_selection.registry import MODEL_BY_NAME


@dataclass
class ModelStats:
    model: str
    provider: str = ""
    samples: int = 0
    success_rate: float = 0.85
    avg_latency_ms: float = 1500.0
    avg_cost: float = 0.0
    avg_rating: float = 0.0
    rating_count: int = 0
    observed_coding: float = 0.0
    observed_reasoning: float = 0.0
    observed_writing: float = 0.0
    observed_vision: float = 0.0
    task_counts: dict[str, int] = field(default_factory=dict)
    updated_at: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class ModelStatisticsCache:
    """
    Continuously refreshed aggregates. Router reads this — not the ledger.
    """

    def __init__(self, path: Path | None = None) -> None:
        root = Path(__file__).resolve().parents[2]
        self._path = path or root / ".omnia_model_stats.json"
        self._lock = threading.Lock()
        self._stats: dict[str, ModelStats] = {}
        self._load()

    def _load(self) -> None:
        if not self._path.exists():
            return
        try:
            raw = json.loads(self._path.read_text(encoding="utf-8"))
            for name, row in (raw.get("models") or {}).items():
                self._stats[name] = ModelStats(**row)
        except Exception:
            pass

    def _save(self) -> None:
        payload = {
            "updated_at": time.time(),
            "models": {k: v.to_dict() for k, v in self._stats.items()},
        }
        self._path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def get(self, model: str) -> ModelStats | None:
        return self._stats.get(model)

    def all_stats(self) -> dict[str, ModelStats]:
        return dict(self._stats)

    def rebuild_from_ledger(self, ledger: RunLedger | None = None) -> int:
        """Recompute aggregates from the immutable ledger."""
        ledger = ledger or get_ledger()
        buckets: dict[str, dict[str, Any]] = {}

        for run in ledger.all_runs():
            success = 1.0 if run.status == "success" else (0.5 if run.status == "partial" else 0.0)
            for usage in run.models:
                name = usage.model
                b = buckets.setdefault(
                    name,
                    {
                        "provider": usage.provider,
                        "n": 0,
                        "success": 0.0,
                        "latency": 0.0,
                        "cost": 0.0,
                        "ratings": [],
                        "tasks": {},
                    },
                )
                b["n"] += 1
                b["success"] += success
                b["latency"] += usage.runtime_ms or run.runtime_ms
                b["cost"] += usage.estimated_cost or 0
                if run.user_rating:
                    b["ratings"].append(run.user_rating)
                task = run.task_type or "general"
                b["tasks"][task] = b["tasks"].get(task, 0) + 1
                if not b["provider"]:
                    row = MODEL_BY_NAME.get(name) or {}
                    b["provider"] = usage.provider or str(row.get("provider") or "")

        now = time.time()
        with self._lock:
            for name, b in buckets.items():
                n = max(1, b["n"])
                ratings = b["ratings"]
                registry = MODEL_BY_NAME.get(name) or {}
                # Observed capability proxies from task mix + success
                task_counts = b["tasks"]
                coding_n = sum(task_counts.get(t, 0) for t in ("coding", "debugging", "full_stack", "backend", "frontend"))
                reason_n = sum(task_counts.get(t, 0) for t in ("reasoning", "math", "architecture", "research"))
                write_n = sum(task_counts.get(t, 0) for t in ("writing", "marketing", "creative_writing"))
                vision_n = task_counts.get("vision", 0)
                base_success = b["success"] / n
                self._stats[name] = ModelStats(
                    model=name,
                    provider=b["provider"] or str(registry.get("provider") or ""),
                    samples=b["n"],
                    success_rate=base_success,
                    avg_latency_ms=b["latency"] / n,
                    avg_cost=b["cost"] / n,
                    avg_rating=(sum(ratings) / len(ratings)) if ratings else 0.0,
                    rating_count=len(ratings),
                    observed_coding=min(10.0, (registry.get("coding_score") or 7) * (0.7 + 0.3 * base_success) * (1 + min(coding_n, 20) * 0.01)),
                    observed_reasoning=min(10.0, (registry.get("reasoning_score") or 7) * (0.7 + 0.3 * base_success) * (1 + min(reason_n, 20) * 0.01)),
                    observed_writing=min(10.0, (registry.get("creativity_score") or 7) * (0.7 + 0.3 * base_success) * (1 + min(write_n, 20) * 0.01)),
                    observed_vision=min(10.0, (registry.get("vision_score") or 0) * (0.7 + 0.3 * base_success) if vision_n or registry.get("vision_score") else 0),
                    task_counts=dict(task_counts),
                    updated_at=now,
                )
            self._save()
        return len(self._stats)

    def observe_run(self, run_dict: dict[str, Any]) -> None:
        """Incremental update after a single run (faster than full rebuild)."""
        # For simplicity and correctness, rebuild — ledger is the source of truth.
        # Full rebuild is cheap until tens of thousands of runs.
        self.rebuild_from_ledger()


_cache: ModelStatisticsCache | None = None


def get_stats_cache() -> ModelStatisticsCache:
    global _cache
    if _cache is None:
        _cache = ModelStatisticsCache()
        # Warm from ledger on first access
        try:
            _cache.rebuild_from_ledger()
        except Exception:
            pass
    return _cache
