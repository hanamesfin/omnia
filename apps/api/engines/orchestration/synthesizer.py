"""
Synthesizer stage — merge normalized AgentResults into one final response.
Treated as its own routing problem (dedicated synthesis model).
"""
from __future__ import annotations

from typing import Any, Awaitable, Callable

from engines.model_selection.recommendation import recommend
from engines.model_selection.task_analyzer import analyze_prompt
from engines.orchestration.results import AgentResult
from engines.orchestration.workspace import SharedWorkspace


CompleteFn = Callable[..., Awaitable[tuple[str, str]]]


SYNTHESIS_SYSTEM = """\
You are Omnia's synthesis agent. Multiple specialist agents completed subtasks.
Merge their outputs into ONE coherent, well-structured final answer for the user.

Rules:
- Preserve important facts, code, and numbers from each agent.
- Resolve contradictions explicitly.
- Do not invent work that agents did not produce.
- Prefer clarity over length.
- If an agent failed, note the gap briefly and continue with available results.
"""


def pick_synthesis_model(
    *,
    user_prompt: str,
    results: list[AgentResult],
    preferred: str | None = None,
) -> str:
    """Router chooses a synthesis model based on output size / reasoning needs."""
    combined_len = sum(len(r.result or "") for r in results)
    analysis = analyze_prompt(
        f"Synthesize multi-agent outputs for: {user_prompt[:800]}",
        domain="writing" if combined_len < 4000 else "research",
    )
    # Large merges need stronger reasoning
    if combined_len > 8000 or len(results) >= 4:
        analysis.reasoning_level = min(1.0, analysis.reasoning_level + 0.25)
        analysis.complexity = "high"
    rec = recommend(analysis, preferred=preferred)
    return rec.recommended.name


async def synthesize_results(
    *,
    workspace: SharedWorkspace,
    complete_fn: CompleteFn,
    preferred_model: str | None = None,
) -> tuple[str, str, AgentResult]:
    """
    Returns (final_text, model_used, synthesis_AgentResult).
    """
    completed = workspace.completed_results()
    model_id = pick_synthesis_model(
        user_prompt=workspace.user_prompt,
        results=completed,
        preferred=preferred_model,
    )

    if not completed:
        empty = AgentResult(
            task_id="synthesis",
            agent="Synthesizer",
            model=model_id,
            status="failed",
            error="No completed agent results to synthesize",
            role="Synthesis",
            task_profile="writing",
        )
        return "No agent results were available to synthesize.", model_id, empty

    # Single successful path — still normalize through synthesizer for consistency
    if len(completed) == 1 and not workspace.meta.get("force_synthesize"):
        only = completed[0]
        synth = AgentResult(
            task_id="synthesis",
            agent="Synthesizer",
            model=only.model,
            status="completed",
            result=only.result,
            confidence=only.confidence or 0.85,
            role="Synthesis",
            task_profile="writing",
            next_context={"passthrough": True},
        )
        return only.result, only.model, synth

    blocks = []
    for r in completed:
        blocks.append(
            f"## {r.role or r.agent} [{r.model}] (confidence={r.confidence:.2f})\n"
            f"{(r.result or '').strip()[:8000]}"
        )
    user = (
        f"Original user request:\n{workspace.user_prompt}\n\n"
        f"Domain: {workspace.domain}\n\n"
        f"Agent outputs:\n\n" + "\n\n".join(blocks) + "\n\n"
        "Produce the final merged answer now."
    )

    text, used = await complete_fn(
        system=SYNTHESIS_SYSTEM,
        user=user,
        preferred_model=model_id,
        max_tokens=2500,
    )
    synth = AgentResult(
        task_id="synthesis",
        agent="Synthesizer",
        model=used,
        status="completed",
        result=text,
        confidence=0.9,
        role="Synthesis",
        task_profile="writing",
        output_tokens=max(1, len(text.split())),
    )
    workspace.put_result(synth)
    return text, used, synth
