"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Bot, ExternalLink, Plus, Search, Sparkles } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { kindMeta } from "@/lib/agent-kinds";
import { StarRating } from "@/components/StarRating";
import { AgentIcon } from "@/components/AgentIcon";
import { ShellMenuAnchor } from "@/components/ShellMenuDock";

type LibraryAgent = {
  id: string;
  name: string;
  specialty: string;
  model_id: string;
  kind?: string;
  domain?: string;
  logo?: import("@/lib/agent-logos").AgentLogo | null;
  source: "created" | "added_from_explore";
  share_context: boolean;
  current_version: number;
  rating_avg?: number;
  rating_count?: number;
  stars?: number;
  has_product_app?: boolean;
  product_app?: {
    product_type?: string;
    nav_count?: number;
    design_personality?: string;
  };
};

function CardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton h-72 rounded-[1.5rem] border border-border/60" />
      ))}
    </div>
  );
}

export default function YoursPage() {
  const reduce = useReducedMotion();
  const [agents, setAgents] = useState<LibraryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchApi("/agents/");
        setAgents(Array.isArray(res) ? res : []);
        setError(null);
      } catch {
        setError("Couldn't load your library — start the API, then refresh.");
        setAgents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visibleAgents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return agents;
    return agents.filter((agent) =>
      [agent.name, agent.specialty, agent.domain, agent.kind, agent.model_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [agents, search]);
  const created = visibleAgents.filter((a) => a.source === "created");
  const added = visibleAgents.filter((a) => a.source === "added_from_explore");
  const appCount = agents.filter((agent) => agent.has_product_app).length;

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <ShellMenuAnchor />
      <header className="relative mb-8 overflow-hidden rounded-[1.75rem] border border-border bg-surface px-6 py-7 shadow-soft sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-alive/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-alive/20 bg-alive/10 px-3 py-1 text-xs font-semibold text-alive">
              <Sparkles size={13} aria-hidden />
              Your AI workspace
            </div>
            <h1 className="font-display text-display-lg text-foreground">Yours</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              Open any agent as a complete product. Personalize, Advance, and Update live in the sidebar.
            </p>
            {!loading && (
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-muted">
                <span className="rounded-full border border-border bg-canvas px-3 py-1.5">
                  {agents.length} {agents.length === 1 ? "agent" : "agents"}
                </span>
                <span className="rounded-full border border-border bg-canvas px-3 py-1.5">
                  {appCount} product {appCount === 1 ? "app" : "apps"}
                </span>
              </div>
            )}
          </div>
          <Link
            href="/create"
            className="inline-flex min-h-tap shrink-0 items-center justify-center gap-2 self-start rounded-full bg-alive px-6 text-sm font-semibold text-on-alive shadow-soft transition hover:-translate-y-0.5 hover:shadow-float sm:self-auto"
          >
            <Plus size={18} aria-hidden /> Create agent
          </Link>
        </div>
      </header>

      {!loading && agents.length > 0 && (
        <div className="mb-10 flex items-center gap-3">
          <label className="relative block w-full max-w-md">
            <span className="sr-only">Search your agents</span>
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your agents"
              className="min-h-tap w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-alive/50 focus:ring-4 focus:ring-alive/10"
            />
          </label>
        </div>
      )}

      {error && (
        <p className="mb-8 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning" role="status">
          {error}
        </p>
      )}

      {loading ? (
        <CardSkeleton />
      ) : agents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-20 text-center">
          <Bot className="mx-auto h-10 w-10 text-muted/40" aria-hidden />
          <h2 className="mt-4 font-display text-xl font-medium text-foreground">
            Create your first product to see it here
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            A short interview designs pages, navigation, and an AI core for you.
          </p>
          <Link
            href="/create"
            className="mt-8 inline-flex min-h-tap items-center justify-center rounded-xl bg-alive px-5 text-sm font-semibold text-on-alive"
          >
            Start Create
          </Link>
        </div>
      ) : visibleAgents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <Search className="mx-auto h-9 w-9 text-muted/40" aria-hidden />
          <h2 className="mt-4 font-display text-xl font-medium text-foreground">No matching agents</h2>
          <p className="mt-2 text-sm text-muted">Try another name, specialty, or model.</p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="mt-6 min-h-tap rounded-full border border-border px-5 text-sm font-semibold text-foreground"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          <LibrarySection
            title={`Created by you (${created.length})`}
            agents={created}
            empty="Nothing created yet — start with Create."
            reduce={!!reduce}
          />
          <LibrarySection
            title={`Added from Discover (${added.length})`}
            agents={added}
            empty="Browse Discover to add agents others published."
            reduce={!!reduce}
          />
        </div>
      )}
    </div>
  );
}

function LibrarySection({
  title,
  agents,
  empty,
  reduce,
}: {
  title: string;
  agents: LibraryAgent[];
  empty: string;
  reduce: boolean;
}) {
  return (
    <section>
      <h2 className="mb-5 font-display text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {agents.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent, i) => (
            <motion.li
              key={agent.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              whileHover={reduce ? undefined : { y: -3 }}
              className="group relative flex min-h-[19rem] flex-col overflow-hidden rounded-[1.5rem] border border-border bg-surface p-5 shadow-soft transition-shadow hover:shadow-float"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-alive/[0.07] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative mb-4 flex items-start justify-between gap-3">
                <AgentIcon
                  name={agent.name}
                  kind={agent.kind}
                  domain={agent.domain}
                  purpose={agent.specialty}
                  logo={agent.logo}
                  agentId={agent.id}
                  size="sm"
                />
                <span className="rounded-full border border-border bg-canvas px-2.5 py-1 font-mono text-[10px] font-medium text-muted">
                  v{agent.current_version}
                </span>
              </div>
              <h3 className="relative line-clamp-1 font-display text-xl font-semibold tracking-tight">
                {agent.name}
              </h3>
              <p className="relative mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted">
                {agent.specialty || agent.model_id}
              </p>
              <div className="relative mt-3">
                <StarRating
                  value={agent.rating_avg || agent.stars || 0}
                  count={agent.rating_count || 0}
                  size={13}
                />
              </div>
              {agent.has_product_app ? (
                <p className="relative mt-4 line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-alive">
                  {agent.product_app?.product_type || "Product"} ·{" "}
                  {agent.product_app?.nav_count || 0} pages
                </p>
              ) : (
                <p className="relative mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/80">
                  {kindMeta(agent.kind).openLabel}
                </p>
              )}
              <p className="relative mt-2 truncate font-mono text-[11px] text-muted/65">
                {agent.model_id}
              </p>
              <div className="relative mt-auto pt-5">
                <a
                  href={`/app/${agent.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-tap w-full items-center justify-center gap-1.5 rounded-xl border border-blue-500 bg-transparent px-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-500/10 dark:text-blue-400"
                >
                  Open product
                  <ExternalLink size={12} aria-hidden />
                </a>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
