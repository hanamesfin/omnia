"""
Provider Telemetry Collector — live health signals separate from workflow metrics.
"""
from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProviderSample:
    provider: str
    model: str
    timestamp: float
    latency_ms: int
    success: bool
    error_type: str = ""  # "" | timeout | rate_limit | http | other
    status_code: int | None = None


@dataclass
class ProviderWindowStats:
    provider: str
    samples: int = 0
    success_rate: float = 1.0
    avg_latency_ms: float = 0.0
    timeout_rate: float = 0.0
    rate_limit_rate: float = 0.0
    error_rate: float = 0.0
    uptime: float = 1.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "samples": self.samples,
            "success_rate": round(self.success_rate, 4),
            "avg_latency_ms": round(self.avg_latency_ms, 1),
            "timeout_rate": round(self.timeout_rate, 4),
            "rate_limit_rate": round(self.rate_limit_rate, 4),
            "error_rate": round(self.error_rate, 4),
            "uptime": round(self.uptime, 4),
        }


class ProviderTelemetry:
    """
    Rolling windows: 1h / 24h / 7d.
    Router queries this for provider health — not the raw ledger.
    """

    WINDOWS = {
        "1h": 3600,
        "24h": 86400,
        "7d": 604800,
    }

    def __init__(self, max_samples: int = 50_000) -> None:
        self._lock = threading.Lock()
        self._samples: deque[ProviderSample] = deque(maxlen=max_samples)

    def record(
        self,
        *,
        provider: str,
        model: str,
        latency_ms: int,
        success: bool,
        error_type: str = "",
        status_code: int | None = None,
    ) -> None:
        sample = ProviderSample(
            provider=(provider or "unknown").lower(),
            model=model,
            timestamp=time.time(),
            latency_ms=max(0, int(latency_ms)),
            success=bool(success),
            error_type=error_type or "",
            status_code=status_code,
        )
        with self._lock:
            self._samples.append(sample)

    def _window_samples(self, seconds: int, provider: str | None = None) -> list[ProviderSample]:
        cutoff = time.time() - seconds
        with self._lock:
            items = [s for s in self._samples if s.timestamp >= cutoff]
        if provider:
            p = provider.lower()
            items = [s for s in items if s.provider == p]
        return items

    def stats(self, provider: str, window: str = "24h") -> ProviderWindowStats:
        seconds = self.WINDOWS.get(window, 86400)
        samples = self._window_samples(seconds, provider)
        if not samples:
            return ProviderWindowStats(provider=provider.lower())
        n = len(samples)
        ok = sum(1 for s in samples if s.success)
        timeouts = sum(1 for s in samples if s.error_type == "timeout")
        rates = sum(1 for s in samples if s.error_type == "rate_limit")
        errors = sum(1 for s in samples if not s.success)
        avg_lat = sum(s.latency_ms for s in samples) / n
        return ProviderWindowStats(
            provider=provider.lower(),
            samples=n,
            success_rate=ok / n,
            avg_latency_ms=avg_lat,
            timeout_rate=timeouts / n,
            rate_limit_rate=rates / n,
            error_rate=errors / n,
            uptime=ok / n,
        )

    def all_providers(self, window: str = "24h") -> dict[str, ProviderWindowStats]:
        seconds = self.WINDOWS.get(window, 86400)
        samples = self._window_samples(seconds)
        providers = {s.provider for s in samples}
        return {p: self.stats(p, window) for p in sorted(providers)}

    def health_score(self, provider: str, window: str = "24h") -> float:
        """0–1 health for adaptive routing."""
        s = self.stats(provider, window)
        if s.samples < 3:
            return 0.75  # neutral prior
        # Penalize rate limits and errors heavily
        score = (
            0.50 * s.success_rate
            + 0.20 * max(0.0, 1.0 - s.rate_limit_rate * 3)
            + 0.15 * max(0.0, 1.0 - min(s.avg_latency_ms, 20000) / 20000)
            + 0.15 * max(0.0, 1.0 - s.timeout_rate * 4)
        )
        return max(0.0, min(1.0, score))


_telemetry: ProviderTelemetry | None = None


def get_telemetry() -> ProviderTelemetry:
    global _telemetry
    if _telemetry is None:
        _telemetry = ProviderTelemetry()
    return _telemetry
