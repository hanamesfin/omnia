"use client";

import { useMemo, useState } from "react";
import {
  Brain,
  ClipboardCheck,
  Database,
  GitBranch,
  Layers,
  MemoryStick,
  Wrench,
} from "lucide-react";

export type EnterpriseLayerId =
  | "brain"
  | "prompt"
  | "knowledge"
  | "memory"
  | "tools"
  | "plans"
  | "eval";

export type EnterpriseLayer = {
  id: EnterpriseLayerId;
  title: string;
  blurb: string;
  enabled: boolean;
};

const DEFAULT_LAYERS: EnterpriseLayer[] = [
  { id: "brain", title: "Brain", blurb: "Model routing & reasoning", enabled: true },
  { id: "prompt", title: "Prompt", blurb: "Linted system constitution", enabled: true },
  { id: "knowledge", title: "Knowledge", blurb: "RAG over uploaded docs", enabled: true },
  { id: "memory", title: "Memory", blurb: "Session + long-term recall", enabled: true },
  { id: "tools", title: "Tools", blurb: "Search, code, email, MCP", enabled: true },
  { id: "plans", title: "Plans", blurb: "Multi-step orchestration", enabled: true },
  { id: "eval", title: "Eval", blurb: "Synthetic tests + AQS", enabled: true },
];

const EDGES: Array<[EnterpriseLayerId, EnterpriseLayerId]> = [
  ["brain", "prompt"],
  ["prompt", "knowledge"],
  ["prompt", "memory"],
  ["prompt", "tools"],
  ["knowledge", "plans"],
  ["memory", "plans"],
  ["tools", "plans"],
  ["plans", "eval"],
  ["eval", "brain"],
];

const ICONS: Record<EnterpriseLayerId, typeof Brain> = {
  brain: Brain,
  prompt: Layers,
  knowledge: Database,
  memory: MemoryStick,
  tools: Wrench,
  plans: GitBranch,
  eval: ClipboardCheck,
};

/** Fixed layout positions (percent) for a readable seven-node graph */
const POS: Record<EnterpriseLayerId, { x: number; y: number }> = {
  brain: { x: 50, y: 8 },
  prompt: { x: 50, y: 28 },
  knowledge: { x: 18, y: 48 },
  memory: { x: 50, y: 48 },
  tools: { x: 82, y: 48 },
  plans: { x: 50, y: 68 },
  eval: { x: 50, y: 88 },
};

type Props = {
  layers?: EnterpriseLayer[];
  onChange?: (layers: EnterpriseLayer[]) => void;
  className?: string;
  /** When true, nodes can be toggled (Enterprise Create). */
  interactive?: boolean;
};

export function EnterpriseArchitectureGraph({
  layers: controlled,
  onChange,
  className = "",
  interactive = true,
}: Props) {
  const [internal, setInternal] = useState(DEFAULT_LAYERS);
  const layers = controlled ?? internal;

  const enabledMap = useMemo(() => {
    const m = new Map<EnterpriseLayerId, boolean>();
    layers.forEach((l) => m.set(l.id, l.enabled));
    return m;
  }, [layers]);

  const setLayers = (next: EnterpriseLayer[]) => {
    if (!controlled) setInternal(next);
    onChange?.(next);
  };

  const toggle = (id: EnterpriseLayerId) => {
    if (!interactive) return;
    // Knowledge is required for Enterprise Create — keep on.
    if (id === "knowledge") return;
    setLayers(layers.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)));
  };

  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border border-alive/25 bg-surface p-4 shadow-float sm:p-6 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--alive) 18%, transparent), transparent 42%)",
        }}
      />
      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-alive">
            Enterprise stack
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold tracking-tight">
            Seven-layer architecture
          </h3>
          <p className="mt-1 max-w-md text-xs text-muted">
            Click a node to toggle optional layers. Knowledge stays on — it gates Enterprise generate.
          </p>
        </div>
        <span className="rounded-full bg-alive/10 px-3 py-1 text-[11px] font-semibold text-alive ring-1 ring-alive/20">
          {layers.filter((l) => l.enabled).length} / {layers.length} live
        </span>
      </div>

      <div className="relative mx-auto aspect-[4/5] w-full max-w-lg sm:aspect-[5/4]">
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          {EDGES.map(([from, to]) => {
            const a = POS[from];
            const b = POS[to];
            const active = enabledMap.get(from) && enabledMap.get(to);
            return (
              <line
                key={`${from}-${to}`}
                x1={`${a.x}%`}
                y1={`${a.y}%`}
                x2={`${b.x}%`}
                y2={`${b.y}%`}
                stroke={active ? "var(--alive)" : "var(--border)"}
                strokeWidth={active ? 2 : 1}
                strokeOpacity={active ? 0.55 : 0.35}
                strokeDasharray={active ? undefined : "4 4"}
              />
            );
          })}
        </svg>

        {layers.map((layer) => {
          const Icon = ICONS[layer.id];
          const pos = POS[layer.id];
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => toggle(layer.id)}
              disabled={!interactive || layer.id === "knowledge"}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className={`absolute z-10 flex w-[7.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl border px-2.5 py-2.5 text-center shadow-soft transition sm:w-[8.5rem] ${
                layer.enabled
                  ? "border-alive/35 bg-background/95 ring-1 ring-alive/20"
                  : "border-border bg-surface/80 opacity-55"
              } ${interactive && layer.id !== "knowledge" ? "hover:-translate-y-[calc(50%+2px)] hover:shadow-float" : ""}`}
              aria-pressed={layer.enabled}
              title={layer.blurb}
            >
              <span
                className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl ${
                  layer.enabled ? "bg-alive/15 text-alive" : "bg-navSelected text-muted"
                }`}
              >
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <span className="font-display text-xs font-semibold tracking-tight">{layer.title}</span>
              <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted">{layer.blurb}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
