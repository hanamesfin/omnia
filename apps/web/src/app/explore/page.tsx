"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  Clock3,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { SEED_LISTINGS, type SeedListing } from "@/lib/seed-listings";
import { kindMeta } from "@/lib/agent-kinds";
import { StarRating } from "@/components/StarRating";
import { AgentIcon } from "@/components/AgentIcon";
import { VoiceInput } from "@/components/VoiceInput";
import { ComplexityMark } from "@/components/ComplexityMark";
import { specializationPalette } from "@/lib/specialization-colors";
import type { AgentLogo } from "@/lib/agent-logos";

type ExploreListing = SeedListing & {
  has_product_app?: boolean;
  rank_score?: number;
  aqs?: number;
};

const INTENTS = [
  { id: "all", label: "All agents" },
  { id: "chat", label: "Chat" },
  { id: "build", label: "Build & code" },
  { id: "write", label: "Write" },
  { id: "research", label: "Research" },
  { id: "analyze", label: "Analyze" },
  { id: "automate", label: "Automate" },
] as const;

type IntentId = (typeof INTENTS)[number]["id"];

function starsOf(listing: SeedListing) {
  return listing.rating_avg ?? listing.stars ?? Math.min(5, (listing.wilson_score || 0) * 5);
}

function formatCount(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value || 0);
}

function intentMatches(listing: ExploreListing, intent: IntentId) {
  if (intent === "all") return true;
  const domain = String(listing.domain || "").toLowerCase();
  const kind = String(listing.kind || "").toLowerCase();
  if (intent === "chat") return kind === "chat" || domain.includes("support");
  if (intent === "build") return domain.includes("coding") || domain.includes("developer");
  if (intent === "write") return domain.includes("content") || kind === "transformer";
  if (intent === "research") return domain.includes("research");
  if (intent === "analyze") return kind === "analyzer" || domain.includes("data");
  return kind === "automation";
}

function TrustBadge({ listing }: { listing: ExploreListing }) {
  const verified = String(listing.developer || "").toLowerCase() !== "you";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-alive/10 px-2 py-1 text-[10px] font-semibold text-alive ring-1 ring-alive/20">
      {verified ? <ShieldCheck size={11} aria-hidden /> : <Sparkles size={11} aria-hidden />}
      {verified ? "Verified" : "Community"}
    </span>
  );
}

function AgentCard({
  listing,
  onUse,
  busy,
}: {
  listing: ExploreListing;
  onUse: (listing: ExploreListing) => void;
  busy: boolean;
}) {
  const meta = kindMeta(listing.kind);
  const palette = specializationPalette(listing.domain, listing.kind);
  return (
    <article className="group relative flex min-h-[19rem] flex-col overflow-hidden rounded-[1.35rem] border border-border bg-surface p-5 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-alive/35 hover:shadow-float">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent opacity-80 transition-opacity group-hover:opacity-100 ${palette.wash}`}
      />
      <div className="flex items-start justify-between gap-3">
        <Link href={`/explore/${listing.agent_id}`} prefetch={false}>
          <AgentIcon
            name={listing.name}
            kind={listing.kind}
            domain={listing.domain}
            purpose={listing.specialty}
            agentId={listing.agent_id}
            logo={(listing as ExploreListing & { logo?: AgentLogo }).logo}
            size="md"
            className="relative shadow-soft transition duration-200 group-hover:scale-[1.06] group-hover:shadow-float"
          />
        </Link>
        <div className="flex flex-col items-end gap-2">
          <TrustBadge listing={listing} />
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${palette.wash} ${palette.accent}`}
          >
            <ComplexityMark size={12} tier="normal" />
            {palette.label}
          </span>
        </div>
      </div>

      <div className="mt-5 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-alive">
          {meta.label} · {listing.domain?.replaceAll("_", " ") || "general"}
        </p>
        <Link href={`/explore/${listing.agent_id}`} prefetch={false}>
          <h3 className="mt-2 font-display text-xl font-semibold tracking-tight transition group-hover:opacity-70">
            {listing.name}
          </h3>
        </Link>
        <p className="mt-1 text-xs text-muted">by {listing.developer || "OMNIA"}</p>
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted">
          {listing.specialty}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <div>
          <StarRating value={starsOf(listing)} count={listing.rating_count} size={12} />
          <p className="mt-1 text-[10px] text-muted">{formatCount(listing.rating_count)} uses</p>
        </div>
        <button
          type="button"
          onClick={() => onUse(listing)}
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-alive px-4 text-xs font-semibold text-on-alive shadow-soft transition hover:-translate-y-0.5 hover:brightness-105 disabled:opacity-50"
        >
          {busy ? "Opening…" : "Try agent"}
          {!busy && <ArrowUpRight size={14} aria-hidden />}
        </button>
      </div>
    </article>
  );
}

function TrendingRow({
  listing,
  rank,
  onUse,
  busy,
}: {
  listing: ExploreListing;
  rank: number;
  onUse: (listing: ExploreListing) => void;
  busy: boolean;
}) {
  return (
    <article
      className={`group flex min-w-0 items-center gap-3 py-4 transition ${
        rank > 2 ? "border-t border-border/80" : ""
      }`}
    >
      <span className="flex w-5 shrink-0 items-center justify-center text-sm font-medium text-muted">
        {rank}
      </span>
      <Link href={`/explore/${listing.agent_id}`} prefetch={false} className="relative shrink-0">
        <AgentIcon
          name={listing.name}
          kind={listing.kind}
          domain={listing.domain}
          purpose={listing.specialty}
          agentId={listing.agent_id}
          size="md"
          className="shadow-none transition duration-200 group-hover:scale-[1.03]"
        />
      </Link>
      <Link
        href={`/explore/${listing.agent_id}`}
        prefetch={false}
        className="relative min-w-0 flex-1 truncate font-display text-base font-semibold tracking-tight transition hover:text-alive"
      >
        {listing.name}
      </Link>
      <button
        type="button"
        onClick={() => onUse(listing)}
        disabled={busy}
        className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-full bg-navSelected px-5 text-xs font-bold text-alive transition hover:bg-alive/15 disabled:opacity-50"
      >
        {busy ? "Opening…" : "GET"}
      </button>
    </article>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [listings, setListings] = useState<ExploreListing[]>(SEED_LISTINGS);
  const [offlineSeed, setOfflineSeed] = useState(true);
  const [intent, setIntent] = useState<IntentId>("all");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApi("/marketplace/", { silentAuth: true });
        if (cancelled || !Array.isArray(res) || res.length === 0) return;
        startTransition(() => {
          const mapped = res.map((r: ExploreListing) => ({
            ...r,
            kind: r.kind || "tool",
            developer: r.developer || "OMNIA",
          }));
          // One card per name — API also dedupes, this protects older responses.
          const seen = new Set<string>();
          const unique = mapped.filter((item) => {
            const key = String(item.name || "").trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setListings(unique);
          setOfflineSeed(false);
        });
      } catch {
        /* keep seed shelf */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const filtered = useMemo(() => {
    return listings.filter((listing) => {
      const categoryOk = intentMatches(listing, intent);
      const q = query.trim().toLowerCase();
      const domain = String(listing.domain || "").toLowerCase();
      const semanticTags = [
        domain.includes("coding") ? "code developer programming build debug review" : "",
        domain.includes("content") ? "write writing edit copy document" : "",
        domain.includes("research") ? "research sources citations knowledge search" : "",
        domain.includes("data") ? "analyze analysis spreadsheet csv insights" : "",
        domain.includes("support") ? "chat customer service help inbox" : "",
        String(listing.kind).toLowerCase() === "automation" ? "automate workflow recurring" : "",
      ].join(" ");
      const haystack = [
        listing.name,
        listing.specialty,
        listing.developer,
        listing.kind,
        listing.domain,
        semanticTags,
      ]
        .join(" ")
        .toLowerCase();
      const queryOk = !q || q.split(/\s+/).every((term) => haystack.includes(term));
      return categoryOk && queryOk;
    });
  }, [listings, intent, query]);

  const ranked = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          (b.rank_score ?? b.wilson_score ?? 0) - (a.rank_score ?? a.wilson_score ?? 0)
      ),
    [filtered]
  );
  const featured =
    ranked.find(
      (l) => l.agent_id === "agent-seed-guide" || l.name === "Guide"
    ) || ranked[0];
  const trending = ranked
    .filter((l) => l.agent_id !== featured?.agent_id)
    .slice(0, 4);
  const showDiscoveryHero = !query.trim() && intent === "all";
  const browseListings = showDiscoveryHero
    ? ranked.filter((l) => l.agent_id !== featured?.agent_id)
    : ranked;

  const openAgent = (listing: ExploreListing) => {
    if (listing.has_product_app) {
      router.push(`/app/${listing.agent_id}`);
      return;
    }
    router.push(`/yours/${listing.agent_id}`);
  };

  const getAgent = async (listing: ExploreListing) => {
    if (listing.agent_id.startsWith("seed-")) {
      setToast("Connect the API to get this agent for real");
      setTimeout(() => setToast(null), 3200);
      return;
    }
    try {
      setAddingId(listing.agent_id);
      try {
        await fetchApi(`/agents/${listing.agent_id}/add-to-yours`, { method: "POST" });
        setToast("Added to Yours");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "";
        // Already owned / already in library — still open it.
        if (!/already/i.test(message)) throw err;
        setToast("Opening your agent");
      }
      setTimeout(() => openAgent(listing), 350);
    } catch (err: unknown) {
      setToast(err instanceof Error ? err.message : "Couldn't get agent");
      setTimeout(() => setToast(null), 3200);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="relative mx-auto max-w-7xl overflow-hidden px-4 pb-16 pt-[max(4.5rem,calc(env(safe-area-inset-top,0px)+3.75rem))] sm:px-7 lg:px-10 lg:pt-10">
      <div className="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-alive/15 blur-[100px]" />
      <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-[100px]" />
      <header className="relative mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-alive/25 bg-alive/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-alive">
          <Sparkles size={13} aria-hidden />
          Discover
        </div>
        <h1
          className="mt-5 bg-clip-text font-display text-4xl font-semibold tracking-[-0.04em] text-transparent sm:text-5xl"
          style={{
            backgroundImage:
              "linear-gradient(105deg, var(--foreground) 8%, var(--alive) 52%, #c026d3 100%)",
          }}
        >
          Explore to Discover
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Search by what you want to accomplish, then compare focused agents by capability and trust.
        </p>

        <div className="mx-auto mt-7 flex max-w-2xl items-center gap-2 rounded-2xl border border-alive/25 bg-surface/90 p-2 shadow-float backdrop-blur-xl transition focus-within:border-alive/60 focus-within:ring-4 focus-within:ring-alive/10">
          <Search className="ml-2 h-5 w-5 shrink-0 text-alive" aria-hidden />
          <label htmlFor="explore-search" className="sr-only">Search agents</label>
          <input
            id="explore-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What do you want to accomplish?"
            className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-sm text-foreground placeholder:text-muted focus:outline-none sm:text-base"
          />
          <VoiceInput
            value={query}
            onChange={setQuery}
            compact
            menuPlacement="down"
            onError={(message) => {
              setToast(message);
              setTimeout(() => setToast(null), 2800);
            }}
          />
        </div>
      </header>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2 sm:justify-center" role="tablist" aria-label="Agent intents">
        {INTENTS.map((item) => {
          const selected = intent === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setIntent(item.id)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition ${
                selected
                  ? "bg-alive text-on-alive shadow-soft"
                  : "border border-border bg-surface/80 text-muted hover:border-alive/30 hover:bg-alive/10 hover:text-alive"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 rounded-[2rem] border border-dashed border-border bg-surface/40 px-6 py-24 text-center">
          <Bot className="mx-auto h-9 w-9 text-muted" strokeWidth={1.5} />
          <p className="mt-4 font-display text-xl font-semibold text-foreground">No exact match yet</p>
          <p className="mt-2 text-sm text-muted">Create the agent you wish existed.</p>
          <Link
            href="/create"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background"
          >
            Create an agent
            <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <>
          {showDiscoveryHero && <section className="relative mt-10 space-y-6">
            {featured && (
              <article className="group relative min-h-[28rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1020] p-7 text-white shadow-[0_30px_80px_rgba(15,23,42,0.35)] sm:min-h-[30rem] sm:p-9">
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 85% 15%, rgba(111,91,215,0.55), transparent 42%), radial-gradient(circle at 10% 90%, rgba(217,70,239,0.28), transparent 40%), linear-gradient(145deg, #0b1020 0%, #17112e 48%, #1a0f24 100%)",
                  }}
                />
                <div className="pointer-events-none absolute -right-16 top-10 h-72 w-72 rounded-full bg-alive/30 blur-3xl transition duration-700 group-hover:scale-110" />
                <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <div className="pointer-events-none absolute right-14 top-24 h-48 w-48 rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-sm" />
                <div className="pointer-events-none absolute right-28 top-44 h-32 w-32 rounded-full border border-white/10" />

                <div className="relative flex h-full flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                      <Sparkles size={13} className="text-amber-300" />
                      Featured today
                      <span className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur">
                      <ShieldCheck size={11} className="text-alive" />
                      Editor&apos;s pick
                    </span>
                  </div>

                  <Link
                    href={`/explore/${featured.agent_id}`}
                    prefetch={false}
                    className="absolute right-8 top-24 hidden h-52 w-52 items-center justify-center rounded-[2.75rem] border border-white/15 bg-white/[0.07] shadow-[0_30px_60px_rgba(0,0,0,0.3)] backdrop-blur-md transition duration-500 hover:-translate-y-1 hover:rotate-1 sm:flex"
                    aria-label={`View ${featured.name}`}
                  >
                    <div className="absolute inset-5 rounded-[2rem] border border-white/10" />
                    <div className="absolute inset-0 rounded-[2.75rem] bg-gradient-to-br from-white/10 to-transparent" />
                    <div className="absolute -inset-5 -z-10 rounded-full bg-alive/30 blur-3xl" />
                    <AgentIcon
                      name={featured.name}
                      kind={featured.kind}
                      domain={featured.domain}
                      purpose={featured.specialty}
                      agentId={featured.agent_id}
                      size="xl"
                      className="relative shadow-[0_24px_55px_rgba(0,0,0,0.5)] ring-1 ring-white/25 transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute -bottom-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#151227]/90 px-3 py-1.5 text-[10px] font-semibold text-white shadow-xl backdrop-blur">
                      <Sparkles size={11} className="text-amber-300" />
                      Today&apos;s standout
                    </span>
                  </Link>

                  <div className="mt-auto max-w-[34rem] pt-24 sm:pr-40 lg:pr-0">
                    <Link
                      href={`/explore/${featured.agent_id}`}
                      prefetch={false}
                      className="relative mb-5 block w-fit sm:hidden"
                    >
                      <AgentIcon
                        name={featured.name}
                        kind={featured.kind}
                        domain={featured.domain}
                        purpose={featured.specialty}
                        agentId={featured.agent_id}
                        size="lg"
                        className="relative shadow-[0_20px_50px_rgba(0,0,0,0.45)] ring-1 ring-white/20"
                      />
                    </Link>

                    <div className="min-w-0 sm:pr-12">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-alive">
                        {kindMeta(featured.kind).label} · {featured.developer}
                      </p>
                      <h2 className="mt-2 font-display text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                        {featured.name}
                      </h2>
                      <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
                        {featured.specialty}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
                          <Star size={13} className="text-amber-300" fill="currentColor" />
                          {starsOf(featured).toFixed(1)} rating
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
                          <Users size={13} className="text-sky-300" />
                          {formatCount(featured.rating_count)} uses
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
                          <Zap size={13} className="text-violet-300" />
                          Top ranked
                        </span>
                      </div>

                      <div className="mt-7 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => getAgent(featured)}
                          disabled={addingId === featured.agent_id}
                          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:bg-white/95 disabled:opacity-60"
                        >
                          {addingId === featured.agent_id ? "Opening…" : "Try this agent"}
                          <ArrowUpRight size={16} />
                        </button>
                        <Link
                          href={`/explore/${featured.agent_id}`}
                          className="inline-flex min-h-12 items-center rounded-full border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white/90 backdrop-blur transition hover:bg-white/10"
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )}

            <aside className="rounded-[2rem] border border-border bg-surface p-5 shadow-float sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Trending now
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em]">
                    Agents people are choosing today
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Ranked by usefulness, reliability, ratings, and real usage.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] font-medium text-emerald-700">
                    <Check size={12} className="text-emerald-500" />
                    Quality weighted
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] font-medium text-alive">
                    <span className="h-1.5 w-1.5 rounded-full bg-alive" />
                    Live
                  </span>
                </div>
              </div>
              <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
                {trending.map((listing, index) => (
                  <TrendingRow
                    key={listing.agent_id}
                    listing={listing}
                    rank={index + 1}
                    onUse={getAgent}
                    busy={addingId === listing.agent_id}
                  />
                ))}
              </div>
            </aside>
          </section>}

          {browseListings.length > 0 && <section className={showDiscoveryHero ? "mt-14" : "mt-10"}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-alive">
                  Results
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                  {query ? `Results for “${query}”` : intent === "all" ? "Made for your next task" : INTENTS.find((item) => item.id === intent)?.label}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {browseListings.length} {browseListings.length === 1 ? "agent" : "agents"} ready to try.
                </p>
              </div>
              {!offlineSeed && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <Clock3 size={13} />
                  Live marketplace
                </span>
              )}
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {browseListings.map((listing) => (
                <AgentCard
                  key={listing.agent_id}
                  listing={listing}
                  onUse={getAgent}
                  busy={addingId === listing.agent_id}
                />
              ))}
            </div>
          </section>}
        </>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-surface-elevated px-5 py-2.5 text-sm shadow-2xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
