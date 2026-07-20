"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_APPEARANCE,
  applyAppearancePrefs,
  clampDensityScale,
  clampFontScale,
  clampSidebarWidth,
  readAppearancePrefs,
  writeAppearancePrefs,
  type AppearancePrefs,
  type FontFamilyId,
  type MessageStyleId,
  type SidebarLayoutId,
  type SidebarPinId,
} from "@/lib/appearance-prefs";

type AppearanceContextValue = AppearancePrefs & {
  setFontScale: (scale: number) => void;
  setFontFamily: (id: FontFamilyId) => void;
  setDensityScale: (scale: number) => void;
  setMessageStyle: (id: MessageStyleId) => void;
  setSidebarLayout: (id: SidebarLayoutId) => void;
  setSidebarPin: (id: SidebarPinId) => void;
  setSidebarWidth: (px: number) => void;
  setReduceMotion: (on: boolean) => void;
  patch: (partial: Partial<AppearancePrefs>) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppearancePrefs>(DEFAULT_APPEARANCE);

  useEffect(() => {
    const stored = readAppearancePrefs();
    setPrefs(stored);
    applyAppearancePrefs(stored);
  }, []);

  const patch = useCallback((partial: Partial<AppearancePrefs>) => {
    setPrefs((prev) => {
      const next: AppearancePrefs = {
        ...prev,
        ...partial,
        fontScale: clampFontScale(
          partial.fontScale !== undefined ? partial.fontScale : prev.fontScale
        ),
        densityScale: clampDensityScale(
          partial.densityScale !== undefined ? partial.densityScale : prev.densityScale
        ),
        sidebarWidth: clampSidebarWidth(
          partial.sidebarWidth !== undefined ? partial.sidebarWidth : prev.sidebarWidth
        ),
      };
      applyAppearancePrefs(next);
      writeAppearancePrefs(next);
      return next;
    });
  }, []);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      ...prefs,
      setFontScale: (fontScale) => patch({ fontScale }),
      setFontFamily: (fontFamily) => patch({ fontFamily }),
      setDensityScale: (densityScale) => patch({ densityScale }),
      setMessageStyle: (messageStyle) => patch({ messageStyle }),
      setSidebarLayout: (sidebarLayout) => patch({ sidebarLayout }),
      setSidebarPin: (sidebarPin) => patch({ sidebarPin }),
      setSidebarWidth: (sidebarWidth) => patch({ sidebarWidth }),
      setReduceMotion: (reduceMotion) => patch({ reduceMotion }),
      patch,
    }),
    [prefs, patch]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used within AppearanceProvider");
  return ctx;
}
