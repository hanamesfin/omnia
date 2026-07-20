"use client";

import { CheckCircle2, Circle, Loader2, XCircle, GitBranch } from "lucide-react";

export type OrchestrationEvent = {
  type: string;
  workflow_id?: string;
  task_id?: string | null;
  payload?: Record<string, unknown>;
  timestamp_ms?: number;
};

type TaskState = {
  id: string;
  role: string;
  model?: string;
  status: "pending" | "running" | "completed" | "failed";
};

type Props = {
  events: OrchestrationEvent[];
  className?: string;
};

export function OrchestrationProgress({ events, className = "" }: Props) {
  if (!events.length) return null;

  const tasks = new Map<string, TaskState>();
  let workflowStatus: "running" | "completed" | "failed" = "running";

  for (const event of events) {
    if (event.type === "workflow.completed") workflowStatus = "completed";
    if (event.type === "workflow.failed") workflowStatus = "failed";
    if (event.type === "task.started" && event.task_id) {
      tasks.set(event.task_id, {
        id: event.task_id,
        role: String(event.payload?.role || event.task_id),
        model: String(event.payload?.model_display_name || event.payload?.model || ""),
        status: "running",
      });
    }
    if (event.type === "task.completed" && event.task_id) {
      const prev = tasks.get(event.task_id);
      tasks.set(event.task_id, {
        id: event.task_id,
        role: String(event.payload?.role || prev?.role || event.task_id),
        model: String(event.payload?.model || prev?.model || ""),
        status: "completed",
      });
    }
    if (event.type === "task.failed" && event.task_id) {
      const prev = tasks.get(event.task_id);
      tasks.set(event.task_id, {
        id: event.task_id,
        role: String(event.payload?.role || prev?.role || event.task_id),
        model: String(event.payload?.model || prev?.model || ""),
        status: "failed",
      });
    }
    if (event.type === "synthesis.started") {
      tasks.set("synthesis", {
        id: "synthesis",
        role: "Synthesis",
        status: "running",
      });
    }
    if (event.type === "synthesis.completed") {
      tasks.set("synthesis", {
        id: "synthesis",
        role: "Synthesis",
        model: String(event.payload?.model || ""),
        status: "completed",
      });
    }
  }

  const list = Array.from(tasks.values());
  if (!list.length && workflowStatus === "running") {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted ${className}`}>
        <Loader2 size={12} className="animate-spin text-alive" />
        Starting multi-agent workflow…
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-surface/80 p-3 ring-1 ring-border ${className}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
        <GitBranch size={12} className="text-alive" aria-hidden />
        Orchestration
        <span className="ml-auto normal-case tracking-normal text-[10px]">
          {workflowStatus === "running" && "running…"}
          {workflowStatus === "completed" && "complete"}
          {workflowStatus === "failed" && "failed"}
        </span>
      </div>
      <ul className="space-y-1.5">
        {list.map((task) => (
          <li key={task.id} className="flex items-center gap-2 text-xs">
            {task.status === "running" && (
              <Loader2 size={12} className="animate-spin text-alive" aria-hidden />
            )}
            {task.status === "completed" && (
              <CheckCircle2 size={12} className="text-alive" aria-hidden />
            )}
            {task.status === "failed" && (
              <XCircle size={12} className="text-danger" aria-hidden />
            )}
            {task.status === "pending" && (
              <Circle size={12} className="text-muted" aria-hidden />
            )}
            <span className="font-medium text-foreground">{task.role}</span>
            {task.model ? <span className="truncate text-muted">· {task.model}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
