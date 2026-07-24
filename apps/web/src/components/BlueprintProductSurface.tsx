"use client";

import Link from "next/link";
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

/**
 * Non-codegen product page — renders blueprint page_specs with the agent's
 * design tokens. Not Collections masonry; not a bare "empty card".
 */
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8 pt-1">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        {/* Hero block for this page */}
        <section
          className="product-app-card relative overflow-hidden px-6 pb-7 pt-8"
          style={{
            background:
              "linear-gradient(165deg, var(--pf-surface, #fff) 0%, color-mix(in srgb, var(--pf-bg, #f6f5f2) 55%, var(--pf-surface, #fff)) 100%)",
          }}
        >
          <p
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color: "var(--pf-muted, #6b6b6b)",
              fontFamily: "var(--pf-font-mono, inherit)",
            }}
          >
            {productName}
          </p>
          <h2
            className="mt-3 text-[1.65rem] font-light tracking-[-0.03em] sm:text-[1.85rem]"
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
              className="mt-3 max-w-md text-[14px] leading-relaxed tracking-[-0.01em]"
              style={{ color: "var(--pf-muted, #6b6b6b)" }}
            >
              {purpose}
            </p>
          ) : null}
          {metaLine && metaLine !== purpose ? (
            <p
              className="mt-2 text-[11px] tracking-[-0.02em]"
              style={{
                color: "var(--pf-muted, #6b6b6b)",
                fontFamily: "var(--pf-font-mono, inherit)",
              }}
            >
              {metaLine}
            </p>
          ) : null}

          {actions.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {actions.map((a, i) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onAction?.(a, pageId)}
                  className={
                    i === 0
                      ? "product-app-btn-primary min-h-tap rounded-full px-5 text-[12px] font-medium transition active:scale-95"
                      : "min-h-tap rounded-full px-4 text-[12px] font-medium transition active:scale-95"
                  }
                  style={
                    i === 0
                      ? undefined
                      : {
                          background: "transparent",
                          color: "var(--pf-fg, #141414)",
                          border: "1px solid var(--pf-border, rgba(0,0,0,0.1))",
                          fontFamily: "var(--pf-font-mono, inherit)",
                        }
                  }
                >
                  {a}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {/* Content canvas / empty state */}
        <section
          className="flex min-h-[12rem] flex-col items-center justify-center rounded-[var(--pf-radius-card,14px)] border border-dashed px-6 py-10 text-center"
          style={{
            borderColor: "var(--pf-border, rgba(0,0,0,0.12))",
            background: "color-mix(in srgb, var(--pf-surface, #fff) 40%, transparent)",
          }}
        >
          <div
            className="mb-4 h-16 w-24 rounded-[var(--pf-radius-media,8px)] opacity-40"
            style={{
              background:
                "linear-gradient(135deg, var(--pf-fg, #141414) 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <p
            className="max-w-xs text-[13px] leading-snug tracking-[-0.02em]"
            style={{
              color: "var(--pf-fg, #141414)",
              fontFamily: "var(--pf-font-display, inherit)",
            }}
          >
            {empty ||
              `${pageLabel} is ready — use an action above or open the AI workspace to get started.`}
          </p>
          {secondary.length > 0 ? (
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {secondary.map((a) => (
                <li key={a}>
                  <button
                    type="button"
                    onClick={() => onAction?.(a, pageId)}
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

        {spec?.a11y_notes || spec?.loading_state ? (
          <p
            className="text-center text-[10px]"
            style={{
              color: "var(--pf-muted, #6b6b6b)",
              fontFamily: "var(--pf-font-mono, inherit)",
            }}
          >
            {spec?.loading_state ? `${spec.loading_state} · ` : ""}
            {spec?.a11y_notes ? `A11y: ${spec.a11y_notes}` : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
