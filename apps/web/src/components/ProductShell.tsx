"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DesignTokenProvider, type DesignSystem } from "@/components/DesignTokenProvider";

export type ProductPage = {
  id: string;
  label?: string;
  ai_powered?: boolean;
  description?: string;
};

export type ProductNavItem = {
  id: string;
  label?: string;
};

export type PageSpec = {
  purpose?: string;
  primary_actions?: string[];
  empty_state?: string;
  loading_state?: string;
  error_state?: string;
  a11y_notes?: string;
  ai_powered?: boolean;
};

export type ProductBlueprint = {
  product_type?: string;
  daily_workflow?: string;
  uvp?: string;
  information_architecture?: {
    pages?: ProductPage[];
    nav?: ProductNavItem[];
  };
  design_system?: DesignSystem;
  page_specs?: Record<string, PageSpec>;
};

type Props = {
  blueprint: ProductBlueprint;
  productName: string;
  /** Body rendered on AI-powered pages (chat / DynamicAgentRunner). */
  aiSurface: ReactNode;
  /** Optional header slot above the shell chrome. */
  header?: ReactNode;
};

export function ProductShell({ blueprint, productName, aiSurface, header }: Props) {
  const ia = blueprint.information_architecture || {};
  const pages = useMemo(() => {
    const list = Array.isArray(ia.pages) ? ia.pages : [];
    const byId = new Map(list.map((p) => [p.id, p]));
    const nav = Array.isArray(ia.nav) && ia.nav.length > 0 ? ia.nav : list;
    return nav
      .map((n) => {
        const page = byId.get(n.id) || { id: n.id, label: n.label || n.id };
        return {
          id: page.id,
          label: n.label || page.label || page.id,
          ai_powered: Boolean(page.ai_powered),
          description: page.description || "",
        };
      })
      .filter((p) => p.id);
  }, [ia.pages, ia.nav]);

  const specs = blueprint.page_specs || {};
  const firstAi = pages.find((p) => p.ai_powered)?.id;
  const [activeId, setActiveId] = useState(firstAi || pages[0]?.id || "");

  const active = pages.find((p) => p.id === activeId) || pages[0];
  const activeSpec = active ? specs[active.id] : undefined;
  const isAi =
    Boolean(active?.ai_powered) ||
    Boolean(activeSpec?.ai_powered) ||
    (active && /assistant|chat|coach|lab|prep/i.test(active.id + (active.label || "")));

  const ds = blueprint.design_system;

  return (
    <DesignTokenProvider designSystem={ds} className="flex min-h-[60vh] flex-col overflow-hidden rounded-[1.35rem] lg:min-h-[calc(100vh-14rem)]">
      {header}
      <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
        <nav
          aria-label="Product navigation"
          className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 sm:w-52 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r"
          style={{
            borderColor: "var(--pf-border, color-mix(in oklab, var(--pf-fg, currentColor) 12%, transparent))",
            background: "var(--pf-surface, color-mix(in oklab, var(--pf-bg, transparent) 85%, black))",
          }}
        >
          {pages.map((p) => {
            const on = p.id === active?.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                className="min-h-tap whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-medium transition sm:w-full"
                style={{
                  background: on ? "color-mix(in oklab, var(--pf-accent, #0d9488) 18%, transparent)" : "transparent",
                  color: on ? "var(--pf-accent, inherit)" : "var(--pf-muted, inherit)",
                  fontFamily: "var(--pf-font-display, inherit)",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className="border-b px-4 py-3 sm:px-5"
            style={{
              borderColor: "var(--pf-border, color-mix(in oklab, var(--pf-fg, currentColor) 12%, transparent))",
            }}
          >
            <h2
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "var(--pf-font-display, inherit)" }}
            >
              {active?.label || productName}
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: "var(--pf-muted, inherit)" }}>
              {activeSpec?.purpose ||
                active?.description ||
                blueprint.uvp ||
                blueprint.daily_workflow ||
                `${blueprint.product_type || "Product"} surface`}
            </p>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {isAi ? (
              aiSurface
            ) : (
              <PlaceholderPage
                productName={productName}
                pageLabel={active?.label || activeId}
                spec={activeSpec}
              />
            )}
          </div>
        </div>
      </div>
    </DesignTokenProvider>
  );
}

function PlaceholderPage({
  productName,
  pageLabel,
  spec,
}: {
  productName: string;
  pageLabel: string;
  spec?: PageSpec;
}) {
  const actions = Array.isArray(spec?.primary_actions) ? spec.primary_actions : [];
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-4 p-6 sm:p-8">
      <p className="max-w-md text-sm leading-relaxed" style={{ color: "var(--pf-muted, inherit)" }}>
        {spec?.empty_state ||
          `${pageLabel} is part of ${productName}'s workflow. Connect data or open an AI-powered page to get started.`}
      </p>
      {actions.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <li
              key={a}
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{
                background: "color-mix(in oklab, var(--pf-accent, #0d9488) 12%, transparent)",
                color: "var(--pf-accent, inherit)",
              }}
            >
              {a}
            </li>
          ))}
        </ul>
      ) : null}
      {spec?.a11y_notes ? (
        <p className="text-[11px]" style={{ color: "var(--pf-muted, inherit)" }}>
          A11y: {spec.a11y_notes}
        </p>
      ) : null}
    </div>
  );
}

/** True when blueprint has a multi-page product shell worth rendering. */
export function hasProductShell(blueprint: unknown): blueprint is ProductBlueprint {
  if (!blueprint || typeof blueprint !== "object") return false;
  const ia = (blueprint as ProductBlueprint).information_architecture;
  const pages = ia?.pages;
  const nav = ia?.nav;
  const count = Math.max(
    Array.isArray(pages) ? pages.length : 0,
    Array.isArray(nav) ? nav.length : 0
  );
  return count >= 2;
}
