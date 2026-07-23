"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { useI18n } from "@/components/I18nProvider";
import { useAppearance } from "@/components/AppearanceProvider";
import {
  ShellMenuDockProvider,
  useShellMenuDock,
} from "@/components/ShellMenuDock";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  clampSidebarWidth,
} from "@/lib/appearance-prefs";
import { isPublicPath } from "@/lib/auth-session";

/** Persisted closed desktop rail — survives refresh. */
const SIDEBAR_HIDDEN_KEY = "omnia-sidebar-hidden";

const AppSidebar = dynamic(
  () => import("@/components/AppMenu").then((m) => m.AppSidebar),
  { ssr: false }
);

const SidebarToggle = dynamic(
  () => import("@/components/AppMenu").then((m) => m.SidebarToggle),
  {
    ssr: false,
    loading: () => (
      <span className="inline-block h-11 w-11 min-h-tap min-w-tap shrink-0" aria-hidden />
    ),
  }
);

/** Auth forms + landing gate: no hamburger / sidebar chrome (OM–03). */
function isGateChromePath(pathname: string) {
  return isPublicPath(pathname);
}

/** Create keeps its step rail; OMNIA menu is overlay-only (no push rail). */
function isCreateStudioPath(pathname: string) {
  return pathname === "/create" || pathname.startsWith("/create/");
}

/**
 * Live product agents (`/app/...`) are blank-canvas apps:
 * AuthGate only — no OMNIA sidebar, hamburger, or Discover/Create/Yours chrome.
 */
function isProductAppPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const gated = (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-field" aria-busy="true" />
      }
    >
      <AuthGate>
        {isGateChromePath(pathname) || isProductAppPath(pathname) ? (
          <main
            id="main"
            className={
              isProductAppPath(pathname)
                ? "h-dvh min-h-0 w-full overflow-hidden"
                : "h-screen overflow-y-auto bg-field"
            }
          >
            {children}
          </main>
        ) : (
          <AppShellChrome overlayMenuOnly={isCreateStudioPath(pathname)}>
            {children}
          </AppShellChrome>
        )}
      </AuthGate>
    </Suspense>
  );
  return gated;
}

/**
 * Main app chrome:
 * - Desktop (`lg+`): **push** sidebar — width animates to 0; main reflows to fill.
 * - Mobile / Create: overlay drawer (hamburger).
 * - Menu symbol docks into page content via ShellMenuAnchor when present.
 */
function AppShellChrome({
  children,
  overlayMenuOnly = false,
}: {
  children: ReactNode;
  overlayMenuOnly?: boolean;
}) {
  return (
    <ShellMenuDockProvider>
      <AppShellChromeInner overlayMenuOnly={overlayMenuOnly}>
        {children}
      </AppShellChromeInner>
    </ShellMenuDockProvider>
  );
}

function AppShellChromeInner({
  children,
  overlayMenuOnly,
}: {
  children: ReactNode;
  overlayMenuOnly: boolean;
}) {
  const pathname = usePathname() || "";
  const { t } = useI18n();
  const {
    sidebarLayout,
    sidebarPin,
    sidebarWidth,
    setSidebarWidth,
    reduceMotion,
  } = useAppearance();
  const { dockEl } = useShellMenuDock();
  const sidebarDomId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  /** Desktop push rail closed (persisted). */
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [isNarrow, setIsNarrow] = useState(true);
  const close = useCallback(() => setMenuOpen(false), []);
  const toggleMobile = useCallback(() => setMenuOpen((v) => !v), []);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const menuDocked = Boolean(dockEl);

  useEffect(() => {
    try {
      setSidebarHidden(localStorage.getItem(SIDEBAR_HIDDEN_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const setHidden = useCallback((hidden: boolean) => {
    setSidebarHidden(hidden);
    try {
      localStorage.setItem(SIDEBAR_HIDDEN_KEY, hidden ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const collapsed = sidebarLayout === "collapsed";
  const autoHide = sidebarPin === "auto-hide" && !sidebarHidden;
  const railWidth = collapsed
    ? SIDEBAR_COLLAPSED_WIDTH
    : clampSidebarWidth(sidebarWidth);

  const clearHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const scheduleHide = () => {
    clearHide();
    hideTimer.current = setTimeout(() => setPeekOpen(false), 280);
  };

  useEffect(() => () => clearHide(), []);

  useEffect(() => {
    if (!autoHide) setPeekOpen(false);
  }, [autoHide]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      setIsNarrow(!mq.matches);
      if (mq.matches && !overlayMenuOnly) setMenuOpen(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [overlayMenuOnly]);

  const onResizeStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (collapsed || autoHide || sidebarHidden) return;
    e.preventDefault();
    const target = e.currentTarget;
    const startX = e.clientX;
    const startW = railWidth;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const onMove = (ev: PointerEvent) => {
      setSidebarWidth(clampSidebarWidth(startW + (ev.clientX - startX)));
    };
    const onUp = (ev: PointerEvent) => {
      document.body.style.userSelect = prevUserSelect;
      try {
        target.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  /**
   * Desktop push open: rail participates in flex width.
   * Auto-hide parks at width 0 until peek; pinned uses sidebarHidden.
   */
  const desktopRailOpen =
    !overlayMenuOnly && !sidebarHidden && (!autoHide || peekOpen);
  const showDesktopRestore =
    !overlayMenuOnly && (sidebarHidden || (autoHide && !peekOpen));

  /** Closed push rail: skip keyboard tab into hidden links. */
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    el.inert = !desktopRailOpen;
  }, [desktopRailOpen]);

  const needsChromePad =
    !menuDocked && (overlayMenuOnly || isNarrow || showDesktopRestore);
  const showMenuSymbol = overlayMenuOnly
    ? !menuOpen
    : (isNarrow && !menuOpen) || showDesktopRestore;
  const transitionClass = reduceMotion
    ? ""
    : "transition-[width] duration-300 ease-spring";

  const revealDesktopSidebar = useCallback(() => {
    if (sidebarHidden) {
      setHidden(false);
      if (sidebarPin === "auto-hide") {
        clearHide();
        setPeekOpen(true);
      }
      return;
    }
    if (autoHide) {
      clearHide();
      setPeekOpen(true);
    }
  }, [autoHide, setHidden, sidebarHidden, sidebarPin]);

  const toggleDesktop = useCallback(() => {
    if (desktopRailOpen) {
      if (autoHide) {
        setPeekOpen(false);
        return;
      }
      setHidden(true);
      return;
    }
    revealDesktopSidebar();
  }, [autoHide, desktopRailOpen, revealDesktopSidebar, setHidden]);

  const menuSymbol = showMenuSymbol ? (
    <div
      className={
        menuDocked
          ? "pointer-events-none flex h-auto w-auto flex-row items-start justify-start gap-2"
          : "pointer-events-none absolute left-0 top-0 z-50 flex h-auto w-auto flex-row items-start justify-start gap-2 p-3 pl-[max(0.75rem,env(safe-area-inset-left,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:p-4 sm:pl-[max(1rem,env(safe-area-inset-left,0px))] sm:pt-[max(1rem,env(safe-area-inset-top,0px))]"
      }
    >
      {(overlayMenuOnly || (isNarrow && !menuOpen)) && (
        <div
          className={`pointer-events-auto inline-flex h-11 w-11 shrink-0 grow-0 self-start ${
            overlayMenuOnly ? "" : "lg:hidden"
          }`}
        >
          <SidebarToggle
            open={menuOpen}
            onToggle={toggleMobile}
            controlsId={sidebarDomId}
            alwaysVisible={overlayMenuOnly}
          />
        </div>
      )}
      {showDesktopRestore && (
        <button
          type="button"
          onClick={toggleDesktop}
          className="app-store-menu-toggle pointer-events-auto hidden h-11 w-11 min-h-tap min-w-tap max-h-11 max-w-11 shrink-0 grow-0 basis-11 items-center justify-center self-start rounded-xl text-foreground shadow-soft lg:inline-flex"
          aria-expanded={desktopRailOpen}
          aria-controls={sidebarDomId}
          aria-label={t("shell.showSidebar")}
          title={t("shell.showSidebar")}
        >
          <PanelLeft size={20} strokeWidth={1.5} className="pointer-events-none h-5 w-5 shrink-0" aria-hidden />
        </button>
      )}
    </div>
  ) : null;

  return (
    <div
      className="app-shell relative isolate flex h-dvh w-full overflow-hidden bg-field"
      data-shell="push"
      data-shell-overlay-menu={overlayMenuOnly ? "1" : undefined}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-[var(--shell-chrome-pad)] focus:top-4 focus:z-[60] focus:rounded-full focus:bg-alive focus:px-3 focus:py-2 focus:text-on-alive focus:outline-none"
      >
        {t("shell.skip")}
      </a>

      {/* Desktop push rail — width → 0 collapses; main flexes to fill */}
      {!overlayMenuOnly && (
        <div
          ref={railRef}
          id={sidebarDomId}
          className={`relative hidden h-full min-h-0 shrink-0 overflow-hidden lg:flex ${transitionClass}`}
          style={{ width: desktopRailOpen ? railWidth : 0 }}
          aria-hidden={!desktopRailOpen}
          onMouseEnter={() => {
            if (autoHide) {
              clearHide();
              setPeekOpen(true);
            }
          }}
          onMouseLeave={() => {
            if (autoHide) scheduleHide();
          }}
          onFocusCapture={() => {
            if (autoHide) {
              clearHide();
              setPeekOpen(true);
            }
          }}
          onBlurCapture={(e) => {
            if (!autoHide) return;
            const next = e.relatedTarget as Node | null;
            if (next && railRef.current?.contains(next)) return;
            scheduleHide();
          }}
        >
          {/* Fixed inner width so content doesn’t squash while the host animates */}
          <div
            className="relative flex h-full min-h-0 shrink-0"
            style={{ width: railWidth }}
          >
            {!sidebarHidden && (
              <AppSidebar
                open
                persistent
                collapsed={collapsed}
                widthPx={railWidth}
                onClose={close}
                onHide={() => setHidden(true)}
              />
            )}
            {!collapsed && !autoHide && !sidebarHidden && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize sidebar"
                tabIndex={desktopRailOpen ? 0 : -1}
                onPointerDown={onResizeStart}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") setSidebarWidth(clampSidebarWidth(sidebarWidth - 8));
                  if (e.key === "ArrowRight") setSidebarWidth(clampSidebarWidth(sidebarWidth + 8));
                }}
                className="absolute inset-y-0 right-0 z-[5] w-1.5 cursor-col-resize touch-none hover:bg-accent/25 active:bg-accent/40"
              />
            )}
          </div>
        </div>
      )}

      {/* Invisible auto-hide edge — reveal push rail without a visible bar */}
      {!overlayMenuOnly && autoHide && !peekOpen && !sidebarHidden && (
        <div
          role="presentation"
          aria-hidden
          className="app-shell-peek-edge absolute inset-y-0 left-0 z-[90] hidden lg:block"
          onMouseEnter={() => {
            clearHide();
            setPeekOpen(true);
          }}
        />
      )}

      {/* Main column — grows when sidebar width is 0 */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <main
          id="main"
          data-chrome-pad={needsChromePad ? "1" : "0"}
          className="app-store-main min-h-0 min-w-0 flex-1 overflow-y-auto"
        >
          {children}
        </main>

        {menuSymbol &&
          (menuDocked && dockEl
            ? createPortal(menuSymbol, dockEl)
            : !menuDocked
              ? menuSymbol
              : null)}
      </div>

      {/* Mobile / Create overlay drawer */}
      <div
        className={
          overlayMenuOnly
            ? "pointer-events-none absolute inset-0 z-[80]"
            : "pointer-events-none absolute inset-0 z-[80] lg:hidden"
        }
        aria-hidden={!menuOpen}
      >
        <AppSidebar open={menuOpen} onClose={close} collapsed={false} />
      </div>
    </div>
  );
}
