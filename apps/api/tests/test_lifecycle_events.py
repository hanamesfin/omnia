"""Lifecycle event log — append, project, truncate (DEF-02 / audit)."""
from __future__ import annotations

from pathlib import Path

from engines.lifecycle.events import AgentEventLog, reset_event_log_for_tests


def test_append_and_project(tmp_path: Path):
    log = AgentEventLog(path=tmp_path / "events.jsonl")
    reset_event_log_for_tests(log)

    log.append(
        agent_id="a1",
        type="agent.created",
        actor_id="u1",
        payload={"name": "TriageBot", "create_tier": "enterprise", "aqs": {"aqs": 0.9}},
    )
    log.append(
        agent_id="a1",
        type="agent.published",
        actor_id="u1",
        payload={"visibility": "public"},
    )
    log.append(
        agent_id="a1",
        type="agent.edited",
        actor_id="u1",
        payload={"specialty": "faster triage"},
    )

    events = log.list_for_agent("a1")
    assert len(events) == 3
    assert events[0].sequence < events[1].sequence < events[2].sequence

    projected = log.project_agent("a1")
    assert projected["name"] == "TriageBot"
    assert projected["published"] is True
    assert projected["version"] == 2
    assert projected["specialty"] == "faster triage"
    assert projected["create_tier"] == "enterprise"


def test_truncate_is_replay_to_zero(tmp_path: Path):
    log = AgentEventLog(path=tmp_path / "events2.jsonl")
    log.append(agent_id="x", type="agent.created", actor_id="u", payload={"name": "X"})
    assert log.all_events()
    log.truncate()
    assert log.all_events() == []
    assert log.project_agent("x")["status"] == "unknown"
