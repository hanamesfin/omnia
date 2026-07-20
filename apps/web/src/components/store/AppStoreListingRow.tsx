"use client";

import Link from "next/link";
import { AgentIcon } from "@/components/AgentIcon";
import type { StoreApp } from "@/lib/store-home";

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function AppStoreListingRow({
  app,
  onGet,
  getting,
}: {
  app: StoreApp;
  onGet: (app: StoreApp) => void;
  getting: boolean;
}) {
  return (
    <article className="app-store-row group flex items-center gap-4 border-b border-border/60 py-4 last:border-0 sm:gap-5">
      <Link href={`/explore/${app.agent_id}`} prefetch={false} className="shrink-0">
        <AgentIcon
          name={app.name}
          kind={app.kind}
          domain={app.domain}
          purpose={app.description}
          agentId={app.agent_id}
          size="md"
          className="transition duration-200 group-hover:scale-[1.04]"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/explore/${app.agent_id}`} prefetch={false}>
          <h3 className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground group-hover:text-alive">
            {app.name}
          </h3>
        </Link>
        <p className="mt-0.5 truncate text-xs text-muted">{app.subtitle}</p>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted/90 sm:line-clamp-1">
          {app.description}
        </p>
        <p className="mt-1.5 text-xs text-muted">
          <span className="font-medium text-foreground/80">{app.rating_avg.toFixed(1)}</span>
          <span className="mx-1">·</span>
          {formatCount(app.rating_count)}
          {app.badge ? (
            <span className="ml-2 rounded-md bg-alive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-alive">
              {app.badge}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => onGet(app)}
          disabled={getting}
          className="app-store-get min-h-9 min-w-[4.5rem] rounded-full px-5 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {getting ? "…" : "Get"}
        </button>
        <span className="text-[11px] font-medium text-muted">{app.price}</span>
      </div>
    </article>
  );
}
