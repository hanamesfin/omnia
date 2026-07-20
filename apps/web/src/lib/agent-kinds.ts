/** Agent product kinds — not everything is a chatbot (App Store model). */

export const AGENT_KINDS = [
  "chat",
  "tool",
  "transformer",
  "analyzer",
  "automation",
] as const;

export type AgentKind = (typeof AGENT_KINDS)[number];

export type KindMeta = {
  id: AgentKind;
  label: string;
  short: string;
  /** Primary CTA on store cards */
  getLabel: string;
  /** Primary workspace action */
  openLabel: string;
  description: string;
  /** Soft accent for icon tile */
  swatch: string;
};

export const KIND_META: Record<AgentKind, KindMeta> = {
  chat: {
    id: "chat",
    label: "Chat",
    short: "Conversation",
    getLabel: "GET",
    openLabel: "Open",
    description: "Multi-turn companion for back-and-forth help.",
    swatch: "#3b82f6",
  },
  tool: {
    id: "tool",
    label: "Tool",
    short: "One-shot",
    getLabel: "GET",
    openLabel: "Run",
    description: "Paste an input, get a structured result — not a chat thread.",
    swatch: "#22d3ee",
  },
  transformer: {
    id: "transformer",
    label: "Transformer",
    short: "Rewrite",
    getLabel: "GET",
    openLabel: "Transform",
    description: "Turns text or data from one form into another.",
    swatch: "#a78bfa",
  },
  analyzer: {
    id: "analyzer",
    label: "Analyzer",
    short: "Insight",
    getLabel: "GET",
    openLabel: "Analyze",
    description: "Reads material and returns findings — papers, logs, sheets.",
    swatch: "#34d399",
  },
  automation: {
    id: "automation",
    label: "Automation",
    short: "Workflow",
    getLabel: "GET",
    openLabel: "Configure",
    description: "Runs a repeatable process with rules you set.",
    swatch: "#fbbf24",
  },
};

export function parseAgentKind(raw: unknown): AgentKind {
  const s = String(raw || "").toLowerCase();
  if (s.includes("frontier") || s.includes("chatgpt") || s.includes("omni") || s.includes("files + tools")) return "chat";
  if (s.includes("transform") || s.includes("rewrite") || s.includes("draft")) return "transformer";
  if (s.includes("analy") || s.includes("insight") || s.includes("distill") || s.includes("summar")) return "analyzer";
  if (s.includes("automat") || s.includes("workflow") || s.includes("background") || s.includes("batch")) return "automation";
  if (s.includes("tool") || s.includes("one-shot") || s.includes("one shot") || s.includes("triage") || s.includes("review")) return "tool";
  if (s.includes("chat") || s.includes("companion") || s.includes("conversation") || s.includes("support")) return "chat";
  if ((AGENT_KINDS as readonly string[]).includes(s)) return s as AgentKind;
  return "tool";
}

export function kindMeta(kind: unknown): KindMeta {
  return KIND_META[parseAgentKind(kind)];
}

/** Initials-style glyph for store icons */
export function agentGlyph(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
