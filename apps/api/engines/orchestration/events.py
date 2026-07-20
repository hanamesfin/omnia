"""
Execution Event Bus — orchestrator emits events; UI/logs/analytics subscribe.
Decouples the execution engine from presentation.
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import asdict, dataclass, field
from typing import Any, Awaitable, Callable, Literal


EventType = Literal[
    "workflow.started",
    "workflow.completed",
    "workflow.failed",
    "task.started",
    "task.completed",
    "task.failed",
    "task.retrying",
    "synthesis.started",
    "synthesis.completed",
]


@dataclass
class ExecutionEvent:
    type: EventType
    workflow_id: str
    timestamp_ms: int = 0
    task_id: str | None = None
    payload: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.timestamp_ms:
            self.timestamp_ms = int(time.time() * 1000)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


EventHandler = Callable[[ExecutionEvent], Awaitable[None] | None]


class ExecutionEventBus:
    """In-process pub/sub for one workflow run (or process-wide subscribers)."""

    def __init__(self) -> None:
        self._handlers: list[EventHandler] = []
        self._history: list[ExecutionEvent] = []

    def subscribe(self, handler: EventHandler) -> None:
        self._handlers.append(handler)

    def unsubscribe(self, handler: EventHandler) -> None:
        self._handlers = [h for h in self._handlers if h is not handler]

    async def emit(self, event: ExecutionEvent) -> None:
        self._history.append(event)
        for handler in list(self._handlers):
            try:
                result = handler(event)
                if asyncio.iscoroutine(result):
                    await result
            except Exception:
                # Never let subscriber failures kill the workflow.
                continue

    def history(self) -> list[dict[str, Any]]:
        return [e.to_dict() for e in self._history]

    def clear_history(self) -> None:
        self._history.clear()
