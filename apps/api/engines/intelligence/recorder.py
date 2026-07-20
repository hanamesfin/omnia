"""Helpers to append run ledger + refresh stats after executions."""
from __future__ import annotations

import time
from typing import Any

from engines.intelligence.ledger import ModelUsage, RunRecord, get_ledger, new_run_id
from engines.intelligence.stats_cache import get_stats_cache
from engines.model_selection.registry import MODEL_BY_NAME


def estimate_cost(model_id: str, in_tok: int, out_tok: int) -> float:
    row = MODEL_BY_NAME.get(model_id) or {}
    rate = float(row.get("cost_per_1k") or 0)
    return round(((in_tok + out_tok) / 1000.0) * rate, 6)


def record_execution(
    *,
    user_id: str = "",
    agent_id: str = "",
    workflow_id: str | None = None,
    task_type: str = "general",
    complexity: str = "medium",
    prompt_preview: str = "",
    models: list[dict[str, Any]] | None = None,
    status: str = "success",
    runtime_ms: int = 0,
    input_tokens: int = 0,
    output_tokens: int = 0,
    estimated_cost: float = 0.0,
    retry_count: int = 0,
    mode: str = "single",
    meta: dict[str, Any] | None = None,
) -> RunRecord:
    usages: list[ModelUsage] = []
    for m in models or []:
        mid = str(m.get("model") or "")
        row = MODEL_BY_NAME.get(mid) or {}
        usages.append(
            ModelUsage(
                model=mid,
                provider=str(m.get("provider") or row.get("provider") or ""),
                role=str(m.get("role") or ""),
                input_tokens=int(m.get("input_tokens") or 0),
                output_tokens=int(m.get("output_tokens") or 0),
                runtime_ms=int(m.get("runtime_ms") or 0),
                estimated_cost=float(m.get("estimated_cost") or 0),
                status=str(m.get("status") or "success"),
            )
        )

    record = RunRecord(
        run_id=new_run_id(),
        timestamp=time.time(),
        user_id=user_id,
        agent_id=agent_id,
        workflow_id=workflow_id,
        task_type=task_type,
        complexity=complexity,
        prompt_preview=(prompt_preview or "")[:500],
        models=usages,
        status=status,  # type: ignore[arg-type]
        runtime_ms=runtime_ms,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        estimated_cost=estimated_cost,
        retry_count=retry_count,
        mode=mode,
        meta=meta or {},
    )
    get_ledger().append(record)
    try:
        get_stats_cache().observe_run(record.to_dict())
    except Exception:
        pass
    return record
