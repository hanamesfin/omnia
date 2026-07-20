"""Proactive drift nudges from simple cost / reliability trends."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Literal


Severity = Literal["info", "warn", "critical"]


@dataclass
class DriftNudge:
    code: str
    severity: Severity
    title: str
    message: str
    layer: str  # tools | eval | cost | reliability

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def analyze_drift(
    *,
    recent_costs: list[float] | None = None,
    recent_success: list[float] | None = None,
    recent_latency_ms: list[float] | None = None,
    aqs_history: list[float] | None = None,
) -> list[DriftNudge]:
    nudges: list[DriftNudge] = []
    costs = [float(c) for c in (recent_costs or []) if c is not None]
    success = [float(s) for s in (recent_success or []) if s is not None]
    latency = [float(x) for x in (recent_latency_ms or []) if x is not None]
    aqs = [float(a) for a in (aqs_history or []) if a is not None]

    if len(costs) >= 4:
        early = sum(costs[: len(costs) // 2]) / max(1, len(costs) // 2)
        late = sum(costs[len(costs) // 2 :]) / max(1, len(costs) - len(costs) // 2)
        if early > 0 and late > early * 1.4:
            nudges.append(
                DriftNudge(
                    code="cost.climbing",
                    severity="warn",
                    title="Cost per run is climbing",
                    message=(
                        f"Recent runs average ${late:.4f} vs earlier ${early:.4f}. "
                        "Review tool-call loops or switch to a cheaper model for routine steps."
                    ),
                    layer="cost",
                )
            )

    if len(success) >= 4:
        early = sum(success[: len(success) // 2]) / max(1, len(success) // 2)
        late = sum(success[len(success) // 2 :]) / max(1, len(success) - len(success) // 2)
        if early - late >= 0.15:
            nudges.append(
                DriftNudge(
                    code="reliability.drop",
                    severity="critical" if late < 0.6 else "warn",
                    title="Reliability is drifting down",
                    message=(
                        f"Success rate fell from {early:.0%} to {late:.0%}. "
                        "Re-run synthetic tests and check knowledge coverage."
                    ),
                    layer="reliability",
                )
            )

    if len(latency) >= 4:
        early = sum(latency[: len(latency) // 2]) / max(1, len(latency) // 2)
        late = sum(latency[len(latency) // 2 :]) / max(1, len(latency) - len(latency) // 2)
        if early > 0 and late > early * 1.5 and late > 2500:
            nudges.append(
                DriftNudge(
                    code="latency.climbing",
                    severity="info",
                    title="Responses are getting slower",
                    message=(
                        f"Latency rose to ~{int(late)}ms. Consider fewer tools or a faster model tier."
                    ),
                    layer="tools",
                )
            )

    if len(aqs) >= 2 and aqs[-1] < aqs[0] - 0.1:
        nudges.append(
            DriftNudge(
                code="aqs.regress",
                severity="warn",
                title="Quality score regressed after edits",
                message=(
                    f"AQS moved from {aqs[0]:.2f} to {aqs[-1]:.2f}. "
                    "Open the version timeline and review the semantic diff."
                ),
                layer="eval",
            )
        )

    return nudges
