"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DesignTokenProvider, type DesignSystem } from "@/components/DesignTokenProvider";
import { resolveProductDesignSystem } from "@/lib/product-design-defaults";
import { productNavIcon } from "@/lib/product-nav-icon";

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
  secondary_actions?: string[];
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
  problem_worth_solving?: string;
  information_architecture?: {
    pages?: ProductPage[];
    nav?: ProductNavItem[];
  };
  design_system?: DesignSystem;
  page_specs?: Record<string, PageSpec>;
  /** Figma template match from Product Factory ui_codegen */
  figma_template?: {
    id?: string;
    file_key?: string;
    node_id?: string;
    domain?: string;
    fallback_to?: string;
    placeholder?: boolean;
    score?: number;
  };
  /** Vision-codegen TSX artifacts — authoritative product UI when present */
  generated_frontend?: {
    files?: Record<string, string>;
    source?: Record<string, unknown>;
  };
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

  const ds = useMemo(
    () =>
      resolveProductDesignSystem(blueprint.design_system, {
        variant: "standalone",
      }),
    [blueprint.design_system]
  );

  return (
    <DesignTokenProvider
      designSystem={ds}
      className="product-app flex min-h-[60vh] flex-col overflow-hidden rounded-[1.35rem] lg:min-h-[calc(100vh-14rem)]"
    >
      {header}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="product-app-topbar relative flex h-14 shrink-0 items-center justify-center px-5">
          <p
            className="truncate text-[15px] font-medium tracking-[-0.02em]"
            style={{ fontFamily: "var(--pf-font-display, inherit)" }}
          >
            {productName}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-24">
          <div className="flex shrink-0 flex-col items-center px-5 pb-4 pt-1 text-center">
            <h2
              className="product-app-title tracking-[-0.03em]"
              style={{
                fontFamily: "var(--pf-font-display, inherit)",
                fontWeight: 300,
                fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
                lineHeight: 1.2,
              }}
            >
              {active?.label || productName}
            </h2>
            <p
              className="product-app-meta mt-2 max-w-md"
              style={{
                color: "var(--pf-muted, #999)",
                fontFamily: "var(--pf-font-mono, inherit)",
              }}
            >
              {activeSpec?.purpose ||
                active?.description ||
                blueprint.uvp ||
                blueprint.daily_workflow ||
                `${blueprint.product_type || "Product"} surface`}
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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

        <nav
          aria-label="Product navigation"
          className="product-app-bottom-nav pointer-events-none absolute bottom-0 left-0 z-10 flex w-full justify-center px-2.5 pb-4"
        >
          <div className="product-app-nav-pill pointer-events-auto flex max-w-full items-center gap-6 overflow-x-auto p-2">
            {pages.map((p) => {
              const on = p.id === active?.id;
              const Icon = productNavIcon(p.id, String(p.label || p.id));
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className="product-app-nav-item relative flex size-[50px] shrink-0 items-center justify-center rounded-full transition active:scale-90"
                  aria-current={on ? "page" : undefined}
                  title={String(p.label)}
                >
                  {on ? (
                    <span className="product-app-nav-active absolute inset-0 rounded-full" aria-hidden />
                  ) : null}
                  <Icon
                    className="relative z-10"
                    size={16}
                    strokeWidth={1.75}
                    color={on ? "var(--pf-bg, #f4f4f4)" : "rgba(255,255,255,0.95)"}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </nav>
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
    <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-5 pb-4">
      <div className="product-app-card w-full max-w-lg px-6 py-7 text-center">
        <p
          className="text-[13px] leading-snug tracking-[-0.03em]"
          style={{ fontFamily: "var(--pf-font-display, inherit)" }}
        >
          {spec?.empty_state ||
            `${pageLabel} is part of ${productName}'s workflow. Connect data or open an AI-powered page to get started.`}
        </p>
        {actions.length > 0 ? (
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {actions.map((a) => (
              <li key={a} className="product-app-btn-primary rounded-full px-3 py-1.5 text-[12px] font-medium">
                {a}
              </li>
            ))}
          </ul>
        ) : null}
        {spec?.a11y_notes ? (
          <p
            className="mt-4 text-[10px]"
            style={{
              color: "var(--pf-muted, #999)",
              fontFamily: "var(--pf-font-mono, inherit)",
            }}
          >
            A11y: {spec.a11y_notes}
          </p>
        ) : null}
      </div>
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
