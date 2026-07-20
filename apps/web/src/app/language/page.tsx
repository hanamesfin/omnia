"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Languages, Loader2 } from "lucide-react";
import { LOCALES, useI18n } from "@/components/I18nProvider";
import type { LocaleId } from "@/lib/i18n";
import {
  isAutoDetectInputLanguage,
  setAutoDetectInputLanguage,
} from "@/lib/input-language-prefs";
import { fetchApi } from "@/lib/api";

export default function LanguagePage() {
  const { locale, setLocale, t } = useI18n();
  const [flash, setFlash] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [gtConfigured, setGtConfigured] = useState<boolean | null>(null);
  const [gtHint, setGtHint] = useState<string | null>(null);
  const [srcText, setSrcText] = useState("");
  const [target, setTarget] = useState<LocaleId>(locale);
  const [outText, setOutText] = useState("");
  const [detected, setDetected] = useState("");
  const [busy, setBusy] = useState(false);
  const [gtError, setGtError] = useState<string | null>(null);
  const current = LOCALES.find((l) => l.id === locale) || LOCALES[0];

  useEffect(() => {
    setAutoDetect(isAutoDetectInputLanguage());
  }, []);

  useEffect(() => {
    setTarget(locale);
  }, [locale]);

  useEffect(() => {
    fetchApi("/translate/status")
      .then((res) => {
        setGtConfigured(!!res.configured);
        setGtHint(res.hint || null);
      })
      .catch(() => {
        setGtConfigured(false);
        setGtHint("Could not reach translate status");
      });
  }, []);

  const pick = (id: LocaleId) => {
    setLocale(id);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 2200);
  };

  const runTranslate = async () => {
    if (!srcText.trim() || busy) return;
    setBusy(true);
    setGtError(null);
    try {
      const res = await fetchApi("/translate", {
        method: "POST",
        body: JSON.stringify({ text: srcText, target }),
      });
      setOutText(String(res.translated_text || ""));
      setDetected(String(res.detected_source_language || ""));
    } catch (e) {
      setGtError(e instanceof Error ? e.message : "Translate failed");
      setOutText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-alive">{t("lang.eyebrow")}</p>
      <h1 className="mt-2 flex items-center gap-3 font-display text-display-lg">
        <Languages className="text-alive" size={28} aria-hidden />
        {t("lang.title")}
      </h1>
      <p className="mt-3 max-w-xl text-muted">{t("lang.lead")}</p>

      <div className="mt-6 rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm">
        <span className="text-muted">{t("lang.current")}: </span>
        <span className="font-medium text-foreground">
          {current.native} · {current.label}
        </span>
        {flash && <span className="ms-3 text-alive">{t("lang.saved")}</span>}
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-surface/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Auto-detect input language</h2>
            <p className="mt-1 text-sm text-muted">
              Sense which language you type or dictate per message — no manual switching needed.
              Voice mic language follows your text automatically.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoDetect}
            onClick={() => {
              const next = !autoDetect;
              setAutoDetect(next);
              setAutoDetectInputLanguage(next);
            }}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              autoDetect ? "bg-alive" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                autoDetect ? "left-[1.35rem]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="mt-6 space-y-3 rounded-2xl border border-border bg-surface/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Google Translate</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              gtConfigured ? "bg-alive/15 text-alive" : "bg-border/60 text-muted"
            }`}
          >
            {gtConfigured == null ? "Checking…" : gtConfigured ? "Connected" : "Not configured"}
          </span>
        </div>
        <p className="text-sm text-muted">
          Translate any text with Google Cloud Translation. Agents can also call the{" "}
          <code className="text-xs">translate</code> tool when it&apos;s attached.
        </p>
        {!gtConfigured && gtHint ? (
          <p className="rounded-xl bg-background/70 px-3 py-2 text-xs text-muted ring-1 ring-border">
            {gtHint}
          </p>
        ) : null}
        <label className="block text-xs text-muted" htmlFor="gt-source">
          Source text
        </label>
        <textarea
          id="gt-source"
          value={srcText}
          onChange={(e) => setSrcText(e.target.value)}
          rows={4}
          placeholder="Paste text to translate…"
          className="field-input w-full resize-y"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-muted" htmlFor="gt-target">
            Target
          </label>
          <select
            id="gt-target"
            value={target}
            onChange={(e) => setTarget(e.target.value as LocaleId)}
            className="field-input max-w-[12rem]"
          >
            {LOCALES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.native} ({l.id})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !srcText.trim() || gtConfigured === false}
            onClick={() => void runTranslate()}
            className="inline-flex min-h-tap items-center gap-2 rounded-full bg-alive px-5 text-sm font-semibold text-on-alive disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
            Translate
          </button>
        </div>
        {gtError ? <p className="text-sm text-red-500">{gtError}</p> : null}
        {outText ? (
          <div className="rounded-xl bg-background/80 p-3 text-sm ring-1 ring-border">
            {detected ? (
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">
                Detected: {detected} → {target}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap">{outText}</p>
          </div>
        ) : null}
      </section>

      <ul className="mt-8 grid gap-2 sm:grid-cols-2">
        {LOCALES.map((l) => {
          const selected = l.id === locale;
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => pick(l.id)}
                aria-pressed={selected}
                className={`flex min-h-tap w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start transition ${
                  selected
                    ? "border-alive/50 bg-alive/10 ring-1 ring-alive/35"
                    : "border-border bg-background/50 hover:border-foreground/20"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{l.native}</span>
                  <span className="mt-0.5 block text-[12px] text-muted">{l.label}</span>
                </span>
                {selected && <Check size={18} className="shrink-0 text-alive" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-sm text-muted">{t("lang.voiceNote")}</p>
      <Link href="/" className="mt-8 inline-block text-alive hover:underline">
        {t("common.backHome")}
      </Link>
    </div>
  );
}
