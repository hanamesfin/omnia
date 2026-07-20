/**
 * Silicon Valley–level agent = system of building blocks, not “just an LLM.”
 * Maps OMNIA product surfaces → architecture status for Create / workspace.
 */

export type BlockStatus = "live" | "partial" | "planned";

export type ArchBlock = {
  id: string;
  title: string;
  purpose: string;
  status: BlockStatus;
  note: string;
};

export const PLATFORM_LAYERS = [
  {
    id: "builder",
    title: "Agent Builder",
    body: "Interview on goals, industry, workflows — Create FSM + adaptive chips.",
  },
  {
    id: "prompt",
    title: "Prompt Generator",
    body: "Writes and lints a five-section system constitution automatically.",
  },
  {
    id: "tools",
    title: "Tool Selector",
    body: "Architect rules + frontier stack recommend search, code, files, memory.",
  },
  {
    id: "knowledge",
    title: "Knowledge Manager",
    body: "Context library on Create — PDFs, code, CSV, screenshots into the prompt.",
  },
  {
    id: "sandbox",
    title: "Testing Sandbox",
    body: "Chat / Run with files + stars before publish; Advance proposes evolution.",
  },
  {
    id: "market",
    title: "Marketplace",
    body: "Discover agents — try, rank, kinds, and ratings.",
  },
  {
    id: "analytics",
    title: "Analytics",
    body: "Evaluation composite, satisfaction, run counts on each agent.",
  },
  {
    id: "loop",
    title: "Continuous Improvement",
    body: "Ratings → Advance focus (quality, autonomy, brevity, safety).",
  },
] as const;

type AgentLike = {
  model_id?: string;
  prompt_text?: string;
  kind?: string;
  capability_tier?: string;
  capabilities?: string[];
  share_context?: boolean;
  spec?: {
    tools?: string[];
    memory_strategy?: string;
    evaluation_criteria?: string[];
  };
  context_file_count?: number;
};

export function architectureForAgent(agent?: AgentLike | null): ArchBlock[] {
  const tools = agent?.spec?.tools || [];
  const memory = agent?.spec?.memory_strategy || "session";
  const frontier = agent?.capability_tier === "frontier";
  const hasPrompt = Boolean(agent?.prompt_text);
  const hasEval = (agent?.spec?.evaluation_criteria || []).length > 0;
  const knowledge = (agent?.context_file_count || 0) > 0 || frontier;

  return [
    {
      id: "brain",
      title: "1. Brain (LLM)",
      purpose: "Thinks and reasons",
      status: agent?.model_id ? "live" : "partial",
      note: agent?.model_id
        ? `Selected model: ${agent.model_id}`
        : "Model selection engine ranks GPT / Claude / Gemini-class options",
    },
    {
      id: "prompt",
      title: "2. System prompt",
      purpose: "Personality, rules, goals, style",
      status: hasPrompt ? "live" : "partial",
      note: hasPrompt
        ? "Linted five-section constitution"
        : "Generated on Create",
    },
    {
      id: "memory",
      title: "3. Memory",
      purpose: "Short-term chat + long-term preferences",
      status: memory.includes("long") ? "partial" : "partial",
      note: `Strategy: ${memory}${agent?.share_context ? " · share context across agents" : ""}`,
    },
    {
      id: "knowledge",
      title: "4. Knowledge",
      purpose: "Docs, APIs, corpora (RAG)",
      status: knowledge ? "partial" : "planned",
      note: knowledge
        ? "Create uploads / corpus notes folded into prompt (RAG store next)"
        : "Attach files in Create Context library",
    },
    {
      id: "tools",
      title: "5. Tools",
      purpose: "Act — search, code, browser, APIs",
      status: tools.length ? "partial" : "planned",
      note: tools.length
        ? `${tools.length} tools in spec: ${tools.slice(0, 4).join(", ")}${tools.length > 4 ? "…" : ""}`
        : "Architect assigns tools from templates + rules",
    },
    {
      id: "planning",
      title: "6. Planning",
      purpose: "Multi-step plans before acting",
      status: frontier ? "partial" : "planned",
      note: frontier
        ? "Frontier constitution requires brief plans on hard work"
        : "Planner / orchestrator is Phase 2",
    },
    {
      id: "decisions",
      title: "7. Decision making",
      purpose: "Ask vs search vs code vs memory",
      status: "partial",
      note: "Prompt + tool rules; full orchestrator next",
    },
    {
      id: "workflows",
      title: "8. Workflows",
      purpose: "Understand → research → deliver",
      status: "partial",
      note: "Create interview + Run/Chat paths; Celery workflows in full stack",
    },
    {
      id: "multi",
      title: "9. Multi-agent",
      purpose: "Specialists collaborating",
      status: "planned",
      note: "Single-agent products now; crew orchestration later",
    },
    {
      id: "apis",
      title: "10. APIs",
      purpose: "Connect services",
      status: "partial",
      note: "OMNIA FastAPI + LLM providers; external SaaS hooks planned",
    },
    {
      id: "ui",
      title: "11. User interface",
      purpose: "Where humans interact",
      status: "live",
      note: "Next.js — Discover / Create / Yours + Menu",
    },
    {
      id: "backend",
      title: "12. Backend",
      purpose: "Auth, jobs, files, AI requests",
      status: "live",
      note: "FastAPI engines · standalone demo or Compose stack",
    },
    {
      id: "database",
      title: "13. Database",
      purpose: "Users, chats, memory, files",
      status: "partial",
      note: "Postgres in Compose; in-memory demo locally",
    },
    {
      id: "auth",
      title: "14. Authentication",
      purpose: "Accounts & tenants",
      status: "partial",
      note: "JWT + org roles (demo login in local mode)",
    },
    {
      id: "files",
      title: "15. File processing",
      purpose: "PDF, code, sheets, images…",
      status: "partial",
      note: "Uploads + text extract; deep PDF/vision next",
    },
    {
      id: "voice",
      title: "16. Voice",
      purpose: "Speech ↔ text",
      status: "partial",
      note: "Mic dictation in 70+ languages; TTS optional next",
    },
    {
      id: "vision",
      title: "17. Image understanding",
      purpose: "Screenshots, diagrams, UI",
      status: "partial",
      note: "Image attachments accepted; vision model path next",
    },
    {
      id: "code",
      title: "18. Code execution",
      purpose: "Write → run → fix loop",
      status: tools.includes("code_execution") ? "partial" : "planned",
      note: tools.includes("code_execution")
        ? "Tool reserved in spec — sandbox runner not wired in demo"
        : "Enabled for coding / frontier templates",
    },
    {
      id: "eval",
      title: "19. Evaluation",
      purpose: "Was it correct / finished / useful?",
      status: hasEval || agent ? "live" : "partial",
      note: "Stars, Wilson, composite eval, Advance suggestions",
    },
    {
      id: "learning",
      title: "20. Learning",
      purpose: "Improve from feedback over time",
      status: "partial",
      note: "Advance + ratings; longer-horizon learning with real logs",
    },
  ];
}

export function statusLabel(s: BlockStatus): string {
  if (s === "live") return "Live";
  if (s === "partial") return "Partial";
  return "Planned";
}
