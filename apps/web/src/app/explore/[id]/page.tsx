"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { SEED_LISTINGS } from "@/lib/seed-listings";
import { kindMeta } from "@/lib/agent-kinds";
import { StarRating } from "@/components/StarRating";
import { AgentIcon } from "@/components/AgentIcon";
import { RemixAttribution } from "@/components/RemixAttribution";
import { ComplexityMark } from "@/components/ComplexityMark";
import { specializationPalette } from "@/lib/specialization-colors";
import {
  mergeCatalog,
  suggestRelated,
  type Suggestable,
} from "@/lib/explore-suggestions";

type Product = Suggestable & {
  parent_agent_id?: string;
  root_agent_id?: string;
  remix_depth?: number;
  remix_attribution?: {
    parent_agent_id?: string;
    parent_name?: string;
    parent_developer?: string;
    chain?: { agent_id: string; name?: string; developer?: string }[];
  };
  dna?: { fingerprint?: string };
};

function domainLabel(domain: string) {
  const d = (domain || "").toLowerCase();
  if (d.includes("content") || d.includes("creative")) return "Writing";
  if (d.includes("support")) return "Support";
  if (d.includes("data") || d.includes("financ")) return "Data";
  if (d.includes("research") || d.includes("educat")) return "Research";
  if (d.includes("coding") || d.includes("dev")) return "Coding";
  return domain || "General";
}

function starsOf(l: Suggestable) {
  if ((l.rating_count || 0) <= 0) return 0;
  return l.rating_avg ?? l.stars ?? 0;
}

function SuggestionCard({ listing }: { listing: Suggestable }) {
  const meta = kindMeta(listing.kind);
  return (
    <Link
      href={`/explore/${listing.agent_id}`}
      prefetch={false}
      className="interactive group flex w-36 shrink-0 flex-col sm:w-40"
    >
      <AgentIcon
        name={listing.name}
        kind={listing.kind}
        domain={listing.domain}
        purpose={listing.specialty}
        logo={listing.logo}
        agentId={listing.agent_id}
        size="lg"
        className="transition duration-200 group-hover:scale-[1.03]"
      />
      <h3 className="mt-3 line-clamp-2 font-display text-sm font-semibold leading-snug tracking-tight text-foreground group-hover:opacity-80">
        {listing.name}
      </h3>
      <p className="mt-0.5 truncate text-[11px] text-muted">{listing.developer || "OMNIA"}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted/80">{meta.short}</p>
      <div className="mt-1.5">
        <StarRating value={starsOf(listing)} count={listing.rating_count} size={11} />
      </div>
    </Link>
  );
}

export default function ExploreProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [catalog, setCatalog] = useState<Suggestable[]>(SEED_LISTINGS);
  const [loading, setLoading] = useState(true);
  const [getting, setGetting] = useState(false);
  const [remixing, setRemixing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [similar, setSimilar] = useState<
    { agent_id: string; name?: string; score?: number; developer?: string }[]
  >([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchApi("/marketplace/", { silentAuth: true }).catch(() => null);
        if (!cancelled) {
          setCatalog(mergeCatalog(Array.isArray(list) ? list : null));
        }

        try {
          const agent = await fetchApi(`/agents/${id}`);
          if (!cancelled && agent?.id) {
            setProduct({
              id: agent.id,
              agent_id: agent.id,
              name: agent.name,
              specialty: agent.specialty || "",
              domain: agent.domain || "general",
              kind: agent.kind || "tool",
              developer: agent.developer || "OMNIA",
              rating_count: agent.rating_count || 0,
              rating_avg: agent.rating_avg || agent.stars || 0,
              aqs: agent.aqs?.aqs,
              logo: agent.logo,
              parent_agent_id: agent.parent_agent_id,
              root_agent_id: agent.root_agent_id,
              remix_depth: agent.remix_depth,
              remix_attribution: agent.remix_attribution,
              dna: agent.dna,
            });
            setOffline(false);
            setLoading(false);
            fetchApi(`/agents/${id}/similar`, { silentAuth: true })
              .then((res) => {
                if (!cancelled && Array.isArray(res?.similar)) setSimilar(res.similar);
              })
              .catch(() => {});
            return;
          }
        } catch {
          /* marketplace / seed */
        }

        const catalogNow = mergeCatalog(Array.isArray(list) ? list : null);
        const hit =
          catalogNow.find((l) => l.agent_id === id) ||
          SEED_LISTINGS.find((l) => l.agent_id === id);
        if (!cancelled && hit) {
          setProduct(hit);
          setOffline(!Array.isArray(list));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const suggestions = useMemo(() => {
    if (!product) return [];
    return suggestRelated(product, catalog, 8);
  }, [product, catalog]);

  const getAgent = async () => {
    if (!product) return;
    if (product.agent_id.startsWith("seed-")) {
      setToast("Connect the API to get this agent for real");
      setTimeout(() => setToast(null), 3200);
      return;
    }
    try {
      setGetting(true);
      await fetchApi(`/agents/${product.agent_id}/add-to-yours`, { method: "POST" });
      router.push(`/yours/${product.agent_id}`);
    } catch (err: unknown) {
      setToast(err instanceof Error ? err.message : "Couldn't get agent");
      setTimeout(() => setToast(null), 3200);
    } finally {
      setGetting(false);
    }
  };

  const remixAgent = async () => {
    if (!product || product.agent_id.startsWith("seed-")) return;
    try {
      setRemixing(true);
      const res = await fetchApi(`/agents/${product.agent_id}/remix`, { method: "POST" });
      setToast(`Remixed as ${res.name}`);
      setTimeout(() => router.push(`/yours/${res.agent_id}`), 400);
    } catch (err: unknown) {
      setToast(err instanceof Error ? err.message : "Couldn't remix");
      setTimeout(() => setToast(null), 3200);
    } finally {
      setRemixing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6" aria-busy>
        <div className="skeleton h-28 w-28 rounded-[22%]" />
        <div className="mt-6 skeleton h-10 max-w-sm rounded-2xl" />
        <div className="mt-4 skeleton h-24 rounded-3xl" />
        <div className="mt-10 flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-40 w-36 shrink-0 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="font-display text-xl">Agent not found</p>
        <Link href="/explore" className="mt-4 inline-block text-alive hover:underline">
          Back to Discover
        </Link>
      </div>
    );
  }

  const meta = kindMeta(product.kind);
  const palette = specializationPalette(product.domain, product.kind);
  const attribution = product.remix_attribution;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10 sm:py-12">
      <Link
        href="/explore"
        className="interactive inline-flex min-h-tap items-center gap-2 text-sm text-muted"
      >
        <ArrowLeft size={16} strokeWidth={1.5} /> Discover
      </Link>

      <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
        <AgentIcon
          name={product.name}
          kind={product.kind}
          domain={product.domain}
          purpose={product.specialty}
          logo={product.logo}
          agentId={product.agent_id || product.id}
          size="xl"
        />
        <div className="min-w-0 flex-1">
          <div
            className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${palette.wash} ${palette.accent}`}
          >
            <ComplexityMark size={12} />
            {palette.label}
          </div>
          <h1 className="font-display text-[2.5rem] font-bold tracking-tight text-foreground sm:text-[3rem]">{product.name}</h1>
          <p className="mt-1 text-accent">{product.developer}</p>
          <p className="mt-2 text-sm text-muted">
            {meta.label} · {domainLabel(product.domain)}
            {offline ? " · Demo listing" : ""}
          </p>
          {(attribution || product.parent_agent_id) && (
            <RemixAttribution
              className="mt-3"
              chain={attribution?.chain}
              parentId={attribution?.parent_agent_id || product.parent_agent_id}
              parentName={attribution?.parent_name}
              parentDeveloper={attribution?.parent_developer}
              depth={product.remix_depth || 0}
            />
          )}
          <div className="mt-3">
            <StarRating value={starsOf(product)} count={product.rating_count} size={16} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={getAgent}
              disabled={getting}
              className="interactive min-h-tap rounded-full bg-sidebar px-10 text-sm font-semibold uppercase tracking-wide text-accent disabled:opacity-50"
            >
              {getting ? "…" : meta.getLabel}
            </button>
            <button
              type="button"
              onClick={() => void remixAgent()}
              disabled={remixing || offline}
              className="interactive min-h-tap rounded-full border border-border bg-surface px-6 text-sm font-semibold text-foreground disabled:opacity-50"
            >
              {remixing ? "Remixing…" : "Remix"}
            </button>
          </div>
        </div>
      </div>

      <section className="mt-10 rounded-3xl bg-sidebar p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">Details</p>
        <h2 className="mt-2 font-display text-[1.6rem] font-bold tracking-tight text-foreground">What it does</h2>
        <p className="mt-3 text-base leading-relaxed text-muted">{product.specialty}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">{meta.description}</p>
      </section>

      <section className="mt-6 rounded-3xl bg-sidebar p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">Guide</p>
        <h2 className="mt-2 font-display text-[1.6rem] font-bold tracking-tight text-foreground">How you use it</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          After GET, open it from Yours. Primary action:{" "}
          <strong className="font-medium text-foreground">{meta.openLabel}</strong>
          {product.kind === "chat"
            ? " — multi-turn conversation."
            : " — paste an input and get a result. Not a chat thread."}
        </p>
      </section>

      {/* App Store–style suggestions */}
      {similar.length > 0 && (
        <section className="mt-6 rounded-3xl bg-sidebar p-7" aria-labelledby="dna-similar">
          <h2 id="dna-similar" className="font-display text-xl tracking-tight sm:text-2xl">
            Genetically similar
          </h2>
          <p className="mt-1 text-sm text-muted">
            Agents that share specialization, tools, or layer DNA with this one.
          </p>
          <ul className="mt-4 space-y-2">
            {similar.slice(0, 5).map((row) => (
              <li key={row.agent_id}>
                <Link
                  href={`/explore/${row.agent_id}`}
                  prefetch={false}
                  className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2 transition hover:bg-background/50"
                >
                  <span className="min-w-0 truncate font-medium">{row.name || row.agent_id}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {typeof row.score === "number" ? `${Math.round(row.score * 100)}%` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {suggestions.length > 0 && (
        <section className="mt-6 rounded-3xl bg-sidebar p-7" aria-labelledby="also-like">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 id="also-like" className="font-display text-xl tracking-tight sm:text-2xl">
                You Might Also Like
              </h2>
              <p className="mt-1 text-sm text-muted">
                More like this in {domainLabel(product.domain)} and similar agent kinds.
              </p>
            </div>
            <Link
              href="/explore"
              className="interactive hidden text-sm font-semibold text-accent sm:inline-flex"
            >
              See All
            </Link>
          </div>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 sm:-mx-0 sm:px-0">
            {suggestions.map((listing) => (
              <SuggestionCard key={listing.agent_id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-surface-elevated px-5 py-2.5 text-sm shadow-float"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
