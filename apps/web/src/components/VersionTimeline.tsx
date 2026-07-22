"use client";

import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { fetchApi } from "@/lib/api";

type VersionRow = {
  version: number;
  at?: string;
  specialty?: string;
  prompt_preview?: string;
  current?: boolean;
};

type HistoryPayload = {
  current_version: number;
  versions: VersionRow[];
  last_diff?: {
    significant?: boolean;
    summary?: string[];
    changes?: { layer: string; change: string; summary: string }[];
  } | null;
  events?: { type: string; sequence: number; timestamp?: number }[];
};

type Props = {
  agentId: string;
  className?: string;
};

export function VersionTimeline({ agentId, className = "" }: Props) {
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    fetchApi(`/agents/${agentId}/history`, { silentAuth: true })
      .then((res) => {
        if (cancelled || !res) return;
        setData(res);
        const len = Array.isArray(res.versions) ? res.versions.length : 0;
        setIndex(Math.max(0, len - 1));
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const versions = useMemo(() => data?.versions || [], [data]);
  const selected = versions[index];

  if (!data || versions.length === 0) {
    return (
      <div className={`rounded-2xl bg-background/60 p-4 text-sm text-muted ring-1 ring-border ${className}`}>
        <div className="flex items-center gap-2 font-medium text-foreground">
          <History size={16} aria-hidden /> Version timeline
        </div>
        <p className="mt-2 text-xs">No history yet — edits and advances will appear here.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-background/60 p-4 ring-1 ring-border ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-display text-sm font-semibold">
          <History size={16} className="text-alive" aria-hidden />
          Version timeline
        </div>
        <span className="font-mono text-xs text-muted">
          v{selected?.version}
          {selected?.current ? " · live" : ""}
        </span>
      </div>

      <label className="mt-4 block">
        <span className="sr-only">Scrub versions</span>
        <input
          type="range"
          min={0}
          max={Math.max(0, versions.length - 1)}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="w-full accent-[var(--alive)]"
        />
      </label>

      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-muted">
        <span>v{versions[0]?.version}</span>
        <span>v{versions[versions.length - 1]?.version}</span>
      </div>

      {selected?.specialty ? (
        <p className="mt-3 text-sm text-foreground">{selected.specialty}</p>
      ) : null}
      {selected?.prompt_preview ? (
        <pre className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap rounded-xl bg-surface p-3 font-mono text-[11px] leading-relaxed text-muted ring-1 ring-border">
          {selected.prompt_preview}
        </pre>
      ) : null}

      {data.last_diff?.summary && data.last_diff.summary.length > 0 && selected?.current ? (
        <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted">
          <li className="font-medium text-foreground">Latest semantic diff</li>
          {data.last_diff.summary.slice(0, 6).map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
      ) : null}

      {data.events && data.events.length > 0 ? (
        <p className="mt-3 text-[10px] text-muted">
          {data.events.length} lifecycle event{data.events.length === 1 ? "" : "s"} recorded
        </p>
      ) : null}
    </div>
  );
}
