"use client";

import {
  Suspense,
  useCallback,
  useEffect,
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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const gated = (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-field" aria-busy="true" />
      }
    >
      <AuthGate>
        {isGateChromePath(pathname) ? (
          <main id="main" className="h-screen overflow-y-auto bg-field">
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
 * Single overlay shell: one relative host, stacked layers.
 * - Main is always absolute inset-0 (full-bleed) — never a flex sibling that
 *   shrinks for a sidebar column.
 * - Menu symbol (hamburger / PanelLeft) floats over main top-left by default,
 *   or portals into a page dock (Discover / Yours / Create content column).
 * - Desktop rail + mobile drawer are absolute/fixed overlays on the same host.
 * - `overlayMenuOnly` (Create): hamburger + drawer at all breakpoints; no push rail.
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  /** Below `lg`: floating hamburger always shown — main needs chrome pad when undocked. */
  const [isNarrow, setIsNarrow] = useState(true);
  const close = useCallback(() => setMenuOpen(false), []);
  const toggle = useCallback(() => setMenuOpen((v) => !v), []);
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

  /** Track `lg` breakpoint: close drawer on desktop; drive chrome pad on mobile. */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      setIsNarrow(!mq.matches);
      // Create overlay menu stays available on desktop — don't force-close on widen.
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

  const showDesktopRail =
    !overlayMenuOnly && !sidebarHidden && (!autoHide || peekOpen);
  /**
   * Compact floating PanelLeft — desktop when the rail content is not visible
   * (fully hidden, or auto-hide parked off-screen). Never a full-height control.
   */
  const showDesktopRestore =
    !overlayMenuOnly && (sidebarHidden || (autoHide && !peekOpen));
  /**
   * Pad main only when a viewport-floating toggle occupies the shell top-left.
   * When a page docks the symbol into its content column (Discover, Yours, Create),
   * skip left chrome-pad so we don’t double-offset beside max-w-* padding.
   */
  const needsChromePad =
    !menuDocked && (overlayMenuOnly || isNarrow || showDesktopRestore);
  const showMenuSymbol = overlayMenuOnly
    ? !menuOpen
    : (isNarrow && !menuOpen) || showDesktopRestore;
  const transitionClass = reduceMotion
    ? ""
    : "transition-[width,transform,opacity] duration-300 ease-spring";

  const revealDesktopSidebar = useCallback(() => {
    if (sidebarHidden) {
      setHidden(false);
      // If pin is auto-hide, also peek so the rail actually appears.
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
            onToggle={toggle}
            alwaysVisible={overlayMenuOnly}
          />
        </div>
      )}
      {showDesktopRestore && (
        <button
          type="button"
          onClick={revealDesktopSidebar}
          className="app-store-menu-toggle pointer-events-auto hidden h-11 w-11 min-h-tap min-w-tap max-h-11 max-w-11 shrink-0 grow-0 basis-11 items-center justify-center self-start rounded-xl text-foreground shadow-soft lg:inline-flex"
          aria-expanded={false}
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
      className="app-shell relative isolate h-dvh w-full overflow-hidden bg-field"
      data-shell="overlay"
      data-shell-overlay-menu={overlayMenuOnly ? "1" : undefined}
    >
      {/* Layer 0 — full-bleed main (never reserves sidebar width) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-[var(--shell-chrome-pad)] focus:top-4 focus:z-[60] focus:rounded-full focus:bg-alive focus:px-3 focus:py-2 focus:text-on-alive focus:outline-none"
      >
        {t("shell.skip")}
      </a>
      <main
        id="main"
        data-chrome-pad={needsChromePad ? "1" : "0"}
        className="app-store-main absolute inset-0 min-h-0 min-w-0 overflow-y-auto"
      >
        {children}
      </main>

      {/* Layer 1 — menu symbol: docked into page chrome, else floats over main */}
      {menuSymbol &&
        (menuDocked && dockEl
          ? createPortal(menuSymbol, dockEl)
          : !menuDocked
            ? menuSymbol
            : null)}

      {/* Invisible auto-hide edge hit-area only — never an icon / visible bar. */}
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

      {/* Layer 2 — desktop rail overlay (does not participate in layout width) */}
      {!overlayMenuOnly && (
        <div
          ref={railRef}
          className={`absolute inset-y-0 left-0 z-[80] hidden h-full min-h-0 overflow-hidden lg:flex ${transitionClass} ${
            showDesktopRail ? "pointer-events-auto" : "pointer-events-none"
          }`}
          style={{
            width: showDesktopRail ? railWidth : 0,
          }}
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
          {!sidebarHidden && (
            <div
              className={`flex h-full min-h-0 ${transitionClass} ${
                showDesktopRail ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              style={{
                width: railWidth,
                transform: autoHide && !peekOpen ? "translateX(-100%)" : "translateX(0)",
              }}
            >
              <AppSidebar
                open
                persistent
                collapsed={collapsed}
                widthPx={railWidth}
                onClose={close}
                onHide={() => setHidden(true)}
              />
            </div>
          )}

          {!collapsed && !autoHide && !sidebarHidden && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              tabIndex={0}
              onPointerDown={onResizeStart}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") setSidebarWidth(clampSidebarWidth(sidebarWidth - 8));
                if (e.key === "ArrowRight") setSidebarWidth(clampSidebarWidth(sidebarWidth + 8));
              }}
              className="absolute inset-y-0 right-0 z-[85] w-1.5 cursor-col-resize touch-none hover:bg-accent/25 active:bg-accent/40"
            />
          )}
        </div>
      )}

      {/* Layer 3 — overlay drawer; on Create available at all breakpoints */}
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
