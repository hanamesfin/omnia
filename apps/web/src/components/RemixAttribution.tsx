"use client";

import Link from "next/link";
import { GitFork } from "lucide-react";

export type AttributionChainItem = {
  agent_id: string;
  name?: string;
  developer?: string;
  remix_depth?: number;
};

type Props = {
  chain?: AttributionChainItem[] | null;
  parentName?: string | null;
  parentDeveloper?: string | null;
  parentId?: string | null;
  depth?: number;
  className?: string;
};

export function RemixAttribution({
  chain,
  parentName,
  parentDeveloper,
  parentId,
  depth = 0,
  className = "",
}: Props) {
  const items =
    chain && chain.length > 0
      ? chain
      : parentId
        ? [
            {
              agent_id: parentId,
              name: parentName || "Original",
              developer: parentDeveloper || undefined,
            },
          ]
        : [];

  if (items.length === 0 && !parentId) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-xs text-muted ${className}`}
      aria-label="Remix attribution"
    >
      <GitFork size={14} className="text-alive" aria-hidden />
      <span className="font-medium text-foreground">
        Remixed{depth > 0 ? ` · depth ${depth}` : ""}
      </span>
      <span aria-hidden>·</span>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.agent_id} className="inline-flex items-center gap-1.5">
            {i > 0 ? <span className="text-muted/60">→</span> : null}
            <Link
              href={`/explore/${item.agent_id}`}
              className="text-alive hover:underline"
              prefetch={false}
            >
              {item.name || item.agent_id}
            </Link>
            {item.developer ? (
              <span className="text-muted">by {item.developer}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
