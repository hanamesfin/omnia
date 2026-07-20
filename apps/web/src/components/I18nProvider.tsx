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
  LOCALE_STORAGE_KEY,
  LOCALES,
  detectBrowserLocale,
  getLocaleMeta,
  isLocaleId,
  translate,
  type LocaleId,
} from "@/lib/i18n";
import { setStoredSpeechLang } from "@/lib/speech-langs";

type I18nCtx = {
  locale: LocaleId;
  setLocale: (id: LocaleId) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocaleId(stored)) {
        setLocaleState(stored);
        return;
      }
    } catch {
      /* ignore */
    }
    setLocaleState(detectBrowserLocale());
  }, []);

  useEffect(() => {
    const meta = getLocaleMeta(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = meta.dir;
  }, [locale]);

  const setLocale = useCallback((id: LocaleId) => {
    setLocaleState(id);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    const meta = getLocaleMeta(id);
    setStoredSpeechLang(meta.speech);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("omnia-locale", { detail: { locale: id, speech: meta.speech } })
      );
    }
  }, []);

  const value = useMemo<I18nCtx>(() => {
    const meta = getLocaleMeta(locale);
    return {
      locale,
      setLocale,
      t: (key: string) => translate(locale, key),
      dir: meta.dir,
    };
  }, [locale, setLocale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export { LOCALES };
