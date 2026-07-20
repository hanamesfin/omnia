/** Curated App Store–style shelf for the home / Today experience. */

export type StoreApp = {
  id: string;
  agent_id: string;
  name: string;
  subtitle: string;
  description: string;
  developer: string;
  domain: string;
  kind: string;
  price: string;
  rating_avg: number;
  rating_count: number;
  badge?: string;
  featured?: boolean;
};

export const OMNI_FEATURE_APPS: StoreApp[] = [
  {
    id: "omni-companion",
    agent_id: "seed-omni-companion",
    name: "Omni Companion",
    subtitle: "Frontier chat · memory",
    description: "Multi-turn conversational agent with long-context memory and calm reasoning.",
    developer: "OMNIA Labs",
    domain: "general",
    kind: "chat",
    price: "Free",
    rating_avg: 4.9,
    rating_count: 5200,
    badge: "Editor's Choice",
    featured: true,
  },
  {
    id: "knowledge-vault",
    agent_id: "seed-knowledge-vault",
    name: "Knowledge Vault Importer",
    subtitle: "Files · corpus",
    description: "Ingest PDFs, CSVs, and docs — ground every reply in your vault.",
    developer: "OMNIA Labs",
    domain: "research",
    kind: "tool",
    price: "Free",
    rating_avg: 4.8,
    rating_count: 3100,
  },
  {
    id: "code-wizard",
    agent_id: "seed-code-wizard",
    name: "Code Wizard",
    subtitle: "Review · refactor",
    description: "Pair-programming assistant with diff-aware review and test suggestions.",
    developer: "OMNIA Labs",
    domain: "coding",
    kind: "tool",
    price: "Free",
    rating_avg: 4.9,
    rating_count: 4800,
  },
  {
    id: "replog-metrics",
    agent_id: "seed-replog",
    name: "RepLog Agent Metrics",
    subtitle: "Analytics · AQS",
    description: "Track agent quality, Wilson rank, and improvement loops in one dashboard.",
    developer: "OMNIA Labs",
    domain: "data_analysis",
    kind: "analyzer",
    price: "Free",
    rating_avg: 4.7,
    rating_count: 1900,
  },
  {
    id: "reasoning-dash",
    agent_id: "seed-reasoning",
    name: "Reasoning Dashboard",
    subtitle: "Plans · steps",
    description: "Visualize multi-step reasoning chains before the agent acts.",
    developer: "Northbrief",
    domain: "research",
    kind: "analyzer",
    price: "Free",
    rating_avg: 4.8,
    rating_count: 2400,
  },
  {
    id: "file-lens",
    agent_id: "seed-file-lens",
    name: "File Lens",
    subtitle: "Vision · tables",
    description: "Analyze uploads — spreadsheets, screenshots, and pasted data in one pass.",
    developer: "Tabula",
    domain: "data_analysis",
    kind: "analyzer",
    price: "Free",
    rating_avg: 4.6,
    rating_count: 1200,
  },
  {
    id: "workflow-weaver",
    agent_id: "seed-workflow",
    name: "Workflow Weaver",
    subtitle: "Automation",
    description: "Repeatable checklists and digests for ops teams — escalate only edge cases.",
    developer: "Queuekit",
    domain: "customer_support",
    kind: "automation",
    price: "Free",
    rating_avg: 4.5,
    rating_count: 890,
  },
  {
    id: "tone-coach",
    agent_id: "seed-tone",
    name: "Tone Coach",
    subtitle: "Writing · voice",
    description: "Rewrite drafts for clarity, empathy, and brand-safe support replies.",
    developer: "Writeform",
    domain: "content",
    kind: "transformer",
    price: "Free",
    rating_count: 2100,
    rating_avg: 4.7,
  },
];

export const PLAY_PACK_CARD = {
  title: "Omni Agent Play Pack",
  subtitle: "Accessories & starter kits",
  description:
    "Bundle companion tools, vault importers, and metrics — everything to launch your first Omni stack.",
  cta: "View bundle",
  href: "/explore",
};

export const CYBER_FEATURE_CARD = {
  title: "Neon District Stories",
  subtitle: "Featured narrative pack",
  description: "Immersive cyber-noir scenarios for roleplay agents — built for multi-turn fiction.",
  cta: "Discover",
  href: "/explore",
};
