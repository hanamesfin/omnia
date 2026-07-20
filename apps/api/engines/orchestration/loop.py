"""
§1.2 Runtime Orchestration Loop — bounded reason→act with permission checks.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Literal

from engines.orchestration.decision import ActionOption, choose_action
from engines.spec.schema import AgentSpecV1
from engines.tools.registry import permitted, get_tool

MAX_STEPS = 6
TOOL_TIMEOUT_S = 8

ActionName = Literal["answer", "ask_user", "call_tool"]


@dataclass
class Thought:
    action: ActionName
    content: str = ""
    tool: str | None = None
    args: dict[str, Any] = field(default_factory=dict)
    tag: str = ""


@dataclass
class LoopResult:
    outcome: Literal["answer", "ask_user", "escalate"]
    content: str
    steps: int
    history: list[dict[str, Any]] = field(default_factory=list)


def _demo_reason(state: dict[str, Any], spec: AgentSpecV1) -> Thought:
    """
    Deterministic reasoner for DEMO_MODE / tests.
    Prefer answer; if user asks to use a tool and one is attached, propose call_tool.
    """
    goal = str(state.get("goal") or "").lower()
    tool_ids = [t.tool_id for t in spec.tools]

    if any(w in goal for w in ("confirm", "should i", "may i", "?")) and "charge" in goal:
        return Thought(action="ask_user", content="That looks sensitive — please confirm before I proceed.")

    for tid in tool_ids:
        if tid.lower().replace("_", " ") in goal or tid.lower() in goal.replace(" ", "_"):
            tool = get_tool(tid)
            tag = "irreversible" if tool and tool.permission_tier == "destructive" else ""
            return Thought(
                action="call_tool",
                tool=tid,
                args={"query": state.get("goal")},
                tag=tag,
                content=f"Use {tid}",
            )

    if any(w in goal for w in ("lookup", "search", "price", "find")):
        read_tools = [t.tool_id for t in spec.tools if t.permission_tier == "read_only"]
        if read_tools:
            return Thought(
                action="call_tool",
                tool=read_tools[0],
                args={"query": state.get("goal")},
                content=f"Use {read_tools[0]}",
            )

    return Thought(
        action="answer",
        content=(
            f"Working as your agent for: {spec.purpose}\n\n"
            f"**Your request:** {state.get('goal')}\n\n"
            f"**Response ({spec.tone}):**\n"
            f"I'll pursue that under my purpose above. Concrete next step: "
            f"break the request into the smallest deliverable that advances "
            f"“{spec.purpose[:100]}”, using only evidence you provided — "
            f"no invented facts.\n\n"
            f"(Escalation: {spec.escalation[:160]})"
        ),
    )


def run_orchestration_loop(
    *,
    user_message: str,
    spec: AgentSpecV1,
    reason_fn: Callable[[dict[str, Any], AgentSpecV1], Thought] | None = None,
    execute_tool: Callable[[str, dict[str, Any]], str] | None = None,
    confirm: Callable[[str, dict[str, Any]], bool] | None = None,
    budget: int = MAX_STEPS,
) -> LoopResult:
    """
    state = { goal, history, step, budget }
    while step ≤ budget: reason → answer | ask_user | call_tool(+permission)
    """
    reason = reason_fn or _demo_reason
    state: dict[str, Any] = {
        "goal": user_message,
        "history": [],
        "step": 0,
        "budget": budget,
    }

    def _exec(tool_id: str, args: dict[str, Any]) -> str:
        if execute_tool:
            return execute_tool(tool_id, args)
        return f"[canned:{tool_id}] ok — {args}"

    while state["step"] <= state["budget"]:
        thought = reason(state, spec)

        # Decision policy overlay for tool calls
        if thought.action == "call_tool":
            options = [
                ActionOption(
                    kind="call_tool",
                    expected_value=0.7,
                    tag=thought.tag or (
                        "irreversible"
                        if (get_tool(thought.tool or "") and get_tool(thought.tool or "").permission_tier == "destructive")
                        else ""
                    ),
                    tool_id=thought.tool,
                    content=thought.content,
                ),
                ActionOption(kind="answer", expected_value=0.4, content="Answer without tools"),
                ActionOption(kind="ask_user", expected_value=0.35, content="Ask a clarifying question"),
            ]
            decision = choose_action(options)
            if decision.action == "ask_user":
                return LoopResult(
                    outcome="ask_user",
                    content=decision.content,
                    steps=state["step"],
                    history=state["history"],
                )
            if decision.action == "answer":
                return LoopResult(
                    outcome="answer",
                    content=decision.content or _demo_reason(state, spec).content,
                    steps=state["step"],
                    history=state["history"],
                )

        if thought.action == "answer":
            return LoopResult(
                outcome="answer",
                content=thought.content,
                steps=state["step"],
                history=state["history"],
            )

        if thought.action == "ask_user":
            return LoopResult(
                outcome="ask_user",
                content=thought.content,
                steps=state["step"],
                history=state["history"],
            )

        if thought.action == "call_tool":
            tool_id = thought.tool or ""
            if not permitted(spec, tool_id):
                return LoopResult(
                    outcome="escalate",
                    content="tool not permitted for this agent",
                    steps=state["step"],
                    history=state["history"],
                )
            tool = get_tool(tool_id)
            tier = tool.permission_tier if tool else "read_only"
            if tier != "read_only":
                ok = True if confirm is None else confirm(tool_id, thought.args)
                if not ok:
                    return LoopResult(
                        outcome="escalate",
                        content="action not confirmed",
                        steps=state["step"],
                        history=state["history"],
                    )
            result = _exec(tool_id, thought.args)
            state["history"].append({"thought": thought.content, "tool": tool_id, "result": result})
            # After tool, next iteration answers from history
            state["goal"] = f"{user_message}\n\nTool {tool_id} result: {result}"

        state["step"] += 1

    return LoopResult(
        outcome="escalate",
        content="step budget exceeded — handing back to user",
        steps=state["step"],
        history=state["history"],
    )
