"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { DesignTokenProvider } from "@/components/DesignTokenProvider";
import {
  hasProductShell,
  type PageSpec,
  type ProductBlueprint,
  type ProductPage,
} from "@/components/ProductShell";

export type ProductAppShellProps = {
  agentId: string;
  productName: string;
  specialty?: string;
  pageId: string;
  blueprint: ProductBlueprint;
  aiSurface: ReactNode;
  immersive?: boolean;
  onAction?: (action: string, pageId: string) => void;
  toast?: string | null;
};

function resolvePages(blueprint: ProductBlueprint): Array<ProductPage & { label: string }> {
  const ia = blueprint.information_architecture || {};
  const list = Array.isArray(ia.pages) ? ia.pages : [];
  const byId = new Map(list.map((p) => [p.id, p]));
  const nav = Array.isArray(ia.nav) && ia.nav.length > 0 ? ia.nav : list;
  return nav
    .map((n) => {
      const page = byId.get(n.id) || { id: n.id, label: n.label || n.id };
      return {
        id: page.id,
        label: String(n.label || page.label || page.id),
        ai_powered: Boolean(page.ai_powered),
        description: page.description || "",
      };
    })
    .filter((p) => p.id);
}

function isAiPage(
  page: ProductPage | undefined,
  spec: PageSpec | undefined
): boolean {
  if (!page) return false;
  if (page.ai_powered || spec?.ai_powered) return true;
  return /assistant|chat|coach|lab|prep|workspace|draft/i.test(
    `${page.id} ${page.label || ""}`
  );
}

export function firstProductPageId(blueprint: ProductBlueprint | null | undefined): string {
  if (!blueprint || !hasProductShell(blueprint)) return "";
  const pages = resolvePages(blueprint);
  const firstAi = pages.find((p) =>
    isAiPage(p, blueprint.page_specs?.[p.id])
  );
  return firstAi?.id || pages[0]?.id || "";
}

export function ProductAppShell({
  agentId,
  productName,
  specialty,
  pageId,
  blueprint,
  aiSurface,
  immersive = false,
  onAction,
  toast,
}: ProductAppShellProps) {
  const pages = useMemo(() => resolvePages(blueprint), [blueprint]);
  const specs = blueprint.page_specs || {};
  const active = pages.find((p) => p.id === pageId) || pages[0];
  const activeSpec = active ? specs[active.id] : undefined;
  const showAi = isAiPage(active, activeSpec);
  const ds = blueprint.design_system;

  return (
    <DesignTokenProvider
      designSystem={ds}
      className="flex h-full min-h-0 flex-col overflow-hidden"
    >
      {!immersive && <header
        className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
        style={{
          borderColor: "var(--pf-border, var(--border))",
          background: "var(--pf-surface, var(--surface-solid))",
        }}
      >
        <div className="min-w-0">
          <p
            className="truncate text-lg font-semibold tracking-tight sm:text-xl"
            style={{ fontFamily: "var(--pf-font-display, var(--omnia-font-stack))" }}
          >
            {productName}
          </p>
          <p className="truncate text-xs" style={{ color: "var(--pf-muted, var(--muted))" }}>
            {specialty || blueprint.uvp || blueprint.product_type || "Product"}
          </p>
        </div>
        <span
          className="hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide sm:inline-flex"
          style={{
            background: "color-mix(in oklab, var(--pf-accent, var(--alive)) 14%, transparent)",
            color: "var(--pf-accent, var(--alive))",
          }}
        >
          <Sparkles size={12} aria-hidden />
          Made with OMNIA
        </span>
      </header>}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!immersive && <div
            className="shrink-0 border-b px-4 py-3 sm:px-5"
            style={{ borderColor: "var(--pf-border, var(--border))" }}
          >
            <h1
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "var(--pf-font-display, inherit)" }}
            >
              {active?.label || productName}
            </h1>
            <p className="mt-0.5 text-xs" style={{ color: "var(--pf-muted, var(--muted))" }}>
              {activeSpec?.purpose ||
                active?.description ||
                blueprint.daily_workflow ||
                `${blueprint.product_type || "Product"} page`}
            </p>
          </div>}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {showAi ? (
              aiSurface
            ) : (
              <ActionPage
                productName={productName}
                pageLabel={active?.label || pageId}
                pageId={active?.id || pageId}
                spec={activeSpec}
                aiPageId={
                  pages.find((p) => isAiPage(p, specs[p.id]))?.id || pages[0]?.id || ""
                }
                agentId={agentId}
                onAction={onAction}
              />
            )}
          </div>
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-2.5 text-sm shadow-2xl"
          style={{
            borderColor: "var(--pf-border, var(--border))",
            background: "var(--pf-surface, var(--surface-elevated))",
            color: "var(--pf-fg, var(--foreground))",
          }}
        >
          {toast}
        </div>
      ) : null}
    </DesignTokenProvider>
  );
}

function ActionPage({
  productName,
  pageLabel,
  pageId,
  spec,
  aiPageId,
  agentId,
  onAction,
}: {
  productName: string;
  pageLabel: string;
  pageId: string;
  spec?: PageSpec;
  aiPageId: string;
  agentId: string;
  onAction?: (action: string, pageId: string) => void;
}) {
  const actions = Array.isArray(spec?.primary_actions) ? spec.primary_actions : [];

  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-5 overflow-y-auto p-6 sm:p-10">
      <p
        className="max-w-lg text-sm leading-relaxed"
        style={{ color: "var(--pf-muted, var(--muted))" }}
      >
        {spec?.empty_state ||
          `${pageLabel} is part of ${productName}. Use an action below or open the AI workspace.`}
      </p>
      {actions.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <li key={a}>
              <button
                type="button"
                onClick={() => onAction?.(a, pageId)}
                className="min-h-tap rounded-xl px-4 text-sm font-medium transition"
                style={{
                  background:
                    "color-mix(in oklab, var(--pf-accent, var(--alive)) 16%, transparent)",
                  color: "var(--pf-accent, var(--alive))",
                }}
              >
                {a}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {aiPageId ? (
        <Link
          href={`/app/${agentId}/${encodeURIComponent(aiPageId)}`}
          className="text-sm font-semibold underline-offset-4 hover:underline"
          style={{ color: "var(--pf-accent, var(--alive))" }}
        >
          Open AI workspace →
        </Link>
      ) : null}
      {spec?.a11y_notes ? (
        <p className="text-[11px]" style={{ color: "var(--pf-muted, var(--muted))" }}>
          A11y: {spec.a11y_notes}
        </p>
      ) : null}
    </div>
  );
}
