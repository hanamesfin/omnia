"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";
import { fetchApi } from "@/lib/api";

type PostMortem = {
  layer: string;
  title: string;
  diagnosis: string;
  suggested_fix: string;
  raw?: string;
};

type Props = {
  agentId: string;
  error: string;
  events?: { type?: string; content?: string }[];
  onDismiss?: () => void;
  className?: string;
};

export function FailurePostMortem({
  agentId,
  error,
  events,
  onDismiss,
  className = "",
}: Props) {
  const [report, setReport] = useState<PostMortem | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetchApi(`/agents/${agentId}/postmortem`, {
        method: "POST",
        body: JSON.stringify({ error, events: events || [] }),
      });
      setReport(res);
    } catch {
      setReport({
        layer: "unknown",
        title: "Couldn't diagnose",
        diagnosis: "Post-mortem service failed.",
        suggested_fix: "Retry the action or open the orchestration trace.",
        raw: error,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!error) return null;

  return (
    <div
      className={`rounded-2xl bg-rose-500/8 p-4 ring-1 ring-rose-500/25 ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Run failed</p>
          <p className="mt-1 line-clamp-3 font-mono text-xs text-muted">{error}</p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            className="text-xs text-muted hover:text-foreground"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        ) : null}
      </div>

      {!report ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void run()}
          className="mt-3 inline-flex min-h-tap items-center gap-2 rounded-full bg-alive px-4 text-xs font-semibold text-on-alive disabled:opacity-50"
        >
          <Wrench size={14} aria-hidden />
          {loading ? "Diagnosing…" : "Guided post-mortem"}
        </button>
      ) : (
        <div className="mt-3 space-y-2 border-t border-rose-500/20 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Layer · {report.layer}
          </p>
          <p className="font-display text-base font-semibold">{report.title}</p>
          <p className="text-sm text-muted">{report.diagnosis}</p>
          <p className="rounded-xl bg-background/70 px-3 py-2 text-sm text-foreground ring-1 ring-border">
            <span className="font-medium">Try: </span>
            {report.suggested_fix}
          </p>
        </div>
      )}
    </div>
  );
}
