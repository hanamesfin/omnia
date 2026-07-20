import { SEED_LISTINGS, type SeedListing } from "@/lib/seed-listings";

import type { AgentLogo } from "@/lib/agent-logos";

export type Suggestable = Pick<
  SeedListing,
  "id" | "agent_id" | "name" | "specialty" | "domain" | "kind" | "developer" | "rating_count"
> & {
  rating_avg?: number;
  stars?: number;
  wilson_score?: number;
  rank_score?: number;
  aqs?: number;
  logo?: AgentLogo;
};

function domainFamily(domain: string): string {
  const d = (domain || "").toLowerCase();
  if (d.includes("content") || d.includes("creative") || d.includes("write")) return "writing";
  if (d.includes("support")) return "support";
  if (d.includes("data") || d.includes("financ")) return "data";
  if (d.includes("research") || d.includes("educat")) return "research";
  if (d.includes("coding") || d.includes("dev")) return "coding";
  if (d.includes("product")) return "productivity";
  return d || "general";
}

function scoreRelated(current: Suggestable, candidate: Suggestable): number {
  let s = 0;
  if (domainFamily(current.domain) === domainFamily(candidate.domain)) s += 3;
  if ((current.kind || "") === (candidate.kind || "")) s += 2;
  if (
    (current.developer || "").toLowerCase() === (candidate.developer || "").toLowerCase() &&
    current.developer
  ) {
    s += 1.5;
  }
  const quality =
    candidate.rank_score ??
    candidate.aqs ??
    candidate.wilson_score ??
    ((candidate.rating_avg ?? candidate.stars ?? 0) / 5) * 0.5;
  s += quality;
  // light preference for popular listings
  s += Math.min(0.4, Math.log10(1 + (candidate.rating_count || 0)) / 10);
  return s;
}

/**
 * App Store–style “You Might Also Like” — same domain/kind first, then quality.
 */
export function suggestRelated(
  current: Suggestable,
  catalog: Suggestable[],
  limit = 8
): Suggestable[] {
  return catalog
    .filter((c) => c.agent_id !== current.agent_id)
    .map((c) => ({ item: c, score: scoreRelated(current, c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}

/** Merge API marketplace rows with seed so suggestions never look empty offline. */
export function mergeCatalog(apiList: Suggestable[] | null | undefined): Suggestable[] {
  const byId = new Map<string, Suggestable>();
  for (const s of SEED_LISTINGS) {
    byId.set(s.agent_id, s);
  }
  if (Array.isArray(apiList)) {
    for (const row of apiList) {
      if (row?.agent_id) byId.set(row.agent_id, { ...byId.get(row.agent_id), ...row });
    }
  }
  return Array.from(byId.values());
}
