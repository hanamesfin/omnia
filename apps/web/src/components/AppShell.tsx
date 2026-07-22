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
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { useI18n } from "@/components/I18nProvider";
import { useAppearance } from "@/components/AppearanceProvider";
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

/** Create uses its own studio chrome — exclude the global OMNIA sidebar. */
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
        ) : isCreateStudioPath(pathname) ? (
          children
        ) : (
          <AppShellChrome>{children}</AppShellChrome>
        )}
      </AuthGate>
    </Suspense>
  );
  return gated;
}

function AppShellChrome({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const {
    sidebarLayout,
    sidebarPin,
    sidebarWidth,
    setSidebarWidth,
    reduceMotion,
  } = useAppearance();
  const [menuOpen, setMenuOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  /** Below `lg`: floating hamburger always shown — main needs chrome pad. */
  const [isNarrow, setIsNarrow] = useState(true);
  const close = useCallback(() => setMenuOpen(false), []);
  const toggle = useCallback(() => setMenuOpen((v) => !v), []);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setSidebarHidden(localStorage.getItem(SIDEBAR_HIDDEN_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

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
      if (mq.matches) setMenuOpen(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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

  const showDesktopRail = !sidebarHidden && (!autoHide || peekOpen);
  /**
   * Compact floating PanelLeft — desktop when the rail content is not visible
   * (fully hidden, or auto-hide parked off-screen). Never a full-height control.
   */
  const showDesktopRestore = sidebarHidden || (autoHide && !peekOpen);
  /** Pad main when a floating toggle occupies the top-left (mobile hamburger or desktop restore). */
  const needsChromePad = isNarrow || showDesktopRestore;
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

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-field">
      {/* Invisible auto-hide edge hit-area only — never an icon / visible bar. */}
      {autoHide && !peekOpen && !sidebarHidden && (
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

      {/* Desktop rail — absolute overlay; does not reserve layout width */}
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

      {/* Main stays full-bleed; sidebar draws on top */}
      <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
        {/* Floating chrome — compact ~44×44 top-left only (never full-height).
            Peek hit-area is a separate invisible edge strip above. */}
        <div
          className="pointer-events-none absolute left-0 top-0 z-50 flex h-auto w-auto flex-row items-start justify-start gap-2 p-3 pl-[max(0.75rem,env(safe-area-inset-left,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:p-4 sm:pl-[max(1rem,env(safe-area-inset-left,0px))] sm:pt-[max(1rem,env(safe-area-inset-top,0px))]"
        >
          {!menuOpen && (
            <div className="pointer-events-auto inline-flex h-11 w-11 shrink-0 grow-0 self-start lg:hidden">
              <SidebarToggle open={menuOpen} onToggle={toggle} />
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

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-[var(--shell-chrome-pad)] focus:top-4 focus:z-[60] focus:rounded-full focus:bg-alive focus:px-3 focus:py-2 focus:text-on-alive focus:outline-none"
        >
          {t("shell.skip")}
        </a>

        {/* data-chrome-pad: mobile always; desktop only when PanelLeft restore floats. */}
        <main
          id="main"
          data-chrome-pad={needsChromePad ? "1" : "0"}
          className="app-store-main min-h-0 min-w-0 flex-1 overflow-y-auto"
        >
          {children}
        </main>
      </div>

      {/* Mobile drawer — absolute so the fixed panel never participates in the
          flex row (WebKit can otherwise reserve ~drawer width while closed).
          pointer-events-none here; open backdrop/aside re-enable hits. */}
      <div
        className="pointer-events-none absolute inset-0 z-[80] lg:hidden"
        aria-hidden={!menuOpen}
      >
        <AppSidebar open={menuOpen} onClose={close} collapsed={false} />
      </div>
    </div>
  );
}


