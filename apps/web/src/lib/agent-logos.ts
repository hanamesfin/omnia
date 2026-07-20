/**
 * Apple App Store–grade agent logos — soft gradients, pictorial motifs, stable hash.
 * Optional image_url from DALL·E when the API key is live.
 */

export type LogoMotif =
  | "spark"
  | "chat"
  | "code"
  | "bug"
  | "pen"
  | "book"
  | "chart"
  | "shield"
  | "inbox"
  | "waves"
  | "leaf"
  | "bolt"
  | "target"
  | "gear"
  | "heart"
  | "globe";

export type LogoPalette = {
  id: string;
  from: string;
  to: string;
  mid?: string;
  ink: string;
};

export type AgentLogo = {
  motif: LogoMotif;
  palette_id: string;
  /** Display label for Create picker */
  label: string;
  /** Optional generated image (DALL·E) */
  image_url?: string;
  /** How hard this motif hits the agent's brief */
  fit_score?: number;
};

/** Soft product-design gradients (App Store / WWDC vibe). */
export const LOGO_PALETTES: LogoPalette[] = [
  { id: "ocean", from: "#64D2FF", mid: "#0A84FF", to: "#0055D4", ink: "#FFFFFF" },
  { id: "mint", from: "#63E6BE", mid: "#30D158", to: "#248A3D", ink: "#FFFFFF" },
  { id: "violet", from: "#E0B3FF", mid: "#BF5AF2", to: "#7D2AE8", ink: "#FFFFFF" },
  { id: "sunset", from: "#FFD60A", mid: "#FF9F0A", to: "#FF453A", ink: "#FFFFFF" },
  { id: "rose", from: "#FFB3C7", mid: "#FF375F", to: "#D70015", ink: "#FFFFFF" },
  { id: "graphite", from: "#E5E5EA", mid: "#8E8E93", to: "#3A3A3C", ink: "#FFFFFF" },
  { id: "indigo", from: "#A8C8FF", mid: "#5E5CE6", to: "#3634A3", ink: "#FFFFFF" },
  { id: "teal", from: "#66D4CF", mid: "#00C7BE", to: "#0891B2", ink: "#FFFFFF" },
];

const MOTIF_KEYWORDS: { motif: LogoMotif; keys: string[] }[] = [
  { motif: "bug", keys: ["bug", "triage", "debug", "error", "stack", "crash"] },
  { motif: "code", keys: ["code", "pr", "review", "diff", "git", "dev", "program", "swift", "python"] },
  { motif: "pen", keys: ["write", "letter", "content", "draft", "essay", "copy", "blog", "notes"] },
  { motif: "book", keys: ["research", "source", "study", "learn", "education", "paper", "read"] },
  { motif: "chart", keys: ["data", "csv", "table", "analy", "insight", "metric", "budget", "financ"] },
  { motif: "chat", keys: ["chat", "support", "companion", "conversation", "help desk", "qa"] },
  { motif: "inbox", keys: ["inbox", "email", "mail", "message", "sorter", "label"] },
  { motif: "shield", keys: ["safe", "secur", "privacy", "policy", "compliance", "guard"] },
  { motif: "waves", keys: ["audio", "voice", "music", "sound", "meeting", "transcript"] },
  { motif: "leaf", keys: ["health", "wellness", "green", "nature", "calm"] },
  { motif: "bolt", keys: ["fast", "auto", "automation", "workflow", "speed", "power"] },
  { motif: "target", keys: ["goal", "plan", "coach", "focus", "habit"] },
  { motif: "gear", keys: ["tool", "util", "settings", "ops", "system"] },
  { motif: "heart", keys: ["care", "wellbeing", "empathy", "mental"] },
  { motif: "globe", keys: ["translate", "world", "travel", "local", "language", "global"] },
  { motif: "spark", keys: ["omni", "general", "ai", "assistant", "frontier", "chatgpt"] },
];

const MOTIF_LABELS: Record<LogoMotif, string> = {
  spark: "Spark",
  chat: "Conversation",
  code: "Developer",
  bug: "Debug",
  pen: "Writer",
  book: "Research",
  chart: "Insights",
  shield: "Trust",
  inbox: "Inbox",
  waves: "Audio",
  leaf: "Wellness",
  bolt: "Automation",
  target: "Coach",
  gear: "Tools",
  heart: "Care",
  globe: "World",
};

export function getPalette(id: string): LogoPalette {
  return LOGO_PALETTES.find((p) => p.id === id) || LOGO_PALETTES[0];
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function scoreMotifs(...texts: string[]): { motif: LogoMotif; score: number }[] {
  const blob = texts.join(" ").toLowerCase();
  const scored: { motif: LogoMotif; score: number }[] = [];
  for (const row of MOTIF_KEYWORDS) {
    const hits = row.keys.filter((k) => blob.includes(k)).length;
    if (hits) scored.push({ motif: row.motif, score: hits * 10 + (blob.includes(row.motif) ? 4 : 0) });
  }
  scored.sort((a, b) => b.score - a.score || a.motif.localeCompare(b.motif));
  return scored;
}

export function detectMotif(...texts: string[]): LogoMotif {
  return scoreMotifs(...texts)[0]?.motif ?? "spark";
}

export function suggestLogos(input: {
  name: string;
  purpose?: string;
  domain?: string;
  kind?: string;
  count?: number;
}): AgentLogo[] {
  const n = input.count ?? 4;
  const ranked = scoreMotifs(input.name, input.purpose || "", input.domain || "", input.kind || "");
  const h = hashStr(`${input.name}|${input.purpose}|${input.domain}`);
  const motifs: LogoMotif[] = ranked.map((r) => r.motif);
  const extras: LogoMotif[] = ["spark", "bolt", "globe", "gear", "target", "chat", "pen", "chart"];
  for (const m of extras) {
    if (!motifs.includes(m)) motifs.push(m);
    if (motifs.length >= n) break;
  }
  return motifs.slice(0, n).map((motif, i) => {
    const palette = LOGO_PALETTES[(h + i * 3) % LOGO_PALETTES.length];
    const fit = ranked.find((r) => r.motif === motif)?.score ?? 0;
    return {
      motif,
      palette_id: palette.id,
      fit_score: fit,
      label: i === 0 && fit > 0 ? `Best fit · ${MOTIF_LABELS[motif]} · ${palette.id}` : `${MOTIF_LABELS[motif]} · ${palette.id}`,
    };
  });
}

export function logoForAgent(input: {
  name: string;
  purpose?: string;
  domain?: string;
  kind?: string;
  logo?: AgentLogo | null;
}): AgentLogo {
  if (input.logo?.motif && input.logo?.palette_id) return input.logo;
  return suggestLogos({ ...input, count: 1 })[0];
}
