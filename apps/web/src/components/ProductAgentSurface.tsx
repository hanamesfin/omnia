"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Loader2 } from "lucide-react";
import { fetchApi, API_BASE, ensureAuth } from "@/lib/api";
import {
  loadChatThread,
  newChatThreadId,
  saveChatThread,
} from "@/lib/chat-history";
import { kindMeta, parseAgentKind } from "@/lib/agent-kinds";
import { Composer, type LocalAttachment } from "@/components/Composer";
import { ChatMessage } from "@/components/ChatMessage";
import { ModelRouterPanel, type RoutingPayload } from "@/components/ModelRouterPanel";
import { OrchestrationProgress, type OrchestrationEvent } from "@/components/OrchestrationProgress";
import {
  DynamicAgentRunner,
  type AgentInterfaceSchema,
} from "@/components/DynamicAgentRunner";
import {
  ToolExecutionList,
  type ToolCallRecord,
} from "@/components/ToolExecutionBlock";

type ThreadMessage = {
  role: "user" | "assistant";
  content: string;
  files?: { name: string; media: string }[];
  tools?: ToolCallRecord[];
};

type Props = {
  agentId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agent: any;
  seedMessage?: string | null;
  onSeedConsumed?: () => void;
};

export function ProductAgentSurface({
  agentId,
  agent,
  seedMessage,
  onSeedConsumed,
}: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [runTools, setRunTools] = useState<ToolCallRecord[]>([]);
  const [lastRouting, setLastRouting] = useState<RoutingPayload | null>(null);
  const [orchEvents, setOrchEvents] = useState<OrchestrationEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionModelOverride, setSessionModelOverride] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const requestedThreadId = searchParams.get("thread");
  const [threadId, setThreadId] = useState(() => requestedThreadId || newChatThreadId());
  const hydratedThreadRef = useRef(false);

  const kind = parseAgentKind(agent?.kind);
  const meta = kindMeta(kind);
  const interfaceSchema = (agent?.interface_schema || null) as AgentInterfaceSchema | null;
  const interfaceMode = String(interfaceSchema?.mode || "").toLowerCase();
  const hasDesignedInterface = Boolean(
    interfaceSchema &&
      (interfaceMode || (interfaceSchema.input_fields?.length || 0) > 0)
  );
  const isChat = hasDesignedInterface ? interfaceMode === "chat" : kind === "chat";

  useEffect(() => {
    if (!isChat) return;
    const nextId = requestedThreadId || newChatThreadId();
    setThreadId(nextId);
    hydratedThreadRef.current = false;
    const stored = requestedThreadId ? loadChatThread(agentId, requestedThreadId) : null;
    setMessages(stored?.messages || []);
    setRunOutput(null);
    setRunTools([]);
    queueMicrotask(() => {
      hydratedThreadRef.current = true;
    });
  }, [agentId, isChat, requestedThreadId]);

  useEffect(() => {
    if (!isChat || !hydratedThreadRef.current || messages.length === 0) return;
    const timer = window.setTimeout(() => {
      const firstUserMessage = messages.find((message) => message.role === "user")?.content || "New chat";
      saveChatThread(agentId, {
        id: threadId,
        title: firstUserMessage.slice(0, 52),
        updatedAt: Date.now(),
        messages: messages.map(({ role, content }) => ({ role, content })),
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [agentId, isChat, messages, threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (!seedMessage?.trim() || isStreaming || isRunning) return;
    const msg = seedMessage.trim();
    onSeedConsumed?.();
    if (isChat) {
      void handleSend({ message: msg, attachments: [] });
    } else {
      void handleRun({ message: msg, attachments: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedMessage]);

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
    setIsStreaming(true);
    setOrchEvents([]);
    try {
      const token = await ensureAuth();
      const response = await fetch(`${API_BASE}/agents/${agentId}/chat`, {
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
            }
          } catch {
            /* incomplete */
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error ? err.message : "Couldn't reach this agent — check the API.",
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
    try {
      const res = await fetchApi(`/agents/${agentId}/run`, {
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
    } catch (err) {
      setRunOutput(
        err instanceof Error ? err.message : "Couldn't run this agent — check the API."
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
    try {
      const res = await fetchApi(`/agents/${agentId}/run`, {
        method: "POST",
        timeoutMs: 120_000,
        body: JSON.stringify({
          fields: payload.fields,
          attachment_ids: payload.attachments.map((a) => a.id),
        }),
      });
      setRunOutput(res.output || "No output");
      setRunTools(Array.isArray(res.tool_calls) ? res.tool_calls : []);
      setLastRouting((res.routing as RoutingPayload) || null);
    } catch (error) {
      setRunOutput(
        error instanceof Error ? error.message : "Couldn't run this agent — check the API."
      );
    } finally {
      setIsRunning(false);
    }
  };

  if (isChat) {
    const isEmpty = messages.length === 0;
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-transparent">
        <div className={`chat-thread flex-1 overflow-y-auto ${isEmpty ? "flex" : "p-4 sm:p-6"}`}>
          {isEmpty ? (
            <div className="m-auto flex w-full max-w-3xl flex-col items-center px-5 pb-[10vh] text-center">
              <Bot
                className="mb-5 h-9 w-9"
                strokeWidth={1.5}
                aria-hidden
                style={{ color: "var(--pf-fg, currentColor)" }}
              />
              <h2
                className="text-2xl font-light tracking-[-0.03em] sm:text-3xl"
                style={{ fontFamily: "var(--pf-font-display, inherit)", color: "var(--pf-fg, inherit)" }}
              >
                Ready when you are.
              </h2>
              <p
                className="mt-2 text-[12px]"
                style={{
                  color: "var(--pf-muted, #999)",
                  fontFamily: "var(--pf-font-mono, inherit)",
                }}
              >
                Ask {agent.name} anything, create something, or work through a task.
              </p>
              <div className="mt-7 w-full text-left">
                <Composer
                  busy={isStreaming}
                  hints={["Create an image", "Write or edit", "Look something up"]}
                  placeholder="Ask anything"
                  selectedModelId={sessionModelOverride || agent.model_id}
                  recommendPrompt={agent?.specialty || ""}
                  recommendDomain={agent?.domain || "general"}
                  onModelChange={(mid) => setSessionModelOverride(mid)}
                  onClearModel={() => setSessionModelOverride(null)}
                  onSubmit={handleSend}
                />
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl">
              {messages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  files={msg.files}
                  tools={msg.tools}
                />
              ))}
              <div ref={messagesEndRef} />
              <ModelRouterPanel routing={lastRouting} compact className="border-t border-border px-4 py-2" />
              {orchEvents.length > 0 && (
                <div className="border-t border-border px-4 py-2">
                  <OrchestrationProgress events={orchEvents} />
                </div>
              )}
            </div>
          )}
        </div>
        {!isEmpty && (
          <div className="mx-auto w-full max-w-3xl px-4 pb-4">
            <Composer
              busy={isStreaming}
              placeholder={`Message ${agent.name}`}
              selectedModelId={sessionModelOverride || agent.model_id}
              recommendPrompt={agent?.specialty || ""}
              recommendDomain={agent?.domain || "general"}
              onModelChange={(mid) => setSessionModelOverride(mid)}
              onClearModel={() => setSessionModelOverride(null)}
              onSubmit={handleSend}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
        {hasDesignedInterface && interfaceSchema ? (
          <DynamicAgentRunner
            schema={interfaceSchema}
            busy={isRunning}
            onSubmit={handleDynamicRun}
          />
        ) : null}
        {(runTools.length > 0 || runOutput) && (
          <div className="space-y-3">
            {runTools.length > 0 ? <ToolExecutionList tools={runTools} /> : null}
            {runOutput ? (
              <pre className="whitespace-pre-wrap rounded-2xl bg-background/80 p-4 font-mono text-sm leading-relaxed ring-1 ring-border">
                {runOutput}
              </pre>
            ) : null}
            <ModelRouterPanel routing={lastRouting} compact />
          </div>
        )}
        {isRunning ? <Loader2 className="h-5 w-5 animate-spin text-muted" /> : null}
      </div>
      {!hasDesignedInterface && (
        <Composer
          multiline
          busy={isRunning}
          hints={["Run checklist", "Analyze", "Transform"]}
          submitLabel={meta.openLabel}
          selectedModelId={agent.model_id}
          placeholder="Paste input or attach a file…"
          onSubmit={handleRun}
        />
      )}
    </div>
  );
}
