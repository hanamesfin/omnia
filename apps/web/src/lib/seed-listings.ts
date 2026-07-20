/** Offline / pre-API seed shelf so Discover never looks like an empty void. */

export type SeedListing = {
  id: string;
  agent_id: string;
  name: string;
  specialty: string;
  domain: string;
  kind: string;
  developer: string;
  rating_count: number;
  wilson_score: number;
  rating_avg?: number;
  stars?: number;
  published_at?: string;
};

export const SEED_LISTINGS: SeedListing[] = [
  {
    id: "seed-0",
    agent_id: "agent-seed-guide",
    name: "Guide",
    specialty: "I teach you how to build agents on OMNIA — ask me anything about Create, Discover, or Yours.",
    domain: "onboarding",
    kind: "chat",
    developer: "OMNIA Labs",
    rating_count: 9100,
    rating_avg: 4.9,
    stars: 4.9,
    wilson_score: 0.96,
  },
  {
    id: "seed-1",
    agent_id: "seed-agent-bug",
    name: "Bug Triage",
    specialty: "Paste a stack trace — get a prioritized triage note.",
    domain: "coding",
    kind: "tool",
    developer: "OMNIA Labs",
    rating_count: 2140,
    rating_avg: 4.8,
    stars: 4.8,
    wilson_score: 0.91,
  },
  {
    id: "seed-2",
    agent_id: "seed-agent-cover",
    name: "Cover Letter Studio",
    specialty: "Role description in, tailored letter out.",
    domain: "content",
    kind: "transformer",
    developer: "Writeform",
    rating_count: 902,
    rating_avg: 4.6,
    stars: 4.6,
    wilson_score: 0.88,
  },
  {
    id: "seed-3",
    agent_id: "seed-agent-research",
    name: "Source Distiller",
    specialty: "Upload sources — get decisions and open questions.",
    domain: "research",
    kind: "analyzer",
    developer: "Northbrief",
    rating_count: 640,
    rating_avg: 4.5,
    stars: 4.5,
    wilson_score: 0.86,
  },
  {
    id: "seed-4",
    agent_id: "seed-agent-support",
    name: "Tone-Safe Support",
    specialty: "Product Q&A that never invents policy.",
    domain: "customer_support",
    kind: "chat",
    developer: "Helpline Co",
    rating_count: 1802,
    rating_avg: 4.7,
    stars: 4.7,
    wilson_score: 0.89,
  },
  {
    id: "seed-5",
    agent_id: "seed-agent-data",
    name: "CSV Insight",
    specialty: "Drop a spreadsheet — get patterns without overclaiming.",
    domain: "data_analysis",
    kind: "analyzer",
    developer: "Tabula",
    rating_count: 411,
    rating_avg: 4.4,
    stars: 4.4,
    wilson_score: 0.84,
  },
  {
    id: "seed-6",
    agent_id: "seed-agent-review",
    name: "PR Reviewer",
    specialty: "Diff in — risk, clarity, and missing tests out.",
    domain: "coding",
    kind: "tool",
    developer: "OMNIA Labs",
    rating_count: 1280,
    rating_avg: 4.7,
    stars: 4.7,
    wilson_score: 0.9,
  },
  {
    id: "seed-7",
    agent_id: "seed-agent-inbox",
    name: "Inbox Sorter",
    specialty: "Rules-based labeling for recurring message batches.",
    domain: "customer_support",
    kind: "automation",
    developer: "Queuekit",
    rating_count: 520,
    rating_avg: 4.3,
    stars: 4.3,
    wilson_score: 0.82,
  },
  {
    id: "seed-8",
    agent_id: "seed-agent-notes",
    name: "Meeting Notes Cleaner",
    specialty: "Raw transcript → action items and decisions.",
    domain: "content",
    kind: "transformer",
    developer: "Writeform",
    rating_count: 760,
    rating_avg: 4.5,
    stars: 4.5,
    wilson_score: 0.85,
  },
];
