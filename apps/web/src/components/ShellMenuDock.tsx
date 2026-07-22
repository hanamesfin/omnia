"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ShellMenuDockContextValue = {
  /** Page-owned portal target for the shell menu symbol (content column). */
  dockEl: HTMLElement | null;
  setDockEl: (el: HTMLElement | null) => void;
};

const ShellMenuDockContext = createContext<ShellMenuDockContextValue | null>(null);

export function ShellMenuDockProvider({ children }: { children: ReactNode }) {
  const [dockEl, setDockElState] = useState<HTMLElement | null>(null);
  const setDockEl = useCallback((el: HTMLElement | null) => {
    setDockElState(el);
  }, []);
  const value = useMemo(() => ({ dockEl, setDockEl }), [dockEl, setDockEl]);
  return (
    <ShellMenuDockContext.Provider value={value}>{children}</ShellMenuDockContext.Provider>
  );
}

export function useShellMenuDock() {
  const ctx = useContext(ShellMenuDockContext);
  if (!ctx) {
    throw new Error("useShellMenuDock must be used within ShellMenuDockProvider");
  }
  return ctx;
}

/**
 * Portal target inside a page `max-w-*` content column (Discover, Yours, …)
 * or Create studio header. AppShell docks the hamburger / PanelLeft here so
 * it shares page padding instead of floating at the viewport/shell edge.
 */
export function ShellMenuAnchor({
  className = "pointer-events-none relative z-50 flex w-fit max-w-full flex-row items-start justify-start gap-2 [&:not(:empty)]:mb-4",
}: {
  className?: string;
} = {}) {
  const { setDockEl } = useShellMenuDock();
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      setDockEl(node);
    },
    [setDockEl]
  );

  return (
    <div
      ref={ref}
      data-shell-menu-dock=""
      className={className}
    />
  );
}
