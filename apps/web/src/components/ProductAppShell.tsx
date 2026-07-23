"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { DesignTokenProvider } from "@/components/DesignTokenProvider";
import {
  hasProductShell,
  type PageSpec,
  type ProductBlueprint,
  type ProductPage,
} from "@/components/ProductShell";
import { CollectionsProductSurface } from "@/components/collections/CollectionsProductSurface";
import {
  isCollectionsContentPage,
  isCollectionsProduct,
} from "@/components/collections/is-collections-product";
import { resolveProductDesignSystem } from "@/lib/product-design-defaults";
import { productNavIcon } from "@/lib/product-nav-icon";

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
  return /assistant|chat|coach|lab|prep|workspace|draft|curator/i.test(
    `${page.id} ${page.label || ""}`
  );
}

export function firstProductPageId(blueprint: ProductBlueprint | null | undefined): string {
  if (!blueprint || !hasProductShell(blueprint)) return "";
  const pages = resolvePages(blueprint);
  if (isCollectionsProduct(blueprint)) {
    const home = pages.find((p) => /home|feed|trove/i.test(p.id));
    if (home) return home.id;
  }
  const firstAi = pages.find((p) =>
    isAiPage(p, blueprint.page_specs?.[p.id])
  );
  return firstAi?.id || pages[0]?.id || "";
}

/**
 * Blank-canvas product shell — Collections App (Figma Make) chrome.
 * No OMNIA sidebar / hamburger / “Made with OMNIA”.
 * Centered top brand, soft gray canvas, floating frosted bottom pill nav.
 */
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
  const collectionsMode = isCollectionsProduct(blueprint);
  const collectionsPage =
    collectionsMode && !showAi && isCollectionsContentPage(active?.id || pageId);
  const ds = useMemo(
    () => resolveProductDesignSystem(blueprint.design_system),
    [blueprint.design_system]
  );
  const showProductNav = pages.length > 1;
  const metaLine = specialty || blueprint.uvp || blueprint.product_type || "";
  const [navVisible, setNavVisible] = useState(true);
  const hideChromeHeader = immersive || collectionsPage;

  useEffect(() => {
    setNavVisible(true);
  }, [pageId]);

  return (
    <DesignTokenProvider
      designSystem={ds}
      className="product-app flex h-dvh min-h-0 w-full flex-col overflow-hidden"
      style={
        {
          paddingTop: "env(safe-area-inset-top, 0px)",
        } as CSSProperties
      }
    >
      {/* Collections TopBar: centered brand mark */}
      <header className="product-app-topbar relative flex h-16 shrink-0 items-center px-5 pt-5">
        <Link
          href={
            agentId === "demo"
              ? "/explore"
              : `/yours/${encodeURIComponent(agentId)}`
          }
          className="product-app-manage relative z-10 text-[10px] font-medium tracking-wide opacity-50 transition hover:opacity-100"
          style={{
            color: "var(--pf-muted, #999)",
            fontFamily: "var(--pf-font-mono, var(--pf-font-body))",
          }}
          title={agentId === "demo" ? "Back to Discover" : "Manage in OMNIA"}
        >
          {agentId === "demo" ? "Exit" : "Manage"}
        </Link>

        <div className="absolute left-1/2 top-4 -translate-x-1/2">
          <p
            className="max-w-[14rem] truncate text-center text-[15px] font-medium tracking-[-0.02em] sm:max-w-xs"
            style={{
              fontFamily: "var(--pf-font-display, inherit)",
              color: "var(--pf-fg, #000)",
              lineHeight: 1.1,
            }}
          >
            {productName}
          </p>
        </div>
      </header>

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
          showProductNav && navVisible ? "pb-[7.5rem]" : ""
        }`}
      >
        {!hideChromeHeader && active ? (
          <div className="flex shrink-0 flex-col items-center px-5 pb-5 pt-2.5 text-center">
            <div className="flex items-baseline justify-center gap-2.5">
              <h1
                className="product-app-title tracking-[-0.03em]"
                style={{
                  fontFamily: "var(--pf-font-display, inherit)",
                  color: "var(--pf-fg, #000)",
                  fontWeight: 300,
                  lineHeight: 1.2,
                }}
              >
                {active.label || productName}
              </h1>
            </div>
            {(activeSpec?.purpose || active.description || metaLine) && (
              <p
                className="product-app-meta mt-3 max-w-md tracking-[-0.02em]"
                style={{
                  color: "var(--pf-muted, #999)",
                  fontFamily: "var(--pf-font-mono, inherit)",
                }}
              >
                {activeSpec?.purpose || active.description || metaLine}
              </p>
            )}
          </div>
        ) : null}

        <div className="product-app-scroll flex min-h-0 flex-1 flex-col overflow-hidden">
          {showAi ? (
            aiSurface
          ) : collectionsPage ? (
            <CollectionsProductSurface
              agentId={agentId}
              pageId={active?.id || pageId}
              onNavVisibilityChange={setNavVisible}
            />
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

      {showProductNav && navVisible ? (
        <nav
          aria-label={`${productName} navigation`}
          className="product-app-bottom-nav pointer-events-none absolute bottom-0 left-0 z-40 flex w-full justify-center px-2.5 pb-[max(34px,env(safe-area-inset-bottom,0px))]"
        >
          <div className="product-app-nav-pill pointer-events-auto flex items-center gap-6 p-2">
            {pages.map((p) => {
              const selected = p.id === (active?.id || pageId);
              const Icon = productNavIcon(p.id, p.label);
              return (
                <Link
                  key={p.id}
                  href={`/app/${encodeURIComponent(agentId)}/${encodeURIComponent(p.id)}`}
                  className="product-app-nav-item relative flex size-[50px] items-center justify-center rounded-full transition active:scale-90"
                  aria-label={p.label}
                  aria-current={selected ? "page" : undefined}
                  title={p.label}
                >
                  {selected ? (
                    <span className="product-app-nav-active absolute inset-0 rounded-full" aria-hidden />
                  ) : null}
                  <Icon
                    className="relative z-10"
                    size={16}
                    strokeWidth={1.75}
                    color={selected ? "var(--pf-bg, #f4f4f4)" : "rgba(255,255,255,0.95)"}
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="product-app-toast fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-2.5 shadow-2xl"
          style={{
            borderColor: "var(--pf-border, rgba(0,0,0,0.1))",
            background: "var(--pf-surface, #fff)",
            color: "var(--pf-fg, #000)",
            fontFamily: "var(--pf-font-mono, inherit)",
            fontSize: "12px",
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
    <div className="flex flex-1 flex-col items-center gap-5 overflow-y-auto px-5 pb-8 pt-2">
      <div className="product-app-card w-full max-w-lg px-6 pb-6 pt-7 text-center">
        <p
          className="text-[13px] leading-snug tracking-[-0.03em]"
          style={{
            color: "var(--pf-fg, #000)",
            fontFamily: "var(--pf-font-display, inherit)",
          }}
        >
          {spec?.empty_state ||
            `${pageLabel} is part of ${productName}. Use an action below or open the AI workspace.`}
        </p>
        {actions.length > 0 ? (
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {actions.map((a) => (
              <li key={a}>
                <button
                  type="button"
                  onClick={() => onAction?.(a, pageId)}
                  className="product-app-btn-primary min-h-tap rounded-full px-4 text-[12px] font-medium transition active:scale-95"
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
            className="mt-5 inline-block text-[12px] tracking-[-0.02em] underline-offset-4 hover:underline"
            style={{
              color: "var(--pf-muted, #999)",
              fontFamily: "var(--pf-font-mono, inherit)",
            }}
          >
            Open AI workspace →
          </Link>
        ) : null}
      </div>
      {spec?.a11y_notes ? (
        <p
          className="text-[10px]"
          style={{
            color: "var(--pf-muted, #999)",
            fontFamily: "var(--pf-font-mono, inherit)",
          }}
        >
          A11y: {spec.a11y_notes}
        </p>
      ) : null}
    </div>
  );
}
