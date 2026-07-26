/**
 * agent-storage.ts
 *
 * LocalStorage persistence layer for user created and published agents.
 * Ensures agents saved to "Yours" or published to "Discover" persist locally
 * across page refreshes, browser reloads, and Vercel serverless cold-starts.
 */

const LOCAL_AGENTS_KEY = "omnia_local_created_agents";
const PUBLISHED_AGENTS_KEY = "omnia_local_published_agents";

export type StoredAgent = {
  id: string;
  agent_id?: string;
  name: string;
  specialty: string;
  model_id: string;
  kind?: string;
  domain?: string;
  logo?: any;
  developer?: string;
  source: "created" | "added_from_explore";
  share_context?: boolean;
  current_version?: number;
  rating_avg?: number;
  rating_count?: number;
  stars?: number;
  has_product_app?: boolean;
  product_app?: any;
  product_blueprint?: any;
  published_at?: string;
  created_at?: string;
};

export function getLocalAgents(): StoredAgent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_AGENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAgentToLocal(agent: Partial<StoredAgent> & { id: string; name: string }) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalAgents();
    const aid = agent.id || agent.agent_id || "agent-id";
    const normalized: StoredAgent = {
      id: aid,
      agent_id: aid,
      name: agent.name || "Untitled Agent",
      specialty: agent.specialty || "AI Assistant",
      model_id: agent.model_id || "openai/gpt-4o-mini",
      kind: agent.kind || "chat",
      domain: agent.domain || "general",
      logo: agent.logo || null,
      developer: agent.developer || "You",
      source: agent.source || "created",
      share_context: false,
      current_version: agent.current_version || 1,
      has_product_app: agent.has_product_app ?? true,
      product_app: agent.product_app,
      product_blueprint: agent.product_blueprint,
      created_at: agent.created_at || new Date().toISOString(),
    };
    const index = current.findIndex((a) => a.id === aid || a.agent_id === aid);
    if (index >= 0) {
      current[index] = { ...current[index], ...normalized };
    } else {
      current.unshift(normalized);
    }
    localStorage.setItem(LOCAL_AGENTS_KEY, JSON.stringify(current));
  } catch {
    /* non-blocking */
  }
}

export function getPublishedAgents(): StoredAgent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PUBLISHED_AGENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function publishAgentToLocal(agent: Partial<StoredAgent> & { id: string; name: string }) {
  if (typeof window === "undefined") return;
  try {
    saveAgentToLocal(agent);
    const current = getPublishedAgents();
    const aid = agent.id || agent.agent_id || "agent-id";
    const normalized: StoredAgent = {
      id: aid,
      agent_id: aid,
      name: agent.name || "Untitled Agent",
      specialty: agent.specialty || "AI Assistant",
      model_id: agent.model_id || "openai/gpt-4o-mini",
      kind: agent.kind || "chat",
      domain: agent.domain || "general",
      logo: agent.logo || null,
      developer: agent.developer || "You",
      source: "created",
      share_context: false,
      current_version: agent.current_version || 1,
      has_product_app: agent.has_product_app ?? true,
      product_app: agent.product_app,
      product_blueprint: agent.product_blueprint,
      published_at: agent.published_at || new Date().toISOString(),
    };
    const index = current.findIndex((a) => a.id === aid || a.agent_id === aid);
    if (index >= 0) {
      current[index] = { ...current[index], ...normalized };
    } else {
      current.unshift(normalized);
    }
    localStorage.setItem(PUBLISHED_AGENTS_KEY, JSON.stringify(current));
  } catch {
    /* non-blocking */
  }
}
