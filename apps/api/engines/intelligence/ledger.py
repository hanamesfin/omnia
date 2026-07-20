"""
Immutable Run Ledger — append-only execution history.
Source of truth for analytics, billing, debugging, and learning.
"""
from __future__ import annotations

import json
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal

RunStatus = Literal["success", "partial", "failed"]


@dataclass
class ModelUsage:
    model: str
    provider: str = ""
    role: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    runtime_ms: int = 0
    estimated_cost: float = 0.0
    status: str = "success"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class RunRecord:
    run_id: str
    timestamp: float
    user_id: str = ""
    agent_id: str = ""
    workflow_id: str | None = None
    task_type: str = "general"
    complexity: str = "medium"
    prompt_preview: str = ""
    models: list[ModelUsage] = field(default_factory=list)
    status: RunStatus = "success"
    runtime_ms: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost: float = 0.0
    retry_count: int = 0
    user_rating: int | None = None
    mode: str = "single"  # single | multi_agent
    meta: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "timestamp": self.timestamp,
            "user_id": self.user_id,
            "agent_id": self.agent_id,
            "workflow_id": self.workflow_id,
            "task_type": self.task_type,
            "complexity": self.complexity,
            "prompt_preview": self.prompt_preview,
            "models": [m.to_dict() for m in self.models],
            "status": self.status,
            "runtime_ms": self.runtime_ms,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "estimated_cost": self.estimated_cost,
            "retry_count": self.retry_count,
            "user_rating": self.user_rating,
            "mode": self.mode,
            "meta": self.meta,
        }

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> RunRecord:
        models = [
            ModelUsage(**m) if isinstance(m, dict) else m
            for m in (raw.get("models") or [])
        ]
        return cls(
            run_id=str(raw.get("run_id") or ""),
            timestamp=float(raw.get("timestamp") or 0),
            user_id=str(raw.get("user_id") or ""),
            agent_id=str(raw.get("agent_id") or ""),
            workflow_id=raw.get("workflow_id"),
            task_type=str(raw.get("task_type") or "general"),
            complexity=str(raw.get("complexity") or "medium"),
            prompt_preview=str(raw.get("prompt_preview") or "")[:500],
            models=models,
            status=raw.get("status") or "success",  # type: ignore[arg-type]
            runtime_ms=int(raw.get("runtime_ms") or 0),
            input_tokens=int(raw.get("input_tokens") or 0),
            output_tokens=int(raw.get("output_tokens") or 0),
            estimated_cost=float(raw.get("estimated_cost") or 0),
            retry_count=int(raw.get("retry_count") or 0),
            user_rating=raw.get("user_rating"),
            mode=str(raw.get("mode") or "single"),
            meta=dict(raw.get("meta") or {}),
        )


class RunLedger:
    """
    Append-only ledger. Records are never updated except user_rating (feedback).
    Persists to disk for standalone durability.
    """

    def __init__(self, path: Path | None = None) -> None:
        root = Path(__file__).resolve().parents[2]
        self._path = path or root / ".omnia_run_ledger.jsonl"
        self._lock = threading.Lock()
        self._index: dict[str, RunRecord] = {}
        self._load()

    def _load(self) -> None:
        if not self._path.exists():
            return
        try:
            with self._path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        raw = json.loads(line)
                        if raw.get("type") == "rating_patch":
                            existing = self._index.get(str(raw.get("run_id") or ""))
                            if existing and raw.get("user_rating") is not None:
                                existing.user_rating = int(raw["user_rating"])
                            continue
                        rec = RunRecord.from_dict(raw)
                        self._index[rec.run_id] = rec
                    except Exception:
                        continue
        except Exception:
            pass

    def append(self, record: RunRecord) -> RunRecord:
        with self._lock:
            self._index[record.run_id] = record
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with self._path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(record.to_dict(), ensure_ascii=False) + "\n")
        return record

    def get(self, run_id: str) -> RunRecord | None:
        return self._index.get(run_id)

    def set_rating(self, run_id: str, rating: int) -> RunRecord | None:
        """Only allowed mutation: attach user feedback."""
        with self._lock:
            rec = self._index.get(run_id)
            if not rec:
                return None
            rec.user_rating = max(1, min(5, int(rating)))
            # Append a rating patch line (ledger stays append-only on disk)
            patch = {
                "type": "rating_patch",
                "run_id": run_id,
                "user_rating": rec.user_rating,
                "timestamp": time.time(),
            }
            with self._path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(patch, ensure_ascii=False) + "\n")
            return rec

    def all_runs(self) -> list[RunRecord]:
        return list(self._index.values())

    def recent(self, limit: int = 100) -> list[RunRecord]:
        runs = sorted(self._index.values(), key=lambda r: r.timestamp, reverse=True)
        return runs[: max(1, limit)]

    def count(self) -> int:
        return len(self._index)


def new_run_id() -> str:
    return str(uuid.uuid4())


# Process singleton
_ledger: RunLedger | None = None


def get_ledger() -> RunLedger:
    global _ledger
    if _ledger is None:
        _ledger = RunLedger()
    return _ledger
