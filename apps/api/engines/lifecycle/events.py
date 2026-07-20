"""
Event-sourced agent lifecycle (§ audit / rollback / demo-reset).

Append-only log of domain events. Current agent state can be rebuilt by replaying
events for an agent_id — demo reset becomes "truncate log" or "replay to event 0".
"""
from __future__ import annotations

import json
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal

EventType = Literal[
    "agent.created",
    "agent.edited",
    "agent.evaluated",
    "agent.evolved",
    "agent.published",
    "agent.unpublished",
    "agent.archived",
    "agent.logo_set",
    "agent.rated",
]


@dataclass
class AgentLifecycleEvent:
    event_id: str
    agent_id: str
    type: EventType
    actor_id: str
    timestamp: float
    payload: dict[str, Any] = field(default_factory=dict)
    sequence: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> AgentLifecycleEvent:
        return cls(
            event_id=str(raw["event_id"]),
            agent_id=str(raw["agent_id"]),
            type=raw["type"],  # type: ignore[arg-type]
            actor_id=str(raw.get("actor_id") or ""),
            timestamp=float(raw.get("timestamp") or 0),
            payload=dict(raw.get("payload") or {}),
            sequence=int(raw.get("sequence") or 0),
        )


def new_event_id() -> str:
    return str(uuid.uuid4())


class AgentEventLog:
    """
    Local JSONL append-only store (standalone).
    Production can swap for Postgres event table with the same interface.
    """

    def __init__(self, path: Path | None = None) -> None:
        root = Path(__file__).resolve().parents[2]
        self._path = path or (root / ".omnia_agent_events.jsonl")
        self._lock = threading.Lock()
        self._seq = 0
        self._bootstrap_seq()

    def _bootstrap_seq(self) -> None:
        if not self._path.exists():
            return
        try:
            last = 0
            with self._path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    row = json.loads(line)
                    last = max(last, int(row.get("sequence") or 0))
            self._seq = last
        except Exception:
            self._seq = 0

    def append(
        self,
        *,
        agent_id: str,
        type: EventType,
        actor_id: str,
        payload: dict[str, Any] | None = None,
    ) -> AgentLifecycleEvent:
        with self._lock:
            self._seq += 1
            event = AgentLifecycleEvent(
                event_id=new_event_id(),
                agent_id=agent_id,
                type=type,
                actor_id=actor_id,
                timestamp=time.time(),
                payload=dict(payload or {}),
                sequence=self._seq,
            )
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with self._path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(event.to_dict(), ensure_ascii=False) + "\n")
            return event

    def list_for_agent(self, agent_id: str) -> list[AgentLifecycleEvent]:
        events: list[AgentLifecycleEvent] = []
        if not self._path.exists():
            return events
        with self._path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if str(row.get("agent_id")) == agent_id:
                    events.append(AgentLifecycleEvent.from_dict(row))
        events.sort(key=lambda e: e.sequence)
        return events

    def all_events(self) -> list[AgentLifecycleEvent]:
        events: list[AgentLifecycleEvent] = []
        if not self._path.exists():
            return events
        with self._path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    events.append(AgentLifecycleEvent.from_dict(json.loads(line)))
                except (json.JSONDecodeError, KeyError, TypeError, ValueError):
                    continue
        events.sort(key=lambda e: e.sequence)
        return events

    def truncate(self) -> None:
        """Demo reset: wipe the event log (replay to zero)."""
        with self._lock:
            if self._path.exists():
                self._path.unlink()
            self._seq = 0

    def project_agent(self, agent_id: str) -> dict[str, Any]:
        """
        Rebuild a minimal projected state from events (rollback / audit view).
        Not a full Agent row — enough to prove replayability.
        """
        state: dict[str, Any] = {
            "agent_id": agent_id,
            "status": "unknown",
            "version": 0,
            "published": False,
            "aqs": None,
            "history": [],
        }
        for event in self.list_for_agent(agent_id):
            state["history"].append({"type": event.type, "sequence": event.sequence})
            if event.type == "agent.created":
                state["status"] = "active"
                state["version"] = 1
                state["name"] = event.payload.get("name")
                state["create_tier"] = event.payload.get("create_tier")
                state["aqs"] = event.payload.get("aqs")
            elif event.type == "agent.edited":
                state["version"] = int(state.get("version") or 0) + 1
                state.update({k: v for k, v in event.payload.items() if k != "diff"})
            elif event.type == "agent.evaluated":
                state["aqs"] = event.payload.get("aqs", state.get("aqs"))
                state["last_eval"] = event.payload
            elif event.type == "agent.evolved":
                state["version"] = int(state.get("version") or 0) + 1
                state["evolved"] = True
            elif event.type == "agent.published":
                state["published"] = True
            elif event.type == "agent.unpublished":
                state["published"] = False
            elif event.type == "agent.archived":
                state["status"] = "archived"
        return state


_log: AgentEventLog | None = None


def get_event_log(path: Path | None = None) -> AgentEventLog:
    global _log
    if path is not None:
        return AgentEventLog(path=path)
    if _log is None:
        _log = AgentEventLog()
    return _log


def reset_event_log_for_tests(log: AgentEventLog | None = None) -> None:
    global _log
    _log = log
