"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Bot,
  Loader2,
  Play,
  Settings2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { fetchApi, API_BASE, ensureAuth, GENERATE_TIMEOUT_MS } from "@/lib/api";
import { kindMeta, parseAgentKind, type AgentKind } from "@/lib/agent-kinds";
import { StarRating } from "@/components/StarRating";
import { AgentIcon } from "@/components/AgentIcon";
import { Composer, type LocalAttachment } from "@/components/Composer";
import { ChatMessage } from "@/components/ChatMessage";
import { ModelRouterPanel, type RoutingPayload } from "@/components/ModelRouterPanel";
import { OrchestrationProgress, type OrchestrationEvent } from "@/components/OrchestrationProgress";
import { AgentAvatarControls } from "@/components/AgentAvatarControls";
import { VoiceInput } from "@/components/VoiceInput";
import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import {
  DynamicAgentRunner,
  type AgentInterfaceSchema,
} from "@/components/DynamicAgentRunner";
import { ShellMenuAnchor } from "@/components/ShellMenuDock";
import { hasProductShell } from "@/components/ProductShell";
import {
  ToolExecutionList,
  type ToolCallRecord,
} from "@/components/ToolExecutionBlock";
import { DriftNudgeBanner } from "@/components/DriftNudgeBanner";
import { VersionTimeline } from "@/components/VersionTimeline";
import { FailurePostMortem } from "@/components/FailurePostMortem";
import { RemixAttribution } from "@/components/RemixAttribution";
import { ComplexityMark } from "@/components/ComplexityMark";
import {
  FALLBACK_MODELS,
  groupModelsByProvider,
  loadModels,
  modelDisplayName,
  type AiModel,
} from "@/lib/models";

type Tab = "primary" | "personalize" | "advance" | "update";

type ThreadMessage = {
  role: "user" | "assistant";
  content: string;
  files?: { name: string; media: string }[];
  tools?: ToolCallRecord[];
};

export default function AgentWorkspacePage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [agent, setAgent] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [evalData, setEvalData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("primary");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [runTools, setRunTools] = useState<ToolCallRecord[]>([]);
  const [lastRouting, setLastRouting] = useState<RoutingPayload | null>(null);
  const [orchEvents, setOrchEvents] = useState<OrchestrationEvent[]>([]);
  const [sessionModelOverride, setSessionModelOverride] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [customInstructions, setCustomInstructions] = useState("");
  const [toneOverride, setToneOverride] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [shareContext, setShareContext] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [specialtyDraft, setSpecialtyDraft] = useState("");
  const [focus, setFocus] = useState("quality");
  const [advanceNote, setAdvanceNote] = useState<string | null>(null);
  const [updateInstructions, setUpdateInstructions] = useState("");
  const [updateNote, setUpdateNote] = useState<string | null>(null);
  const [modelCatalog, setModelCatalog] = useState<AiModel[]>([]);
  const [lastFailure, setLastFailure] = useState<string | null>(null);

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (
      requested === "primary" ||
      requested === "personalize" ||
      requested === "advance" ||
      requested === "update"
    ) {
      setTab(requested);
    }
  }, [searchParams]);

  const kind: AgentKind = parseAgentKind(agent?.kind);
  const meta = kindMeta(kind);
  const interfaceSchema = (agent?.interface_schema || null) as AgentInterfaceSchema | null;
  const interfaceMode = String(interfaceSchema?.mode || "").toLowerCase();
  const hasDesignedInterface = Boolean(
    interfaceSchema &&
      (interfaceMode || (interfaceSchema.input_fields?.length || 0) > 0)
  );
  const isChat = hasDesignedInterface ? interfaceMode === "chat" : kind === "chat";
  const productLabel = hasDesignedInterface
    ? String(agent?.kind || interfaceSchema?.mode || "Custom agent")
    : meta.label;
  const primaryLabel = isChat
    ? "Open"
    : interfaceSchema?.submit_label || meta.openLabel;

  const reload = async () => {
    const [agentRes, evalRes] = await Promise.all([
      fetchApi(`/agents/${id}`),
      fetchApi(`/agents/${id}/evaluation`),
    ]);
    setAgent(agentRes);
    setEvalData(evalRes);
    setCustomInstructions(agentRes.personalization?.custom_instructions || "");
    setToneOverride(agentRes.personalization?.tone_override || "");
    setSelectedModel(agentRes.model_id || "gpt-4o");
    setShareContext(!!agentRes.share_context);
    setNameDraft(agentRes.name || "");
    setSpecialtyDraft(agentRes.specialty || "");
  };

  useEffect(() => {
    if (!id) return;
    reload().catch(console.error);
  }, [id]);

  useEffect(() => {
    loadModels({ force: true }).then(setModelCatalog).catch(() => setModelCatalog([]));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const applyModel = async (modelId: string) => {
    setSelectedModel(modelId);
    try {
      await fetchApi(`/agents/${id}/personalize`, {
        method: "PATCH",
        body: JSON.stringify({
          model_id: modelId,
          custom_instructions: customInstructions,
          tone_override: toneOverride,
          share_context: shareContext,
        }),
      });
      setAgent((prev: { model_id?: string } | null) =>
        prev ? { ...prev, model_id: modelId } : prev
      );
      flash(`Model set to ${modelDisplayName(modelId, modelCatalog)}`);
    } catch {
      flash("Couldn't update model");
    }
  };

  const handleSend = async (payload: {
    message: string;
    attachments: LocalAttachment[];
    inputLanguage?: string;
  }) => {
    if (isStreaming) return;
    const userMessage = payload.message;
    const files = payload.attachments.map((a) => ({ name: a.filename, media: a.media }));
    const display =
      userMessage ||
      (files.length ? `Attached ${files.map((f) => f.name).join(", ")}` : "");
    setMessages((prev) => [...prev, { role: "user", content: display, files }]);
    setShowRating(false);
    setIsStreaming(true);
    setOrchEvents([]);
    setLastFailure(null);
    try {
      const token = await ensureAuth();
      const response = await fetch(`${API_BASE}/agents/${id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userMessage,
          attachment_ids: payload.attachments.map((a) => a.id),
          input_language: payload.inputLanguage,
          model_id: sessionModelOverride || undefined,
        }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        const message =
          body?.detail?.error?.message ||
          body?.error?.message ||
          "The selected model could not respond.";
        throw new Error(message);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (!value) continue;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "token" || data.type === "warning" || data.type === "error") {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  content: next[next.length - 1].content + data.content,
                };
                return next;
              });
            } else if (data.type === "tool" && Array.isArray(data.content)) {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  tools: data.content as ToolCallRecord[],
                };
                return next;
              });
            } else if (data.type === "orchestration" && data.content) {
              setOrchEvents((prev) => [...prev, data.content as OrchestrationEvent]);
            } else if (data.type === "routing" && data.content) {
              setLastRouting(data.content as RoutingPayload);
              const orch = (data.content as RoutingPayload & {
                orchestration?: { events?: OrchestrationEvent[] };
              }).orchestration;
              if (orch?.events?.length) {
                setOrchEvents(orch.events);
              }
            } else if (data.type === "done") {
              setShowRating(true);
            }
          } catch {
            /* incomplete chunk */
          }
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Couldn't reach this agent — check the API.";
      setLastFailure(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: msg,
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleRun = async (payload: {
    message: string;
    attachments: LocalAttachment[];
    inputLanguage?: string;
  }) => {
    if (isRunning) return;
    setIsRunning(true);
    setRunOutput(null);
    setRunTools([]);
    setShowRating(false);
    try {
      const res = await fetchApi(`/agents/${id}/run`, {
        method: "POST",
        body: JSON.stringify({
          message: payload.message,
          attachment_ids: payload.attachments.map((a) => a.id),
          input_language: payload.inputLanguage,
        }),
      });
      setRunOutput(res.output || "No output");
      setRunTools(Array.isArray(res.tool_calls) ? res.tool_calls : []);
      setLastRouting((res.routing as RoutingPayload) || null);
      const orch = (res.routing as { orchestration?: { events?: OrchestrationEvent[] } } | null)
        ?.orchestration;
      if (orch?.events?.length) setOrchEvents(orch.events);
      else setOrchEvents([]);
      setShowRating(true);
    } catch (err) {
      setRunOutput(
        err instanceof Error
          ? err.message
          : "Couldn't run this agent — check the API."
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleDynamicRun = async (payload: {
    fields: Record<string, unknown>;
    attachments: { id: string }[];
  }) => {
    if (isRunning) return;
    setIsRunning(true);
    setRunOutput(null);
    setRunTools([]);
    setShowRating(false);
    try {
      const res = await fetchApi(`/agents/${id}/run`, {
        method: "POST",
        timeoutMs: 120_000,
        body: JSON.stringify({
          fields: payload.fields,
          attachment_ids: payload.attachments.map((attachment) => attachment.id),
        }),
      });
      setRunOutput(res.output || "No output");
      setRunTools(Array.isArray(res.tool_calls) ? res.tool_calls : []);
      setLastRouting((res.routing as RoutingPayload) || null);
      const orch = (res.routing as { orchestration?: { events?: OrchestrationEvent[] } } | null)
        ?.orchestration;
      if (orch?.events?.length) setOrchEvents(orch.events);
      else setOrchEvents([]);
      setShowRating(true);
    } catch (error) {
      setRunOutput(
        error instanceof Error ? error.message : "Couldn't run this agent — check the API."
      );
    } finally {
      setIsRunning(false);
    }
  };

  const submitRating = async (rating: number) => {
    if (!id || submittingRating) return;
    setSubmittingRating(true);
    // Optimistic UI so stars respond immediately
    setAgent((prev: Record<string, unknown> | null) =>
      prev
        ? {
            ...prev,
            my_rating: rating,
            rating_avg: rating,
            rating_count: Math.max(1, Number(prev.rating_count || 0)),
          }
        : prev
    );
    try {
      const res = await fetchApi(`/agents/${id}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });
      setAgent((prev: Record<string, unknown> | null) =>
        prev
          ? {
              ...prev,
              my_rating: res.my_rating ?? rating,
              rating_avg: res.rating_avg ?? prev.rating_avg,
              rating_count: res.rating_count ?? prev.rating_count,
              stars: res.stars ?? res.rating_avg ?? prev.stars,
            }
          : prev
      );
      setShowRating(false);
      flash("Rating saved");
      // Refresh eval panel without failing the rating if eval is slow/unavailable
      fetchApi(`/agents/${id}/evaluation`, { silentAuth: true })
        .then(setEvalData)
        .catch(() => undefined);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Couldn't save rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  const savePersonalize = async () => {
    setSaving(true);
    try {
      await fetchApi(`/agents/${id}/personalize`, {
        method: "PATCH",
        body: JSON.stringify({
          model_id: selectedModel,
          custom_instructions: customInstructions,
          tone_override: toneOverride,
          share_context: shareContext,
          specialty: specialtyDraft,
        }),
      });
      await reload();
      flash("Personalization saved");
      setTab("primary");
    } catch {
      flash("Couldn't save personalization");
    } finally {
      setSaving(false);
    }
  };

  const saveUpdate = async () => {
    setSaving(true);
    try {
      const instructions = updateInstructions.trim();
      const res = await fetchApi(`/agents/${id}/update`, {
        method: "PATCH",
        body: JSON.stringify({
          name: nameDraft,
          specialty: specialtyDraft || undefined,
          instructions: instructions || undefined,
        }),
        timeoutMs: instructions ? GENERATE_TIMEOUT_MS : undefined,
      });
      await reload();
      if (res?.prompt_changed) {
        setUpdateNote(
          res.summary
            ? `${res.summary} (now v${res.current_version})`
            : `Rewritten to v${res.current_version}.`
        );
        setUpdateInstructions("");
        flash(
          res.interface_changed
            ? "Agent rewired — form fields updated"
            : "Agent rewired from your instructions"
        );
      } else {
        flash("Agent updated");
        setTab("primary");
      }
    } catch (e) {
      flash(
        e instanceof Error && e.message
          ? e.message
          : "Couldn't update agent"
      );
    } finally {
      setSaving(false);
    }
  };

  const runAdvance = async () => {
    setSaving(true);
    try {
      const res = await fetchApi(`/agents/${id}/advance`, {
        method: "POST",
        body: JSON.stringify({ focus }),
      });
      setAdvanceNote(res.suggestion);
      await reload();
      flash("Agent advanced");
    } catch {
      flash("Couldn't advance agent");
    } finally {
      setSaving(false);
    }
  };

  if (!agent) {
    return (
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-busy>
        <ShellMenuAnchor />
        <div className="skeleton h-16 max-w-md rounded-2xl" />
        <div className="mt-6 skeleton h-[50vh] rounded-[1.35rem]" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Bot }[] = [
    { id: "primary", label: primaryLabel, icon: isChat ? Bot : Play },
    { id: "personalize", label: "Personalize", icon: Wand2 },
    { id: "advance", label: "Advance", icon: Sparkles },
    { id: "update", label: "Update", icon: Settings2 },
  ];

  const chatHints = [
    "Summarize what I attached",
    "What's the main risk?",
    "Give me next steps",
  ];
  const runHints =
    kind === "transformer"
      ? ["Rewrite for clarity", "Make it more formal", "Shorten by half"]
      : kind === "analyzer"
        ? ["Find the decisions", "List open questions", "Flag risks"]
        : kind === "automation"
          ? ["Apply the checklist", "Label and route", "Escalate edge cases"]
          : ["Triage this", "Prioritize issues", "Produce a checklist"];

  const productBlueprint = agent.product_blueprint;
  const useProductShell = hasProductShell(productBlueprint);

  const primaryAiSurface = isChat ? (
    <>
      <div className="chat-thread flex-1 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 && (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center text-muted">
            <Bot className="mb-3 h-10 w-10 opacity-30" aria-hidden />
            <p className="text-sm">Ask {agent.name} — attach files like the best chatbots.</p>
            <p className="mt-1 max-w-sm text-xs">
              Drop code, logs, CSV, screenshots, or PDFs. Paste images from your clipboard.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            files={msg.files}
            tools={msg.tools}
          />
        ))}
        {showRating && !isStreaming && (
          <div className="ml-11 rounded-2xl bg-surface p-4 ring-1 ring-border">
            <p className="mb-2 text-sm text-muted">Rate this response</p>
            <StarRating
              value={0}
              interactive
              showValue={false}
              size={22}
              disabled={submittingRating}
              onChange={submitRating}
            />
            {submittingRating && (
              <Loader2 className="mt-2 h-4 w-4 animate-spin text-muted" />
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
        <ModelRouterPanel routing={lastRouting} compact className="border-t border-border px-4 py-2" />
        {orchEvents.length > 0 && (
          <div className="border-t border-border px-4 py-2">
            <OrchestrationProgress events={orchEvents} />
          </div>
        )}
      </div>
      <Composer
        busy={isStreaming}
        hints={chatHints}
        placeholder="Message, drop a file, or paste an image…"
        selectedModelId={sessionModelOverride || selectedModel}
        recommendPrompt={agent?.specialty || ""}
        recommendDomain={agent?.domain || "general"}
        onModelChange={(mid) => {
          setSessionModelOverride(mid);
          void applyModel(mid);
        }}
        onClearModel={() => setSessionModelOverride(null)}
        onSubmit={handleSend}
        onError={flash}
      />
    </>
  ) : (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">
            {interfaceSchema?.title || meta.openLabel}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {interfaceSchema?.description ||
              `${meta.description} Attach source files, paste text, or both.`}
          </p>
        </div>
        {hasDesignedInterface && interfaceSchema ? (
          <DynamicAgentRunner
            schema={interfaceSchema}
            busy={isRunning}
            onSubmit={handleDynamicRun}
            onError={flash}
          />
        ) : null}
        {(runTools.length > 0 || runOutput) && (
          <div className="space-y-3">
            {runTools.length > 0 ? <ToolExecutionList tools={runTools} /> : null}
            {runOutput ? (
              <>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                  {interfaceSchema?.output?.label || "Result"}
                </p>
                <pre className="whitespace-pre-wrap rounded-2xl bg-background/80 p-4 font-mono text-sm leading-relaxed ring-1 ring-border">
                  {runOutput}
                </pre>
              </>
            ) : null}
            <ModelRouterPanel routing={lastRouting} compact />
            {orchEvents.length > 0 ? <OrchestrationProgress events={orchEvents} /> : null}
            {showRating && (
              <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                <p className="mb-2 text-sm text-muted">Rate this result</p>
                <StarRating
                  value={0}
                  interactive
                  showValue={false}
                  size={22}
                  disabled={submittingRating}
                  onChange={submitRating}
                />
              </div>
            )}
          </div>
        )}
      </div>
      {!hasDesignedInterface && (
        <Composer
          multiline
          busy={isRunning}
          hints={runHints}
          submitLabel={meta.openLabel}
          selectedModelId={selectedModel}
          onModelChange={(mid) => void applyModel(mid)}
          placeholder={
            kind === "transformer"
              ? "Paste text or attach a draft to transform…"
              : kind === "analyzer"
                ? "Paste material or attach CSV / PDF / notes…"
                : kind === "automation"
                  ? "Paste a batch item or attach a CSV…"
                  : "Paste input or attach a stack trace / diff…"
          }
          onSubmit={handleRun}
          onError={flash}
        />
      )}
    </div>
  );

  return (
    <div className="relative mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
      <ShellMenuAnchor />
      <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/yours"
            aria-label="Back to Yours"
            className="mt-0.5 inline-flex min-h-tap min-w-tap items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-alive"
          >
            <ArrowLeft size={20} />
          </Link>
          <AgentIcon
            name={agent.name}
            kind={kind}
            domain={agent.domain}
            purpose={agent.specialty}
            logo={agent.logo}
            agentId={String(id)}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {agent.name}
            </h1>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{agent.specialty}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted ring-1 ring-border">
                <ComplexityMark
                  size={12}
                  tier={agent.create_tier || "normal"}
                  className="text-alive"
                />
                {useProductShell
                  ? productBlueprint.product_type || productLabel
                  : productLabel}
              </span>
              <StarRating
                value={agent.rating_avg || agent.stars || 0}
                count={agent.rating_count || 0}
                size={15}
              />
              <span className="font-mono text-xs text-muted">
                {agent.model_id} · v{agent.current_version}
              </span>
            </div>
            {(agent.remix_attribution || agent.parent_agent_id) && (
              <RemixAttribution
                className="mt-2"
                chain={agent.remix_attribution?.chain}
                parentId={
                  agent.remix_attribution?.parent_agent_id || agent.parent_agent_id
                }
                parentName={agent.remix_attribution?.parent_name}
                parentDeveloper={agent.remix_attribution?.parent_developer}
                depth={agent.remix_depth || 0}
              />
            )}
          </div>
          {useProductShell ? (
            <a
              href={`/app/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-tap shrink-0 items-center justify-center gap-2 self-start rounded-full bg-alive px-5 text-sm font-semibold text-on-alive"
            >
              Open product
            </a>
          ) : null}
        </div>
      </div>

      <DriftNudgeBanner agentId={String(id)} className="mb-4" />

      <div className="-mx-3 mb-4 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <div className="inline-flex min-w-full gap-1 rounded-full bg-surface p-1 ring-1 ring-border sm:min-w-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex min-h-tap flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium transition sm:flex-none sm:px-4 ${
                  active ? "bg-alive/15 text-alive shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon size={16} aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`grid gap-4 ${
          (tab === "personalize" || tab === "update") && isChat
            ? "lg:grid-cols-[1fr_1fr]"
            : "lg:grid-cols-[1fr_280px]"
        }`}
      >
        {tab === "primary" && useProductShell ? (
          <section className="glass-panel flex min-h-[40vh] flex-col items-start justify-center gap-4 rounded-[1.35rem] p-8 lg:min-h-[calc(100vh-14rem)]">
            <p className="font-display text-2xl font-semibold tracking-tight">
              This product runs as its own web app
            </p>
            <p className="max-w-md text-sm text-muted">
              Open it in a new tab for multi-page navigation, design tokens, and actions.
              Use Personalize, Advance, and Update in the sidebar when you need them.
            </p>
            <a
              href={`/app/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-tap items-center justify-center rounded-full bg-alive px-6 text-sm font-semibold text-on-alive"
            >
              Open product in new tab
            </a>
            <p className="text-xs text-muted">
              {(productBlueprint.information_architecture?.nav || []).length} pages ·{" "}
              {productBlueprint.design_system?.personality || "custom"} look
            </p>
          </section>
        ) : (
        <section className="glass-panel flex min-h-[60vh] flex-col overflow-hidden rounded-[1.35rem] lg:min-h-[calc(100vh-14rem)]">
          {tab === "primary" && primaryAiSurface}

          {lastFailure && id ? (
            <div className="border-b border-border p-4">
              <FailurePostMortem
                agentId={String(id)}
                error={lastFailure}
                events={orchEvents.map((e) => ({
                  type: e.type,
                  content: String(e.payload?.message || e.task_id || ""),
                }))}
                onDismiss={() => setLastFailure(null)}
              />
            </div>
          ) : null}

          {tab === "personalize" && (
            <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
              <div>
                <h2 className="font-display text-lg font-semibold">Personalize</h2>
                <p className="mt-1 text-sm text-muted">
                  Shape tone and standing instructions without rewriting the whole agent.
                </p>
              </div>
              <div className="rounded-2xl bg-background/70 p-4 ring-1 ring-border">
                <AgentAvatarControls
                  agentId={String(id)}
                  name={agent.name}
                  kind={kind}
                  domain={agent.domain}
                  purpose={agent.specialty}
                  logo={agent.logo}
                />
              </div>
              <Field label="Model">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="field-input"
                >
                  {groupModelsByProvider(
                    modelCatalog.length ? modelCatalog : FALLBACK_MODELS
                  ).map((group) => (
                    <optgroup key={group.provider} label={group.label}>
                      {group.models.map((m) => (
                        <option
                          key={m.name}
                          value={m.name}
                          disabled={m.configured === false}
                        >
                          {m.display_name}
                          {m.configured === false ? " — API key required" : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="Tone preference">
                <div className="flex items-center gap-2">
                  <VoiceInput
                    value={toneOverride}
                    onChange={setToneOverride}
                    compact
                    onError={flash}
                  />
                  <input
                    value={toneOverride}
                    onChange={(e) => setToneOverride(e.target.value)}
                    placeholder="e.g. Warm, concise, never sycophantic"
                    className="field-input"
                  />
                </div>
              </Field>
              <Field label="Custom instructions">
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <VoiceInput
                      value={customInstructions}
                      onChange={setCustomInstructions}
                      onError={flash}
                    />
                  </div>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={5}
                    placeholder="Always cite assumptions. Prefer checklists over essays — or dictate in any language."
                    className="field-input resize-y"
                  />
                </div>
              </Field>
              <label className="flex min-h-tap cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={shareContext}
                  onChange={(e) => setShareContext(e.target.checked)}
                  className="h-4 w-4 accent-[var(--alive)]"
                />
                Let this agent use context from your other agents
              </label>
              <button
                type="button"
                onClick={savePersonalize}
                disabled={saving}
                className="min-h-tap rounded-full bg-alive px-6 text-sm font-semibold text-on-alive disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save personalization"}
              </button>
            </div>
          )}

          {tab === "advance" && (
            <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
              <div>
                <h2 className="font-display text-lg font-semibold">Advance</h2>
                <p className="mt-1 text-sm text-muted">
                  Evolution step — strengthen the prompt from ratings and a focus you choose.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["quality", "autonomy", "brevity", "safety"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFocus(f)}
                    className={`min-h-tap rounded-2xl border px-3 text-sm capitalize transition ${
                      focus === f
                        ? "border-alive/50 bg-alive/10 text-alive"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {advanceNote && (
                <p className="rounded-2xl bg-alive/8 p-4 text-sm text-alive ring-1 ring-alive/20">
                  {advanceNote}
                </p>
              )}
              <button
                type="button"
                onClick={runAdvance}
                disabled={saving}
                className="inline-flex min-h-tap items-center gap-2 rounded-full bg-alive px-6 text-sm font-semibold text-on-alive disabled:opacity-50"
              >
                <Sparkles size={16} /> {saving ? "Advancing…" : "Advance agent"}
              </button>
            </div>
          )}

          {tab === "update" && (
            <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
              <div>
                <h2 className="font-display text-lg font-semibold">Update</h2>
                <p className="mt-1 text-sm text-muted">
                  Tell the agent how to work better — your instructions rewrite its
                  system prompt and, when needed, its run form (e.g. remove duplicate fields).
                </p>
              </div>
              <Field label="How should this agent improve?">
                <div className="flex items-start gap-2">
                  <VoiceInput
                    value={updateInstructions}
                    onChange={setUpdateInstructions}
                    compact
                    onError={flash}
                  />
                  <textarea
                    value={updateInstructions}
                    onChange={(e) => setUpdateInstructions(e.target.value)}
                    rows={4}
                    placeholder="e.g. Be more concise, always cite sources, and refuse legal advice."
                    className="field-input min-h-[6rem] resize-y"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  The model rewrites the agent&rsquo;s constitution and form from these
                  instructions and bumps the version. Leave blank to only edit
                  the fields below.
                </p>
              </Field>
              {updateNote && (
                <p className="rounded-2xl bg-alive/8 p-4 text-sm text-alive ring-1 ring-alive/20">
                  {updateNote}
                </p>
              )}
              <Field label="Name">
                <div className="flex items-center gap-2">
                  <VoiceInput value={nameDraft} onChange={setNameDraft} compact onError={flash} />
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="field-input"
                  />
                </div>
              </Field>
              <Field label="Specialty (one line)">
                <div className="flex items-center gap-2">
                  <VoiceInput
                    value={specialtyDraft}
                    onChange={setSpecialtyDraft}
                    compact
                    onError={flash}
                  />
                  <input
                    value={specialtyDraft}
                    onChange={(e) => setSpecialtyDraft(e.target.value)}
                    className="field-input"
                  />
                </div>
              </Field>
              <button
                type="button"
                onClick={saveUpdate}
                disabled={saving}
                className="inline-flex min-h-tap items-center gap-2 rounded-full bg-alive px-6 text-sm font-semibold text-on-alive disabled:opacity-50"
              >
                <Settings2 size={16} />
                {saving
                  ? "Updating…"
                  : updateInstructions.trim()
                    ? "Rewrite agent"
                    : "Save updates"}
              </button>
            </div>
          )}
        </section>
        )}

        <aside className="space-y-4">
          {(tab === "personalize" || tab === "update") && isChat ? (
            <section className="glass-panel flex min-h-[60vh] flex-col overflow-hidden rounded-[1.35rem] lg:min-h-[calc(100vh-14rem)]">
              <div className="border-b border-border px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-alive">
                  Live test-drive
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Chat updates with the saved config — no full regenerate.
                </p>
              </div>
              {primaryAiSurface}
            </section>
          ) : (
            <>
              <div className="glass-panel rounded-[1.25rem] p-5">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  <Activity size={14} /> Evaluation
                </h3>
                <p className="mt-4 text-center font-display text-4xl font-light tabular-nums">
                  {(evalData?.average_composite_score ?? evalData?.composite_score ?? 0).toFixed(2)}
                </p>
                <p className="mt-1 text-center text-[11px] uppercase tracking-widest text-muted">
                  Composite
                </p>
                <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                  <Row label="Kind" value={meta.label} />
                  <Row
                    label="Stars"
                    value={`${(agent.rating_avg || 0).toFixed(1)} · ${agent.rating_count || 0}`}
                  />
                  <Row label="Satisfaction" value={String(evalData?.satisfaction ?? "—")} />
                  <Row label="Runs rated" value={String(evalData?.evaluation_count ?? 0)} />
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-xs text-muted">Your rating</p>
                  <StarRating
                    value={agent.my_rating || 0}
                    interactive
                    showValue={false}
                    size={20}
                    disabled={submittingRating}
                    onChange={submitRating}
                  />
                </div>
              </div>
              <VersionTimeline agentId={String(id)} />
              <div className="glass-panel rounded-[1.25rem] p-5 text-sm text-muted">
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">Inputs</p>
                <p className="mt-2 leading-relaxed">
                  Text, code, CSV, images, PDF — paperclip, drag-and-drop, paste, or voice in 70+ languages.
                </p>
              </div>
              <div className="glass-panel rounded-[1.25rem] p-4">
                <ArchitecturePanel
                  compact
                  agent={{
                    model_id: agent.model_id,
                    prompt_text: agent.prompt_text || agent.spec?.role,
                    kind: agent.kind,
                    capability_tier: agent.capability_tier,
                    capabilities: agent.capabilities,
                    share_context: agent.share_context,
                    spec: agent.spec,
                  }}
                />
              </div>
            </>
          )}
        </aside>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-surface-elevated px-5 py-2.5 text-sm shadow-2xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
