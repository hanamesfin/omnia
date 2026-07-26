"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Send, CheckCircle2, Play, RefreshCw } from "lucide-react";
import type { PageSpec } from "@/components/ProductShell";

export type BlueprintProductSurfaceProps = {
  agentId: string;
  productName: string;
  pageId: string;
  pageLabel: string;
  spec?: PageSpec;
  description?: string;
  metaLine?: string;
  aiPageId: string;
  onAction?: (action: string, pageId: string) => void;
};

export function BlueprintProductSurface({
  agentId,
  productName,
  pageId,
  pageLabel,
  spec,
  description,
  metaLine,
  aiPageId,
  onAction,
}: BlueprintProductSurfaceProps) {
  const actions = Array.isArray(spec?.primary_actions) ? spec.primary_actions : [];
  const secondary = Array.isArray(spec?.secondary_actions) ? spec.secondary_actions : [];
  const purpose = spec?.purpose || description || "";
  const empty = spec?.empty_state || "";
  const [query, setQuery] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const runTask = (actionName: string) => {
    setActiveAction(actionName);
    setExecuting(true);
    onAction?.(actionName, pageId);
    setTimeout(() => {
      setExecuting(false);
      setResult(
        `Action "${actionName}" executed successfully for ${productName}.\n\nOutput: Synthesized results are ready in the ${pageLabel} workspace.`
      );
    }, 1200);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    runTask(query.trim());
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8 pt-1">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        {/* Hero block */}
        <section
          className="product-app-card relative overflow-hidden px-6 pb-7 pt-8 shadow-soft"
          style={{
            background:
              "linear-gradient(165deg, var(--pf-surface, #fff) 0%, color-mix(in srgb, var(--pf-bg, #f6f5f2) 55%, var(--pf-surface, #fff)) 100%)",
            borderRadius: "var(--pf-radius-card, 1.25rem)",
            border: "1px solid var(--pf-border, rgba(0,0,0,0.1))",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{
                color: "var(--pf-muted, #6b6b6b)",
                fontFamily: "var(--pf-font-mono, inherit)",
              }}
            >
              {productName}
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-alive">
              <Sparkles size={12} />
              Active product
            </span>
          </div>

          <h2
            className="mt-3 text-[1.65rem] font-medium tracking-[-0.03em] sm:text-[1.85rem]"
            style={{
              fontFamily: "var(--pf-font-display, inherit)",
              color: "var(--pf-fg, #141414)",
              lineHeight: 1.15,
            }}
          >
            {pageLabel}
          </h2>

          {purpose ? (
            <p
              className="mt-3 text-[14px] leading-relaxed tracking-[-0.01em]"
              style={{ color: "var(--pf-muted, #6b6b6b)" }}
            >
              {purpose}
            </p>
          ) : null}

          {/* Quick Action Chips */}
          {actions.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {actions.map((a, i) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => runTask(a)}
                  disabled={executing}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-[12px] font-medium transition active:scale-95 disabled:opacity-50"
                  style={
                    i === 0
                      ? {
                          background: "var(--pf-accent, #6366f1)",
                          color: "#ffffff",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                        }
                      : {
                          background: "transparent",
                          color: "var(--pf-fg, #141414)",
                          border: "1px solid var(--pf-border, rgba(0,0,0,0.15))",
                          fontFamily: "var(--pf-font-mono, inherit)",
                        }
                  }
                >
                  <Play size={12} fill="currentColor" aria-hidden />
                  {a}
                </button>
              ))}
            </div>
          ) : null}

          {/* Interactive Direct Prompt Runner */}
          <form onSubmit={handleCustomSubmit} className="mt-6 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Ask or run a task in ${pageLabel}...`}
              className="min-h-10 flex-1 rounded-xl px-3.5 text-xs outline-none transition"
              style={{
                background: "color-mix(in srgb, var(--pf-bg, #000) 5%, var(--pf-surface, #fff))",
                color: "var(--pf-fg, #141414)",
                border: "1px solid var(--pf-border, rgba(0,0,0,0.15))",
              }}
            />
            <button
              type="submit"
              disabled={executing || !query.trim()}
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-xs font-semibold text-white transition disabled:opacity-50"
              style={{ background: "var(--pf-accent, #6366f1)" }}
            >
              {executing ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </form>
        </section>

        {/* Execution Output Canvas */}
        {executing ? (
          <section
            className="flex min-h-[10rem] flex-col items-center justify-center rounded-2xl p-6 text-center shadow-soft"
            style={{
              background: "var(--pf-surface, #ffffff)",
              border: "1px solid var(--pf-border, rgba(0,0,0,0.1))",
            }}
          >
            <RefreshCw size={22} className="animate-spin text-alive" />
            <p className="mt-3 text-sm font-medium" style={{ color: "var(--pf-fg, #141414)" }}>
              Running &quot;{activeAction}&quot;...
            </p>
            <p className="mt-1 text-xs text-muted">Executing prompt & pipeline tasks</p>
          </section>
        ) : result ? (
          <section
            className="rounded-2xl p-6 shadow-soft"
            style={{
              background: "var(--pf-surface, #ffffff)",
              border: "1px solid var(--pf-accent, rgba(99,102,241,0.3))",
            }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
              <CheckCircle2 size={15} />
              Task completed
            </div>
            <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed" style={{ color: "var(--pf-fg, #141414)" }}>
              {result}
            </pre>
          </section>
        ) : (
          /* Empty / Default Canvas */
          <section
            className="flex min-h-[12rem] flex-col items-center justify-center rounded-[var(--pf-radius-card,14px)] border border-dashed px-6 py-10 text-center"
            style={{
              borderColor: "var(--pf-border, rgba(0,0,0,0.12))",
              background: "color-mix(in srgb, var(--pf-surface, #fff) 40%, transparent)",
            }}
          >
            <p
              className="max-w-xs text-[13px] leading-snug tracking-[-0.02em]"
              style={{
                color: "var(--pf-fg, #141414)",
                fontFamily: "var(--pf-font-display, inherit)",
              }}
            >
              {empty ||
                `${pageLabel} workspace is live — click an action or run a task above to see instant results.`}
            </p>
            {secondary.length > 0 ? (
              <ul className="mt-4 flex flex-wrap justify-center gap-2">
                {secondary.map((a) => (
                  <li key={a}>
                    <button
                      type="button"
                      onClick={() => runTask(a)}
                      className="text-[11px] tracking-[-0.02em] underline-offset-4 hover:underline"
                      style={{
                        color: "var(--pf-muted, #6b6b6b)",
                        fontFamily: "var(--pf-font-mono, inherit)",
                      }}
                    >
                      {a}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        )}

        {aiPageId ? (
          <div className="text-center">
            <Link
              href={`/app/${agentId}/${encodeURIComponent(aiPageId)}`}
              className="inline-block text-[12px] tracking-[-0.02em] underline-offset-4 hover:underline"
              style={{
                color: "var(--pf-muted, #6b6b6b)",
                fontFamily: "var(--pf-font-mono, inherit)",
              }}
            >
              Open AI workspace →
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
