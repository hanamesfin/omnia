"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, X } from "lucide-react";
import { fetchApi } from "@/lib/api";

type Nudge = {
  code: string;
  severity: "info" | "warn" | "critical";
  title: string;
  message: string;
  layer: string;
};

type Props = {
  agentId: string;
  className?: string;
};

export function DriftNudgeBanner({ agentId, className = "" }: Props) {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    fetchApi(`/agents/${agentId}/drift`, { silentAuth: true })
      .then((res) => {
        if (!cancelled && Array.isArray(res?.nudges)) setNudges(res.nudges);
      })
      .catch(() => {
        if (!cancelled) setNudges([]);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const visible = nudges.filter((n) => !dismissed.has(n.code));
  if (visible.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {visible.map((nudge) => (
        <div
          key={nudge.code}
          role="status"
          className={`flex gap-3 rounded-2xl px-4 py-3 ring-1 ${
            nudge.severity === "critical"
              ? "bg-rose-500/10 ring-rose-500/30"
              : nudge.severity === "warn"
                ? "bg-amber-500/10 ring-amber-500/30"
                : "bg-sky-500/10 ring-sky-500/25"
          }`}
        >
          {nudge.severity === "info" ? (
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
          ) : (
            <AlertTriangle
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                nudge.severity === "critical" ? "text-rose-600" : "text-amber-700"
              }`}
              aria-hidden
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{nudge.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{nudge.message}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
              Layer · {nudge.layer}
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-1 text-muted hover:bg-background/60 hover:text-foreground"
            onClick={() => setDismissed((prev) => new Set(prev).add(nudge.code))}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
