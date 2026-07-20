"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Palette } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { THEMES, type ThemeId } from "@/lib/themes";

export function AppearanceMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const core = THEMES.filter((t) => t.group === "core");
  const atmospheres = THEMES.filter((t) => t.group === "atmospheres");

  const pick = (id: ThemeId) => {
    setTheme(id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-tap min-w-tap items-center justify-center gap-2 rounded-md px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
        title="Appearance"
      >
        <Palette size={18} aria-hidden />
        <span className="hidden sm:inline">Appearance</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="dialog"
          aria-label="Appearance themes"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-2rem,20rem)] rounded-2xl border border-border bg-surface-elevated p-3 shadow-2xl shadow-black/40"
        >
          <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Core
          </p>
          <div className="grid grid-cols-2 gap-2">
            {core.map((t) => (
              <ThemeOption
                key={t.id}
                id={t.id}
                label={t.label}
                swatches={t.swatches}
                selected={theme === t.id}
                onSelect={pick}
              />
            ))}
          </div>

          <p className="mt-3 px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Atmospheres
          </p>
          <div className="grid grid-cols-2 gap-2">
            {atmospheres.map((t) => (
              <ThemeOption
                key={t.id}
                id={t.id}
                label={t.label}
                swatches={t.swatches}
                selected={theme === t.id}
                onSelect={pick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeOption({
  id,
  label,
  swatches,
  selected,
  onSelect,
}: {
  id: ThemeId;
  label: string;
  swatches: [string, string, string];
  selected: boolean;
  onSelect: (id: ThemeId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      className={`flex min-h-tap flex-col gap-2 rounded-xl border px-2.5 py-2.5 text-left transition ${
        selected
          ? "border-alive/60 bg-alive/10 ring-1 ring-alive/40"
          : "border-border bg-surface hover:border-foreground/20"
      }`}
    >
      <span className="flex gap-1" aria-hidden>
        {swatches.map((c) => (
          <span
            key={c}
            className="h-3.5 w-3.5 rounded-full border border-black/20"
            style={{ background: c }}
          />
        ))}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}
