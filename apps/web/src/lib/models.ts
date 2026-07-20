/**
 * Foundation model catalog — mirrors apps/api registry (100+ models).
 * Fetches from GET /models when the API is up; falls back to seed list.
 */

import seed from "./models.seed.json";

export type AiModel = {
  name: string;
  display_name: string;
  provider: string;
  family?: string;
  cost_per_1k?: number;
  avg_latency_ms?: number;
  reasoning_score?: number;
  creativity_score?: number;
  coding_score?: number;
  vision_score?: number;
  privacy_tier?: number;
  context_window?: number;
  free?: boolean;
  configured?: boolean;
  configuration_hint?: string | null;
  capabilities?: string[];
  supports_tools?: boolean;
};

export type ModelRecommendation = {
  name: string;
  display_name: string;
  provider: string;
  score: number;
  reason?: string;
  capabilities?: string[];
  configured?: boolean;
};

export type RecommendResponse = {
  task_type: string;
  recommendations: ModelRecommendation[];
};

/** Offline seed — subset of registry when API is unreachable */
export const FALLBACK_MODELS: AiModel[] = (seed as AiModel[]).map((m) => ({
  ...m,
  free: Boolean(m.free),
}));

const PROVIDER_LABEL: Record<string, string> = {
  openrouter: "OpenRouter — Free",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  meta: "Meta",
  mistral: "Mistral",
  xai: "xAI",
  deepseek: "DeepSeek",
  qwen: "Alibaba / Qwen",
  microsoft: "Microsoft",
  cohere: "Cohere",
  ai21: "AI21",
  ibm: "IBM",
  nvidia: "NVIDIA",
  amazon: "Amazon",
  databricks: "Databricks",
  "01-ai": "01.AI",
  allenai: "Allen AI",
  tii: "TII",
};

export function providerLabel(provider: string): string {
  return PROVIDER_LABEL[provider] || provider;
}

export function modelDisplayName(name: string, models: AiModel[] = FALLBACK_MODELS): string {
  const hit = models.find((m) => m.name === name);
  return hit?.display_name || name;
}

export function groupModelsByProvider(
  models: AiModel[]
): { provider: string; label: string; models: AiModel[] }[] {
  const order = Object.keys(PROVIDER_LABEL);
  const map = new Map<string, AiModel[]>();
  for (const m of models) {
    const list = map.get(m.provider) || [];
    list.push(m);
    map.set(m.provider, list);
  }
  const keys = [
    ...order.filter((p) => map.has(p)),
    ...Array.from(map.keys()).filter((p) => !order.includes(p)),
  ].sort((a, b) => {
    const freeA = a === "openrouter" || (map.get(a) || []).some((m) => m.free);
    const freeB = b === "openrouter" || (map.get(b) || []).some((m) => m.free);
    if (freeA !== freeB) return freeA ? -1 : 1;
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return keys.map((provider) => ({
    provider,
    label: providerLabel(provider),
    models: map.get(provider) || [],
  }));
}

export function filterModels(models: AiModel[], query: string): AiModel[] {
  const q = query.trim().toLowerCase();
  if (!q) return models;
  return models.filter((m) => {
    const hay = [
      m.name,
      m.display_name,
      m.provider,
      m.family || "",
      ...(m.capabilities || []),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

let cache: AiModel[] | null = null;
let inflight: Promise<AiModel[]> | null = null;

function normalize(raw: unknown): AiModel[] {
  if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_MODELS;
  return raw
    .map((row) => {
      const r = row as Record<string, unknown>;
      const name = String(r.name || "");
      const free =
        r.free === true ||
        name.includes(":free") ||
        name === "openrouter/free" ||
        String(r.provider || "") === "openrouter";
      return {
        name,
        display_name: String(r.display_name || name),
        provider: String(r.provider || "other"),
        family: r.family ? String(r.family) : undefined,
        cost_per_1k: typeof r.cost_per_1k === "number" ? r.cost_per_1k : undefined,
        avg_latency_ms: typeof r.avg_latency_ms === "number" ? r.avg_latency_ms : undefined,
        reasoning_score: typeof r.reasoning_score === "number" ? r.reasoning_score : undefined,
        creativity_score: typeof r.creativity_score === "number" ? r.creativity_score : undefined,
        coding_score: typeof r.coding_score === "number" ? r.coding_score : undefined,
        vision_score: typeof r.vision_score === "number" ? r.vision_score : undefined,
        privacy_tier: typeof r.privacy_tier === "number" ? r.privacy_tier : undefined,
        context_window: typeof r.context_window === "number" ? r.context_window : undefined,
        free,
        configured: typeof r.configured === "boolean" ? r.configured : undefined,
        configuration_hint: r.configuration_hint ? String(r.configuration_hint) : null,
        capabilities: Array.isArray(r.capabilities)
          ? r.capabilities.map(String)
          : undefined,
        supports_tools: typeof r.supports_tools === "boolean" ? r.supports_tools : undefined,
      };
    })
    .filter((m) => m.name);
}

export function clearModelsCache() {
  cache = null;
}

export async function loadModels(opts?: { force?: boolean }): Promise<AiModel[]> {
  if (opts?.force) cache = null;
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { fetchApi } = await import("@/lib/api");
      const data = await fetchApi("/models/");
      cache = normalize(data);
      return cache;
    } catch {
      cache = FALLBACK_MODELS;
      return cache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function routeModels(opts: {
  prompt: string;
  domain?: string;
  constraints?: string[];
  preferredModel?: string | null;
  attachmentCount?: number;
  hasImages?: boolean;
}): Promise<Record<string, unknown>> {
  try {
    const { fetchApi } = await import("@/lib/api");
    return await fetchApi("/models/route", {
      method: "POST",
      body: JSON.stringify({
        prompt: opts.prompt,
        domain: opts.domain || "general",
        constraints: opts.constraints || [],
        preferred_model: opts.preferredModel || null,
        attachment_count: opts.attachmentCount || 0,
        has_images: opts.hasImages || false,
        enable_workflow: true,
      }),
    });
  } catch {
    return {};
  }
}

export async function recommendModels(opts: {
  domain?: string;
  prompt?: string;
  constraints?: string;
  frontier?: boolean;
  requireTools?: boolean;
  requireVision?: boolean;
  limit?: number;
}): Promise<RecommendResponse> {
  const params = new URLSearchParams();
  params.set("domain", opts.domain || "general");
  if (opts.prompt) params.set("prompt", opts.prompt);
  if (opts.constraints) params.set("constraints", opts.constraints);
  if (opts.frontier) params.set("frontier", "true");
  if (opts.requireTools) params.set("require_tools", "true");
  if (opts.requireVision) params.set("require_vision", "true");
  params.set("limit", String(opts.limit ?? 6));
  try {
    const { fetchApi } = await import("@/lib/api");
    const data = await fetchApi(`/models/recommend?${params.toString()}`);
    if (data && Array.isArray(data.recommendations)) {
      return data as RecommendResponse;
    }
    // Legacy array response
    if (Array.isArray(data)) {
      return { task_type: opts.domain || "general", recommendations: data };
    }
  } catch {
    /* fall through */
  }
  // Offline heuristic: prefer free + high-capability from seed
  const sorted = [...FALLBACK_MODELS].sort((a, b) => {
    const score = (m: AiModel) =>
      (m.free ? 2 : 0) + (m.capabilities?.includes("coding") ? 1 : 0);
    return score(b) - score(a);
  });
  return {
    task_type: opts.domain || "general",
    recommendations: sorted.slice(0, opts.limit ?? 6).map((m) => ({
      name: m.name,
      display_name: m.display_name,
      provider: m.provider,
      score: 0.5,
      reason: "Offline suggestion",
      capabilities: m.capabilities,
    })),
  };
}
