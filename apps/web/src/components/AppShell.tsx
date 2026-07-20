"use client";

import {
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
import { useI18n } from "@/components/I18nProvider";
import { useAppearance } from "@/components/AppearanceProvider";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  clampSidebarWidth,
} from "@/lib/appearance-prefs";

const SIDEBAR_HIDDEN_KEY = "omnia-sidebar-hidden";

const AppSidebar = dynamic(
  () => import("@/components/AppMenu").then((m) => m.AppSidebar),
  { ssr: false }
);

const SidebarToggle = dynamic(
  () => import("@/components/AppMenu").then((m) => m.SidebarToggle),
  {
    ssr: false,
    loading: () => <span className="inline-block min-h-tap min-w-tap" aria-hidden />,
  }
);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  if (pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/auth/callback") {
    return <main id="main" className="h-screen overflow-y-auto bg-field">{children}</main>;
  }
  return <AppShellChrome>{children}</AppShellChrome>;
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
  const close = useCallback(() => setMenuOpen(false), []);
  const toggle = useCallback(() => setMenuOpen((v) => !v), []);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const toggleDesktopSidebar = useCallback(() => {
    setHidden(!sidebarHidden);
  }, [setHidden, sidebarHidden]);

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

  const onResizeStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (collapsed || autoHide || sidebarHidden) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = railWidth;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      setSidebarWidth(clampSidebarWidth(startW + (ev.clientX - startX)));
    };
    const onUp = () => {
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const showDesktopRail = !sidebarHidden && (!autoHide || peekOpen);
  const transitionClass = reduceMotion
    ? ""
    : "transition-[width,transform,opacity] duration-300 ease-spring";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-field">
      <div
        className={`relative hidden lg:flex ${transitionClass}`}
        style={{
          width: sidebarHidden
            ? 0
            : autoHide
              ? peekOpen
                ? railWidth
                : 12
              : railWidth,
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
      >
        {autoHide && !peekOpen && !sidebarHidden && (
          <button
            type="button"
            aria-label={t("shell.showSidebar")}
            className="absolute inset-y-0 left-0 z-[90] w-3 cursor-e-resize bg-transparent hover:bg-accent/20"
            onClick={() => setPeekOpen(true)}
          />
        )}

        {!sidebarHidden && (
          <div
            className={`flex h-full ${transitionClass} ${
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

      <div className="lg:hidden">
        <AppSidebar open={menuOpen} onClose={close} collapsed={false} />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="absolute left-4 top-4 z-50 flex items-center gap-2">
          <div className="lg:hidden">
            <SidebarToggle open={menuOpen} onToggle={toggle} />
          </div>
          {sidebarHidden && (
            <button
              type="button"
              onClick={toggleDesktopSidebar}
              className="app-store-menu-toggle hidden min-h-tap min-w-tap items-center justify-center rounded-xl text-foreground shadow-soft lg:inline-flex"
              aria-expanded={false}
              aria-label={t("shell.showSidebar")}
              title={t("shell.showSidebar")}
            >
              <PanelLeft size={20} strokeWidth={1.5} />
            </button>
          )}
        </div>

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-16 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-alive focus:px-3 focus:py-2 focus:text-on-alive focus:outline-none"
        >
          {t("shell.skip")}
        </a>

        <main id="main" className="app-store-main flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
