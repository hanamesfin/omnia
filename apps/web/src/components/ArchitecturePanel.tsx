"use client";

import {
  PLATFORM_LAYERS,
  architectureForAgent,
  statusLabel,
  type ArchBlock,
} from "@/lib/agent-architecture";

type Props = {
  agent?: Parameters<typeof architectureForAgent>[0];
  /** Show platform layers (Create / Help) vs single-agent stack */
  showPlatform?: boolean;
  compact?: boolean;
};

function StatusDot({ status }: { status: ArchBlock["status"] }) {
  const color =
    status === "live" ? "bg-alive" : status === "partial" ? "bg-warning" : "bg-muted/40";
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${color}`} aria-hidden />;
}

export function ArchitecturePanel({ agent, showPlatform, compact }: Props) {
  const blocks = architectureForAgent(agent);

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <div>
        <h3 className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Agent as a system
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Silicon Valley agents are stacks — brain, prompt, memory, knowledge, tools, plans, eval —
          not a lone model call.
        </p>
      </div>

      <ul className="space-y-1.5">
        {blocks.map((b) => (
          <li
            key={b.id}
            className="flex gap-2 rounded-xl px-2 py-1.5 text-xs ring-1 ring-transparent hover:bg-surface/80"
          >
            <StatusDot status={b.status} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-foreground">{b.title}</span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
                  {statusLabel(b.status)}
                </span>
              </span>
              {!compact && (
                <span className="mt-0.5 block text-muted">
                  {b.purpose}. {b.note}
                </span>
              )}
              {compact && <span className="mt-0.5 block truncate text-muted">{b.note}</span>}
            </span>
          </li>
        ))}
      </ul>

      {showPlatform && (
        <div className="border-t border-border pt-4">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Platform layers
          </h4>
          <ul className="mt-2 space-y-2">
            {PLATFORM_LAYERS.map((p) => (
              <li key={p.id} className="text-xs">
                <span className="font-medium text-foreground">{p.title}</span>
                <span className="mt-0.5 block text-muted">{p.body}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
