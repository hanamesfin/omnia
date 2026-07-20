"use client";

import { ChevronDown, Cpu, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

export type RoutingPick = {
  name: string;
  display_name: string;
  provider?: string;
  score?: number;
  reason?: string;
  estimated_cost_usd?: number;
  estimated_latency_ms?: number;
};

export type RoutingPayload = {
  model_id?: string;
  auto_routed?: boolean;
  recommendation?: {
    recommended?: RoutingPick;
    backup?: RoutingPick;
    picks?: Record<string, RoutingPick>;
    alternatives?: RoutingPick[];
    confidence?: number;
    estimated_cost_usd?: number;
    estimated_latency_ms?: number;
    explanation?: string;
    task_analysis?: {
      primary_task?: string;
      detected_categories?: string[];
      complexity?: string;
      multi_task?: boolean;
    };
  };
  workflow?: {
    multi_agent?: boolean;
    subtasks?: Array<{
      role: string;
      model_display_name: string;
      description: string;
    }>;
  };
};

type Props = {
  routing: RoutingPayload | null;
  compact?: boolean;
  className?: string;
};

export function ModelRouterPanel({ routing, compact, className = "" }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!routing?.recommendation?.recommended) {
    return compact ? null : (
      <p className={`text-xs text-muted ${className}`}>Optimized automatically.</p>
    );
  }

  const rec = routing.recommendation;
  const primary = rec.recommended!;
  const analysis = rec.task_analysis;
  const picks = rec.picks || {};

  if (compact) {
    return (
      <div
        className={`flex flex-wrap items-center gap-2 text-xs text-muted ${className}`}
        title={rec.explanation}
      >
        <Sparkles size={12} className="text-alive" aria-hidden />
        <span>
          Optimized: <span className="font-medium text-foreground">{primary.display_name}</span>
        </span>
        {rec.confidence != null && (
          <span className="rounded-full bg-alive/10 px-2 py-0.5 text-[10px] text-alive">
            {Math.round(rec.confidence * 100)}% match
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide hover:text-foreground"
        >
          Details
          <ChevronDown size={12} className={expanded ? "rotate-180" : ""} />
        </button>
        {expanded && (
          <div className="w-full rounded-xl bg-surface/80 p-3 ring-1 ring-border">
            <RouterDetails rec={rec} picks={picks} analysis={analysis} routing={routing} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-surface/80 p-4 ring-1 ring-border ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <Cpu size={16} className="text-alive" aria-hidden />
        <p className="text-sm font-medium">Model routing</p>
        <span className="ml-auto rounded-full bg-alive/10 px-2 py-0.5 text-[10px] font-semibold text-alive">
          Optimized automatically
        </span>
      </div>
      <RouterDetails rec={rec} picks={picks} analysis={analysis} routing={routing} />
    </div>
  );
}

function RouterDetails({
  rec,
  picks,
  analysis,
  routing,
}: {
  rec: NonNullable<RoutingPayload["recommendation"]>;
  picks: Record<string, RoutingPick>;
  analysis: RoutingPayload["recommendation"] extends infer R
    ? R extends { task_analysis?: infer T }
      ? T
      : undefined
    : undefined;
  routing: RoutingPayload;
}) {
  const primary = rec.recommended!;

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-xs text-muted">Recommended</p>
        <p className="font-medium">{primary.display_name}</p>
        <p className="text-xs text-muted">{primary.reason || rec.explanation}</p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {rec.estimated_cost_usd != null && (
          <span>Est. cost ~${rec.estimated_cost_usd.toFixed(4)}</span>
        )}
        {rec.estimated_latency_ms != null && (
          <span>Est. ~{(rec.estimated_latency_ms / 1000).toFixed(1)}s</span>
        )}
        {rec.confidence != null && <span>Confidence {Math.round(rec.confidence * 100)}%</span>}
      </div>

      {analysis && (
        <div className="rounded-xl bg-background/60 p-3 text-xs">
          <p className="font-medium text-foreground">Task analysis</p>
          <p className="mt-1 text-muted">
            {analysis.primary_task?.replaceAll("_", " ")} · {analysis.complexity} complexity
          </p>
          {analysis.detected_categories && analysis.detected_categories.length > 0 && (
            <p className="mt-1 text-muted">
              Detected: {analysis.detected_categories.slice(0, 5).join(", ")}
            </p>
          )}
        </div>
      )}

      {Object.keys(picks).length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
            Profile picks
          </p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {Object.entries(picks).map(([profile, pick]) => (
              <li
                key={profile}
                className="rounded-lg bg-background/60 px-2 py-1.5 text-xs ring-1 ring-border"
              >
                <span className="font-medium capitalize">{profile.replaceAll("_", " ")}</span>
                <span className="text-muted"> · {pick.display_name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {routing.workflow?.multi_agent && routing.workflow.subtasks && (
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted">
            <Zap size={11} aria-hidden />
            Multi-agent plan
          </p>
          <ol className="space-y-1 text-xs">
            {routing.workflow.subtasks.map((st, i) => (
              <li key={i} className="rounded-lg bg-background/60 px-2 py-1.5 ring-1 ring-border">
                <span className="font-medium">{st.role}</span>
                <span className="text-muted"> → {st.model_display_name}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
