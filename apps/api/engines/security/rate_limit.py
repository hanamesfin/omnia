"""
Simple in-process sliding-window limiter (SEC-05).
Enough for standalone/demo; swap for Redis in multi-worker production.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, *, limit: int, window_s: float) -> bool:
        now = time.monotonic()
        cutoff = now - window_s
        with self._lock:
            q = self._hits[key]
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            return True

    def reset(self, key: str | None = None) -> None:
        with self._lock:
            if key is None:
                self._hits.clear()
            else:
                self._hits.pop(key, None)


# Shared limiter for Create / interview endpoints
create_limiter = SlidingWindowLimiter()
