"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Sparkles,
  AlertTriangle,
  X,
} from "lucide-react";
import { fetchApi, GENERATE_TIMEOUT_MS } from "@/lib/api";
import { CreateContextUploader } from "@/components/CreateContextUploader";
import { VoiceInput } from "@/components/VoiceInput";
import { ComposerPlusMenu } from "@/components/ComposerPlusMenu";
import { AgentIcon } from "@/components/AgentIcon";
import { AgentReportCard } from "@/components/AgentReportCard";
import { EnterpriseArchitectureGraph } from "@/components/EnterpriseArchitectureGraph";
import { TierUpgradeMotion } from "@/components/TierUpgradeMotion";
import { ComplexityMark } from "@/components/ComplexityMark";
import {
  useCreateStudio,
  type CreateTier,
} from "@/components/CreateStudioShell";
import type { AgentLogo } from "@/lib/agent-logos";
import { modelDisplayName } from "@/lib/models";
import { hasProductShell } from "@/components/ProductShell";

type AnswerType = "chip" | "freetext";

type InterviewRequirements = {
  purpose?: string;
  target_user?: string;
  experience?: string;
  input_fields?: Array<{ id?: string; label?: string; type?: string; required?: boolean }>;
  output?: { type?: string; label?: string };
  capabilities?: string[];
  constraints?: string[];
  tools?: string[];
  mcp_servers?: string[];
};

type FactoryPhase = {
  phase_id: string;
  label: string;
  status: string;
  summary?: string;
  failures?: string[];
};

type FactoryPreview = {
  product_type?: string;
  nav?: Array<{ id?: string; label?: string }>;
  design_personality?: string;
};

const DEFAULT_PHASE_CATALOG: Array<{ id: string; label: string }> = [
  { id: "classify", label: "Product classification" },
  { id: "strategy", label: "Strategy & UVP" },
  { id: "prd", label: "Requirements (PRD)" },
  { id: "ia", label: "Information architecture" },
  { id: "design_system", label: "Brand & design system" },
  { id: "page_ux", label: "Page UX specs" },
  { id: "architecture", label: "Technical architecture" },
  { id: "ai_core", label: "AI core (prompt & tools)" },
];

type ChatTurn = { role: "assistant" | "user"; content: string };

export default function CreatePage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { setPhase, setProgress: setStudioProgress, setTier: setStudioTier } =
    useCreateStudio();

  const [createTier, setCreateTier] = useState<CreateTier>("normal");
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [canFinish, setCanFinish] = useState(false);
  const [userTurns, setUserTurns] = useState(0);
  const [minTurns, setMinTurns] = useState(4);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [generationReport, setGenerationReport] = useState<any>(null);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<InterviewRequirements>({});
  const [recommendDomain, setRecommendDomain] = useState("general");
  const [generating, setGenerating] = useState(false);
  const [factoryPhases, setFactoryPhases] = useState<FactoryPhase[]>([]);
  const [factoryPreview, setFactoryPreview] = useState<FactoryPreview>({});
  const [phaseCatalog, setPhaseCatalog] = useState(DEFAULT_PHASE_CATALOG);
  const [contextCount, setContextCount] = useState(0);
  const [selectedLogo, setSelectedLogo] = useState<AgentLogo | null>(null);
  const [savingLogo, setSavingLogo] = useState(false);
  const [preferredModel, setPreferredModel] = useState<string | null>("openai/gpt-4o-mini");
  const [servedModel, setServedModel] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [knowledgeReady, setKnowledgeReady] = useState(true);

  useEffect(() => {
    if (generationReport) {
      setPhase("ready");
    } else if (!started) {
      setPhase("mode");
    } else if (isDone || generating) {
      setPhase("generate");
    } else {
      setPhase("interview");
    }
  }, [generationReport, started, isDone, generating, setPhase]);

  useEffect(() => {
    setStudioProgress(progress);
  }, [progress, setStudioProgress]);

  useEffect(() => {
    setStudioTier(started || generationReport ? createTier : null);
  }, [started, generationReport, createTier, setStudioTier]);

  const bootInterview = useCallback(async (tier: CreateTier) => {
    try {
      setLoading(true);
      const res = await fetchApi("/interview/start", {
        method: "POST",
        body: JSON.stringify({ create_tier: tier }),
      });
      setSessionId(res.session_id);
      setCreateTier((res.create_tier as CreateTier) || tier);
      setQuestion(res.question);
      setChips(res.chips);
      setProgress(res.progress);
      setCanFinish(!!res.can_finish);
      setUserTurns(res.user_turns ?? 0);
      setMinTurns(res.min_turns ?? 4);
      setIsDone(false);
      setRequirements({});
      setInsight(null);
      setKnowledgeReady(tier !== "enterprise");
      if (res.preferred_model) setPreferredModel(res.preferred_model);
      if (res.served_model) setServedModel(res.served_model);
      setChat(
        Array.isArray(res.chat) && res.chat.length
          ? res.chat
          : res.question
            ? [{ role: "assistant", content: res.question }]
            : []
      );
      setBootError(null);
      setStarted(true);
    } catch {
      setBootError(
        "Couldn't reach the API. Run: cd apps/api && python3 -m uvicorn standalone:app --port 8000"
      );
      setQuestion("");
      setChips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const stepIndex = Math.min(7, Math.floor((progress / 100) * 8));

  const handleAnswer = async (answer: string, answerType: AnswerType) => {
    if (!answer.trim() || !sessionId) return;
    try {
      setLoading(true);
      setChat((prev) => [...prev, { role: "user", content: answer.trim() }]);
      const res = await fetchApi("/interview/answer", {
        method: "POST",
        timeoutMs: 45000,
        body: JSON.stringify({
          session_id: sessionId,
          answer,
          answer_type: answerType,
          ...(preferredModel ? { preferred_model: preferredModel } : {}),
        }),
      });
      setQuestion(res.question);
      setChips(res.chips);
      setProgress(res.progress);
      setIsDone(res.is_done);
      setCanFinish(!!res.can_finish);
      setUserTurns(res.user_turns ?? userTurns);
      setMinTurns(res.min_turns ?? minTurns);
      setInputValue("");
      if (res.preferred_model) setPreferredModel(res.preferred_model);
      if (res.served_model) setServedModel(res.served_model);
      if (typeof res.knowledge_ready === "boolean") setKnowledgeReady(res.knowledge_ready);
      if (Array.isArray(res.chat)) setChat(res.chat);
      else if (res.question) {
        setChat((prev) => [...prev, { role: "assistant", content: res.question }]);
      }
      if (res.requirements) setRequirements(res.requirements);
      if (res.insight) setInsight(res.insight);
      if (res.blueprint?.domain) setRecommendDomain(res.blueprint.domain);
      if (res.is_done && res.blueprint?.archetype) {
        setAgentName(res.blueprint.archetype);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't send that answer";
      if (/not found|session/i.test(msg)) {
        try {
          await bootInterview(createTier);
          setToast("Session reset — send your answer again");
        } catch {
          setToast(msg);
        }
      } else {
        setToast(msg);
      }
      setTimeout(() => setToast(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!agentName.trim() || !sessionId) return;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    try {
      setLoading(true);
      setGenerating(true);
      setFactoryPhases([]);
      setFactoryPreview({});

      const pollProgress = async () => {
        try {
          const prog = await fetchApi(
            `/agents/generate/progress?session_id=${encodeURIComponent(sessionId)}`,
            { timeoutMs: 8000 }
          );
          if (Array.isArray(prog.phase_catalog) && prog.phase_catalog.length) {
            setPhaseCatalog(prog.phase_catalog);
          }
          if (Array.isArray(prog.phases)) {
            setFactoryPhases(prog.phases as FactoryPhase[]);
          }
          setFactoryPreview({
            product_type: prog.product_type,
            nav: prog.nav,
            design_personality: prog.design_personality,
          });
        } catch {
          /* poll is best-effort while generate runs */
        }
      };

      void pollProgress();
      pollTimer = setInterval(() => void pollProgress(), 1200);

      const res = await fetchApi("/agents/generate", {
        method: "POST",
        timeoutMs: GENERATE_TIMEOUT_MS,
        body: JSON.stringify({
          session_id: sessionId,
          name: agentName,
          ...(preferredModel ? { preferred_model: preferredModel } : {}),
        }),
      });
      await pollProgress();
      setGenerationReport(res);
      if (res.product_blueprint) {
        const bp = res.product_blueprint;
        setFactoryPreview({
          product_type: bp.product_type,
          nav: bp.information_architecture?.nav,
          design_personality: bp.design_system?.personality,
        });
      }
      if (Array.isArray(res.factory_phases)) {
        setFactoryPhases(
          (res.factory_phases as Array<{ id?: string; phase_id?: string; status?: string; summary?: string }>).map(
            (p) => ({
              phase_id: String(p.phase_id || p.id || ""),
              label:
                phaseCatalog.find((c) => c.id === (p.phase_id || p.id))?.label ||
                String(p.phase_id || p.id || ""),
              status: String(p.status || "passed"),
              summary: p.summary,
            })
          )
        );
      }
      const options = (res.logo_options || []) as AgentLogo[];
      setSelectedLogo(res.logo || options[0] || null);
      setToast("Product generated — pick a logo fit");
    } catch (err) {
      try {
        const prog = await fetchApi(
          `/agents/generate/progress?session_id=${encodeURIComponent(sessionId)}`,
          { timeoutMs: 8000 }
        );
        if (Array.isArray(prog.phases)) {
          setFactoryPhases(prog.phases as FactoryPhase[]);
        }
        if (prog.error) {
          setToast(String(prog.error));
        } else {
          setToast(
            err instanceof Error
              ? err.message
              : "Couldn't generate the agent — try again"
          );
        }
      } catch {
        setToast(
          err instanceof Error
            ? err.message
            : "Couldn't generate the agent — try again"
        );
      }
      setGenerating(false);
    } finally {
      if (pollTimer) clearInterval(pollTimer);
      setLoading(false);
      setGenerating(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const persistLogo = async () => {
    if (!generationReport || !selectedLogo) return;
    try {
      setSavingLogo(true);
      await fetchApi(`/agents/${generationReport.agent_id}/logo`, {
        method: "PUT",
        body: JSON.stringify(selectedLogo),
      });
    } catch {
      /* non-blocking */
    } finally {
      setSavingLogo(false);
    }
  };

  const savePrivate = async () => {
    if (!generationReport) return;
    await persistLogo();
    const id = generationReport.agent_id;
    const hasApp =
      generationReport.has_product_app ||
      hasProductShell(generationReport.product_blueprint);
    setToast(hasApp ? "Opening product…" : "Saved to Yours (private)");
    if (hasApp) {
      window.open(`/app/${id}`, "_blank", "noopener,noreferrer");
    }
    setTimeout(() => router.push(`/yours/${id}`), 400);
  };

  const openProductApp = () => {
    if (!generationReport?.agent_id) return;
    window.open(`/app/${generationReport.agent_id}`, "_blank", "noopener,noreferrer");
  };

  const publishToExplore = async () => {
    if (!generationReport) return;
    try {
      setPublishing(true);
      await persistLogo();
      await fetchApi("/marketplace/", {
        method: "POST",
        body: JSON.stringify({ agent_id: generationReport.agent_id }),
      });
      setToast("Published to Discover");
      setTimeout(() => router.push(`/yours/${generationReport.agent_id}`), 500);
    } catch (err: unknown) {
      setToast(err instanceof Error ? err.message : "Couldn't publish");
    } finally {
      setPublishing(false);
    }
  };

  if (generationReport) {
    const topMatch = generationReport.matched_templates?.[0];
    const logoOptions = (generationReport.logo_options || []) as AgentLogo[];
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-alive">Ready</p>
          <h1 className="mt-2 font-display text-display-lg text-foreground">
            {generationReport.capability_tier === "frontier"
              ? "Your original Omni agent is live"
              : "Your agent is live"}
          </h1>
          <p className="mt-2 max-w-xl text-muted">
            We ranked illustrated App Store–style icons by how well they hit this agent — pick your favorite.
          </p>
        </motion.div>

        <section className="glass-float mt-8 p-5 sm:p-6" aria-labelledby="logo-pick">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <AgentIcon
              name={generationReport.name || agentName}
              kind={generationReport.kind}
              domain={generationReport.domain}
              purpose={generationReport.engineering_spec?.purpose}
              logo={selectedLogo}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <h2 id="logo-pick" className="font-display text-lg tracking-tight">
                App icon
              </h2>
              <p className="mt-1 text-sm text-muted">
                Suggested for this agent
                {selectedLogo?.label ? ` · ${selectedLogo.label}` : ""}.
                {savingLogo ? " Saving…" : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {logoOptions.map((opt) => (
                  <button
                    key={`${opt.motif}-${opt.palette_id}`}
                    type="button"
                    onClick={() => setSelectedLogo(opt)}
                    className="interactive rounded-[22%] focus:outline-none"
                    aria-pressed={
                      selectedLogo?.motif === opt.motif &&
                      selectedLogo?.palette_id === opt.palette_id
                    }
                    title={opt.label}
                  >
                    <AgentIcon
                      name={generationReport.name || agentName}
                      logo={opt}
                      size="lg"
                      selected={
                        selectedLogo?.motif === opt.motif &&
                        selectedLogo?.palette_id === opt.palette_id
                      }
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <AgentReportCard
            name={generationReport.name || agentName}
            createTier={generationReport.create_tier || createTier}
            capabilityTier={generationReport.capability_tier}
            aqs={generationReport.aqs}
            modelScore={generationReport.model_score}
            lintPassed={!!generationReport.lint_passed}
            synthetic={generationReport.synthetic_tests}
            toolCount={Array.isArray(generationReport.tools) ? generationReport.tools.length : 0}
          />
        </div>

        {generationReport.capabilities?.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2">
            {generationReport.capabilities.map((c: string) => (
              <li
                key={c}
                className="rounded-full bg-alive/10 px-3 py-1.5 text-xs font-medium text-alive ring-1 ring-alive/25"
              >
                {c}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          <div className="glass-panel rounded-[1.25rem] p-5 sm:p-6 lg:col-span-2">
            <h2 className="font-display text-base font-semibold">Created from chat</h2>
            {topMatch ? (
              <p className="mt-3 text-sm">
                <span className="text-alive font-medium">{topMatch.name}</span>
                <span className="ml-2 font-mono text-muted">{Math.round(topMatch.score * 100)}%</span>
              </p>
            ) : null}
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Via</dt>
                <dd className="font-mono text-foreground">
                  {generationReport.created_via || "chat"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Model</dt>
                <dd className="font-mono text-foreground">{generationReport.selected_model}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Score</dt>
                <dd className="font-mono">{generationReport.model_score}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Linter</dt>
                <dd className={generationReport.lint_passed ? "text-alive" : "text-danger"}>
                  {generationReport.lint_passed ? "Passed" : "Needs review"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="glass-panel rounded-[1.25rem] p-5 sm:p-6 lg:col-span-3">
            <h2 className="font-display flex items-center gap-2 text-base font-semibold">
              <CheckCircle2 className="h-4 w-4 text-alive" aria-hidden />
              System prompt
            </h2>
            <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-background/80 p-4 font-mono text-xs leading-relaxed text-foreground/85 sm:text-sm">
              {generationReport.prompt_text}
            </pre>
            {!generationReport.lint_passed && (
              <p className="mt-3 flex gap-2 text-sm text-danger">
                <AlertTriangle size={16} className="shrink-0" /> Linter flagged issues — review before heavy use.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {(generationReport.has_product_app ||
            hasProductShell(generationReport.product_blueprint)) && (
            <button
              type="button"
              onClick={openProductApp}
              className="inline-flex min-h-tap items-center justify-center rounded-full bg-alive px-7 text-sm font-semibold text-on-alive"
            >
              Open product
            </button>
          )}
          <button
            type="button"
            onClick={savePrivate}
            className="min-h-tap rounded-full border border-border bg-surface px-7 text-sm font-medium transition hover:border-alive/40"
          >
            Save to Yours
          </button>
          <button
            type="button"
            onClick={publishToExplore}
            disabled={publishing}
            className="inline-flex min-h-tap items-center justify-center gap-2 rounded-full border border-border bg-surface px-7 text-sm font-medium disabled:opacity-50"
          >
            {publishing ? <Loader2 className="animate-spin" size={18} /> : null}
            Publish to Discover
          </button>
        </div>
        {toast && <Toast message={toast} />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-display-lg text-foreground">
          Chat an agent into existence
        </h1>
        <p className="mt-3 text-muted">
          Chat with the architect until it has everything it needs, then finish with
          “I&apos;m ready — generate”. Prefer browsing?{" "}
          <Link href="/explore" className="text-alive hover:underline">
            Discover agents
          </Link>
          .
        </p>
      </div>

      {!started ? (
        <div className="glass-panel space-y-6 rounded-[1.35rem] p-5 sm:p-8">
          <div>
            <h2 className="font-display text-lg font-semibold">Choose Create mode</h2>
            <p className="mt-1 text-sm text-muted">
              Normal keeps today&apos;s flow. Enterprise adds document knowledge RAG before
              generate.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  id: "normal" as const,
                  title: "Normal",
                  body: "Interview + optional context pasted into the prompt at generate time.",
                },
                {
                  id: "enterprise" as const,
                  title: "Enterprise",
                  body: "Chunk, embed, and query knowledge files live via knowledge_search.",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCreateTier(opt.id)}
                aria-pressed={createTier === opt.id}
                className={`rounded-2xl border p-4 text-left transition ${
                  createTier === opt.id
                    ? "border-alive/50 bg-alive/8 ring-1 ring-alive/30"
                    : "border-border bg-background/40 hover:border-alive/30"
                }`}
              >
                <p className="flex items-center gap-2 font-display text-base font-semibold">
                  <ComplexityMark tier={opt.id} className="text-alive" />
                  {opt.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{opt.body}</p>
              </button>
            ))}
          </div>
          <TierUpgradeMotion tier={createTier} className="mt-2" />
          {bootError && (
            <pre className="overflow-x-auto rounded-xl bg-background p-3 font-mono text-xs text-alive">
              {bootError}
            </pre>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={() => void bootInterview(createTier)}
            className="inline-flex min-h-tap items-center justify-center gap-2 rounded-full bg-alive px-6 text-sm font-semibold text-on-alive disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            Begin {createTier === "enterprise" ? "Enterprise" : "Normal"} interview
          </button>
        </div>
      ) : (
        <>
          <div
            className="mb-2 flex gap-1.5 sm:gap-2"
            aria-label={`Interview progress ${progress}%`}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                  i <= stepIndex ? "bg-alive" : "bg-border"
                }`}
              />
            ))}
          </div>
          <p className="mb-2 text-xs text-muted">
            Mode:{" "}
            <span className="font-medium text-foreground capitalize">{createTier}</span>
            {createTier === "enterprise" && !knowledgeReady
              ? " · waiting for knowledge files to finish processing"
              : ""}
          </p>
          <p className="mb-8 text-xs text-muted">
            {isDone
              ? "Interview confirmed — name your agent."
              : canFinish
                ? `Enough captured to build it (${userTurns} answers). Keep refining or choose “I'm ready — generate”.`
                : `Still gathering details (${userTurns} answers) — the interview keeps asking until it has enough.`}
          </p>

          <div className="space-y-4">
            <CreateContextUploader
              sessionId={sessionId}
              enterprise={createTier === "enterprise"}
              disabled={!!bootError || generating}
              onChange={(files) => setContextCount(files.length)}
              onKnowledgeReadyChange={setKnowledgeReady}
              onError={(msg) => {
                setToast(msg);
                setTimeout(() => setToast(null), 3200);
              }}
            />

            {createTier === "enterprise" && (
              <EnterpriseArchitectureGraph className="mt-2" />
            )}
            {contextCount > 0 && createTier === "normal" && (
              <p className="text-xs text-muted">
                {contextCount} context file{contextCount === 1 ? "" : "s"} attached — folded into
                generation.
              </p>
            )}

            <div className="glass-panel rounded-[1.35rem] p-5 sm:p-8">
              {bootError && !question ? (
                <div>
                  <h2 className="font-display text-xl font-medium">API not connected</h2>
                  <pre className="mt-3 overflow-x-auto rounded-xl bg-background p-3 font-mono text-xs text-alive">
                    {bootError}
                  </pre>
                  <button
                    type="button"
                    onClick={() => void bootInterview(createTier)}
                    className="mt-4 min-h-tap rounded-full bg-alive px-5 text-sm font-semibold text-on-alive"
                  >
                    Retry
                  </button>
                </div>
              ) : !isDone ? (
                <div className="flex flex-col gap-4">
                  <div className="max-h-[min(28rem,55vh)] space-y-3 overflow-y-auto pr-1">
                    {chat.map((turn, i) => (
                      <div
                        key={`${turn.role}-${i}-${turn.content.slice(0, 24)}`}
                        className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            turn.role === "user"
                              ? "bg-primary text-white"
                              : "bg-background/80 text-foreground ring-1 ring-border"
                          }`}
                        >
                          {turn.role === "assistant" && (
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-alive">
                              Architect
                              {servedModel
                                ? ` · ${modelDisplayName(servedModel)}`
                                : preferredModel
                                  ? ` · ${modelDisplayName(preferredModel)}`
                                  : ""}
                            </p>
                          )}
                          {turn.content}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-background/80 px-4 py-3 text-sm text-muted ring-1 ring-border">
                          <Loader2 size={14} className="animate-spin" /> Thinking…
                        </div>
                      </div>
                    )}
                  </div>

                  {insight && (
                    <p className="rounded-xl bg-alive/8 px-3 py-2 text-sm text-alive/95 ring-1 ring-alive/20">
                      {insight}
                    </p>
                  )}

                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {chips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleAnswer(chip, "chip")}
                          disabled={loading}
                          className="min-h-tap rounded-full border border-border bg-surface/80 px-4 text-sm font-medium transition hover:border-alive/50 hover:bg-alive/10 hover:text-alive disabled:opacity-50"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 border-t border-border/70 pt-4">
                    {preferredModel && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-alive/10 px-2.5 py-1 text-[11px] font-medium text-alive ring-1 ring-alive/20">
                        Preferred: {modelDisplayName(preferredModel)}
                        {servedModel && servedModel !== preferredModel
                          ? ` · answered via ${modelDisplayName(servedModel)}`
                          : servedModel
                            ? ` · live`
                            : ""}
                        <button
                          type="button"
                          aria-label="Clear preferred model"
                          onClick={() => setPreferredModel(null)}
                          className="rounded-full p-0.5 hover:bg-alive/15"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAnswer(inputValue, "freetext");
                      }}
                      className="flex items-end gap-2"
                    >
                      <ComposerPlusMenu
                        disabled={loading}
                        showAttach={false}
                        selectedModelId={preferredModel}
                        recommendPrompt={
                          [requirements.purpose, requirements.experience, inputValue]
                            .filter(Boolean)
                            .join(" ")
                        }
                        recommendDomain={recommendDomain}
                        onSelectModel={setPreferredModel}
                        onClearModel={() => setPreferredModel(null)}
                      />
                      <VoiceInput
                        value={inputValue}
                        onChange={setInputValue}
                        disabled={loading}
                        onError={(msg) => {
                          setToast(msg);
                          setTimeout(() => setToast(null), 3200);
                        }}
                      />
                      <label htmlFor="create-freetext" className="sr-only">
                        Message the architect
                      </label>
                      <input
                        id="create-freetext"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Chat what this agent should do…"
                        disabled={loading}
                        className="min-h-tap flex-1 rounded-2xl border border-border bg-background/60 px-4 text-sm transition focus:border-alive/50 focus:outline-none disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={loading || !inputValue.trim()}
                        aria-label="Send"
                        className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-2xl bg-primary text-white disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-medium tracking-tight">
                    Name your original agent
                  </h2>
                  <p className="text-sm text-muted">
                    You chose to finish the interview. We&apos;ll invent a full product
                    (IA, design system, pages) and bind an AI core — not a brand clone.
                    {preferredModel?.includes("free") || preferredModel === "openrouter/free" ? (
                      <span className="mt-2 block text-xs text-alive/90">
                        Free models can take up to a minute — keep this tab open while generating.
                      </span>
                    ) : null}
                  </p>

                  {generating ? (
                    <div className="space-y-4">
                      <ul className="space-y-2.5 rounded-2xl bg-background/50 p-4 ring-1 ring-border">
                        {phaseCatalog.map((stage) => {
                          const live = factoryPhases.find((p) => p.phase_id === stage.id);
                          const status = live?.status || "pending";
                          const active = status === "running" || status === "started";
                          const done = status === "passed" || status === "ok";
                          const failed = status === "failed";
                          return (
                            <li
                              key={stage.id}
                              className={`flex items-start gap-3 text-sm ${
                                active
                                  ? "text-alive"
                                  : failed
                                    ? "text-red-500"
                                    : done
                                      ? "text-foreground"
                                      : "text-muted"
                              }`}
                            >
                              {active ? (
                                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                              ) : done ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                              ) : failed ? (
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              ) : (
                                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full ring-1 ring-border" />
                              )}
                              <span>
                                <span className="font-medium">{stage.label}</span>
                                {live?.summary ? (
                                  <span className="mt-0.5 block text-xs text-muted">{live.summary}</span>
                                ) : null}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      {(factoryPreview.product_type ||
                        (factoryPreview.nav && factoryPreview.nav.length > 0) ||
                        factoryPreview.design_personality) && (
                        <div className="space-y-3 rounded-2xl bg-background/40 p-4 ring-1 ring-border">
                          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                            Artifact preview
                          </p>
                          {factoryPreview.product_type ? (
                            <p className="text-sm">
                              Type:{" "}
                              <span className="font-medium text-alive">
                                {factoryPreview.product_type}
                              </span>
                            </p>
                          ) : null}
                          {factoryPreview.design_personality ? (
                            <p className="text-sm">
                              Brand:{" "}
                              <span className="font-medium">
                                {factoryPreview.design_personality}
                              </span>
                            </p>
                          ) : null}
                          {factoryPreview.nav && factoryPreview.nav.length > 0 ? (
                            <div>
                              <p className="mb-1.5 text-xs text-muted">Navigation</p>
                              <div className="flex flex-wrap gap-1.5">
                                {factoryPreview.nav.map((n) => (
                                  <span
                                    key={n.id || n.label}
                                    className="rounded-lg bg-alive/10 px-2 py-1 text-[11px] font-medium text-alive"
                                  >
                                    {n.label || n.id}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {preferredModel && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-alive/10 px-2.5 py-1 text-[11px] font-medium text-alive ring-1 ring-alive/20">
                          Model: {modelDisplayName(preferredModel)}
                          <button
                            type="button"
                            aria-label="Clear preferred model"
                            onClick={() => setPreferredModel(null)}
                            className="rounded-full p-0.5 hover:bg-alive/15"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      )}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <ComposerPlusMenu
                          disabled={loading}
                          showAttach={false}
                          selectedModelId={preferredModel}
                          recommendPrompt={
                            [requirements.purpose, requirements.experience, agentName]
                              .filter(Boolean)
                              .join(" ")
                          }
                          recommendDomain={recommendDomain}
                          onSelectModel={setPreferredModel}
                          onClearModel={() => setPreferredModel(null)}
                        />
                        <VoiceInput
                          value={agentName}
                          onChange={setAgentName}
                          disabled={loading}
                          onError={(msg) => {
                            setToast(msg);
                            setTimeout(() => setToast(null), 3200);
                          }}
                        />
                        <label htmlFor="agent-name" className="sr-only">
                          Agent name
                        </label>
                        <input
                          id="agent-name"
                          value={agentName}
                          onChange={(e) => setAgentName(e.target.value)}
                          placeholder="Speak or type a name…"
                          className="min-h-tap flex-1 rounded-2xl border border-border bg-background/60 px-4 text-lg focus:border-alive/50 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={loading || !agentName.trim()}
                          className="inline-flex min-h-tap items-center justify-center gap-2 rounded-full bg-alive px-6 font-semibold text-on-alive disabled:opacity-50"
                        >
                          <Sparkles size={18} aria-hidden /> Generate agent
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-surface-elevated px-5 py-2.5 text-sm shadow-2xl"
    >
      {message}
    </div>
  );
}
