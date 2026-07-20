"use client";

import { Check, CircleAlert, Gauge, ShieldCheck, Sparkles, Wallet } from "lucide-react";

export type ReportCardScores = {
  coverage?: number;
  safety?: number;
  clarity?: number;
  test_pass_rate?: number;
  aqs?: number;
};

type Props = {
  name: string;
  createTier?: "normal" | "enterprise" | string;
  capabilityTier?: string;
  aqs?: ReportCardScores | null;
  modelScore?: number | null;
  lintPassed?: boolean;
  synthetic?: { pass_rate?: number; count?: number; failed?: string[] } | null;
  toolCount?: number;
  /** Rough estimated USD per typical run — heuristic display only */
  estimatedCostUsd?: number | null;
  className?: string;
};

function pct(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(Math.min(1, Math.max(0, n)) * 100)}%`;
}

function MetricBar({ label, value }: { label: string; value?: number }) {
  const v = value == null ? 0 : Math.min(1, Math.max(0, value));
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-muted">{label}</span>
        <span className="font-mono font-medium text-foreground">{pct(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-navSelected">
        <div
          className="h-full rounded-full bg-alive transition-[width] duration-500"
          style={{ width: `${v * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Post-generate “nutrition label” — capability, reliability, cost, tier.
 */
export function AgentReportCard({
  name,
  createTier = "normal",
  capabilityTier,
  aqs,
  modelScore,
  lintPassed,
  synthetic,
  toolCount = 0,
  estimatedCostUsd,
  className = "",
}: Props) {
  const composite = aqs?.aqs;
  const grade =
    composite == null
      ? "—"
      : composite >= 0.85
        ? "A"
        : composite >= 0.7
          ? "B"
          : composite >= 0.5
            ? "C"
            : "D";

  const cost =
    estimatedCostUsd != null
      ? `~$${estimatedCostUsd.toFixed(3)}`
      : toolCount > 4
        ? "~$0.02–0.08"
        : "~$0.005–0.02";

  return (
    <section
      className={`relative overflow-hidden rounded-[1.75rem] border border-border bg-surface p-5 shadow-float sm:p-6 ${className}`}
      aria-labelledby="agent-report-card-title"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            createTier === "enterprise"
              ? "radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--alive) 16%, transparent), transparent 40%)"
              : "radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--border) 40%, transparent), transparent 40%)",
        }}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-alive">
            <Sparkles size={12} />
            Agent report card
          </p>
          <h2 id="agent-report-card-title" className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Deterministic scores from your spec — no external dataset required.
          </p>
        </div>
        <div
          className={`flex h-16 w-16 flex-col items-center justify-center rounded-2xl ${
            createTier === "enterprise"
              ? "bg-alive text-on-alive shadow-[0_12px_30px_color-mix(in_oklab,var(--alive)_35%,transparent)]"
              : "bg-foreground text-background"
          }`}
        >
          <span className="font-display text-2xl font-bold leading-none">{grade}</span>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider opacity-80">
            AQS
          </span>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-background/60 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            <ShieldCheck size={12} /> Tier
          </p>
          <p className="mt-1 font-display text-lg font-semibold capitalize">{createTier}</p>
          {capabilityTier && (
            <p className="text-xs text-muted capitalize">{capabilityTier} capability</p>
          )}
        </div>
        <div className="rounded-2xl border border-border/80 bg-background/60 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            <Gauge size={12} /> Reliability
          </p>
          <p className="mt-1 font-display text-lg font-semibold">
            {pct(synthetic?.pass_rate ?? aqs?.test_pass_rate)}
          </p>
          <p className="text-xs text-muted">
            {synthetic?.count != null ? `${synthetic.count} synthetic tests` : "Shadow eval suite"}
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-background/60 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            <Wallet size={12} /> Est. cost / run
          </p>
          <p className="mt-1 font-display text-lg font-semibold">{cost}</p>
          <p className="text-xs text-muted">{toolCount} tools attached</p>
        </div>
      </div>

      <div className="relative mt-5 space-y-3 rounded-2xl border border-border/80 bg-background/50 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          Quality breakdown
        </p>
        <MetricBar label="Coverage" value={aqs?.coverage} />
        <MetricBar label="Safety" value={aqs?.safety} />
        <MetricBar label="Clarity" value={aqs?.clarity} />
        <MetricBar label="Test pass rate" value={aqs?.test_pass_rate ?? synthetic?.pass_rate} />
        {modelScore != null && (
          <div className="flex justify-between border-t border-border/60 pt-3 text-xs">
            <span className="text-muted">Model fit score</span>
            <span className="font-mono font-medium">{modelScore.toFixed?.(3) ?? modelScore}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Prompt linter</span>
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              lintPassed ? "text-alive" : "text-danger"
            }`}
          >
            {lintPassed ? <Check size={14} /> : <CircleAlert size={14} />}
            {lintPassed ? "Passed" : "Needs review"}
          </span>
        </div>
      </div>
    </section>
  );
}
