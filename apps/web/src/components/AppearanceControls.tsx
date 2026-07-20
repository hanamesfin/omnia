"use client";

import { useAppearance } from "@/components/AppearanceProvider";
import {
  DENSITY_SCALE_DEFAULT,
  DENSITY_SCALE_MAX,
  DENSITY_SCALE_MIN,
  DENSITY_SCALE_STEP,
  FONT_FAMILY_OPTIONS,
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  FONT_STACKS,
  MESSAGE_STYLE_OPTIONS,
  SIDEBAR_LAYOUT_OPTIONS,
  SIDEBAR_PIN_OPTIONS,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
} from "@/lib/appearance-prefs";

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 4,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  columns?: 2 | 3 | 4;
}) {
  const gridClass =
    columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4";
  return (
    <div>
      <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <div className={`grid gap-1.5 ${gridClass}`}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            aria-pressed={value === opt.id}
            onClick={() => onChange(opt.id)}
            className={`min-h-tap rounded-xl border px-2 py-2 text-xs font-medium transition ${
              value === opt.id
                ? "border-accent/35 bg-navSelected text-foreground"
                : "border-border bg-canvas text-muted hover:bg-black/5 hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AppearanceControls() {
  const {
    fontScale,
    fontFamily,
    densityScale,
    messageStyle,
    sidebarLayout,
    sidebarPin,
    sidebarWidth,
    reduceMotion,
    setFontScale,
    setFontFamily,
    setDensityScale,
    setMessageStyle,
    setSidebarLayout,
    setSidebarPin,
    setSidebarWidth,
    setReduceMotion,
  } = useAppearance();

  const fontPct = Math.round(fontScale * 100);
  const px = Math.round(16 * fontScale);
  const densityPct = Math.round(densityScale * 100);

  return (
    <div className="space-y-6 pb-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Font size</p>
          <span className="tabular-nums text-[11px] text-muted">
            {fontPct}% · {px}px
          </span>
        </div>
        <div className="flex items-end gap-3 rounded-xl border border-border bg-canvas px-3 py-3">
          <span className="pb-0.5 text-[10px] font-semibold leading-none text-muted" aria-hidden>
            A
          </span>
          <input
            type="range"
            min={FONT_SCALE_MIN}
            max={FONT_SCALE_MAX}
            step={FONT_SCALE_STEP}
            value={fontScale}
            onChange={(e) => setFontScale(Number(e.target.value))}
            className="min-h-tap w-full flex-1 accent-[var(--accent)]"
            aria-label="Font size"
          />
          <span className="pb-0.5 text-2xl font-semibold leading-none text-foreground" aria-hidden>
            A
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] text-muted">Extremely small</span>
          <button
            type="button"
            onClick={() => setFontScale(FONT_SCALE_DEFAULT)}
            className="text-[11px] font-medium text-accent hover:underline"
          >
            Reset
          </button>
          <span className="text-[11px] text-muted">Extremely big</span>
        </div>
      </div>

      <div>
        <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted">Font family</p>
        <div className="grid grid-cols-1 gap-1.5">
          {FONT_FAMILY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={fontFamily === opt.id}
              onClick={() => setFontFamily(opt.id)}
              className={`flex min-h-tap flex-col rounded-xl border px-3 py-2.5 text-start transition ${
                fontFamily === opt.id
                  ? "border-accent/35 bg-navSelected"
                  : "border-border bg-canvas hover:bg-black/5"
              }`}
              style={{ fontFamily: FONT_STACKS[opt.id] }}
            >
              <span className="text-sm font-medium text-foreground">{opt.label}</span>
              <span className="text-[11px] text-muted">{opt.hint}</span>
              <span className="mt-1 text-sm text-foreground/80">The quick brown fox</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Compactness</p>
          <span className="tabular-nums text-[11px] text-muted">{densityPct}%</span>
        </div>
        <div className="rounded-xl border border-border bg-canvas px-3 py-3">
          <input
            type="range"
            min={DENSITY_SCALE_MIN}
            max={DENSITY_SCALE_MAX}
            step={DENSITY_SCALE_STEP}
            value={densityScale}
            onChange={(e) => setDensityScale(Number(e.target.value))}
            className="min-h-tap w-full accent-[var(--accent)]"
            aria-label="Compactness"
          />
          <div
            className="mt-3 flex flex-col rounded-lg bg-background/80 p-2.5 ring-1 ring-border transition-[gap] duration-150"
            style={{ gap: `calc(0.55rem * ${densityScale})` }}
            aria-hidden
          >
            <div
              className="max-w-[88%] self-end rounded-2xl rounded-tr-md bg-alive/20 text-[11px] leading-snug text-foreground transition-[padding] duration-150"
              style={{
                padding: `calc(0.45rem * ${densityScale}) calc(0.7rem * ${densityScale})`,
              }}
            >
              Sample turn
            </div>
            <div
              className="max-w-[92%] self-start rounded-2xl rounded-tl-md bg-surface text-[11px] leading-snug text-muted ring-1 ring-border transition-[padding] duration-150"
              style={{
                padding: `calc(0.45rem * ${densityScale}) calc(0.7rem * ${densityScale})`,
              }}
            >
              Reply spacing
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] text-muted">Extremely compact</span>
          <button
            type="button"
            onClick={() => setDensityScale(DENSITY_SCALE_DEFAULT)}
            className="text-[11px] font-medium text-accent hover:underline"
          >
            Reset
          </button>
          <span className="text-[11px] text-muted">Extremely spacious</span>
        </div>
      </div>

      <Segmented
        label="Message style"
        options={MESSAGE_STYLE_OPTIONS}
        value={messageStyle}
        onChange={setMessageStyle}
        columns={2}
      />

      <div className="border-t border-border pt-5">
        <p className="px-1 pb-3 text-xs font-medium uppercase tracking-wider text-muted">Sidebar</p>
        <div className="space-y-5">
          <div>
            <p className="px-1 pb-2 text-[11px] text-muted">Layout</p>
            <div className="grid grid-cols-1 gap-1.5">
              {SIDEBAR_LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={sidebarLayout === opt.id}
                  onClick={() => setSidebarLayout(opt.id)}
                  className={`flex min-h-tap flex-col rounded-xl border px-3 py-2.5 text-start transition ${
                    sidebarLayout === opt.id
                      ? "border-accent/35 bg-navSelected"
                      : "border-border bg-canvas hover:bg-black/5"
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  <span className="text-[11px] text-muted">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="px-1 pb-2 text-[11px] text-muted">Pinning</p>
            <div className="grid grid-cols-1 gap-1.5">
              {SIDEBAR_PIN_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={sidebarPin === opt.id}
                  onClick={() => setSidebarPin(opt.id)}
                  className={`flex min-h-tap flex-col rounded-xl border px-3 py-2.5 text-start transition ${
                    sidebarPin === opt.id
                      ? "border-accent/35 bg-navSelected"
                      : "border-border bg-canvas hover:bg-black/5"
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  <span className="text-[11px] text-muted">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {sidebarLayout === "expanded" && (
            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[11px] text-muted">Width</p>
                <span className="tabular-nums text-[11px] text-muted">{sidebarWidth}px</span>
              </div>
              <input
                type="range"
                min={SIDEBAR_WIDTH_MIN}
                max={SIDEBAR_WIDTH_MAX}
                step={4}
                value={sidebarWidth}
                onChange={(e) => setSidebarWidth(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
                aria-label="Sidebar width"
              />
              <p className="mt-1 px-1 text-[11px] text-muted">
                Drag the sidebar edge on desktop to resize.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted">
          Agent avatars
        </p>
        <p className="px-1 text-[11px] leading-relaxed text-muted">
          Illustrated, gradient orb, monogram, or upload — set per agent under{" "}
          <span className="text-foreground">Yours → Personalize</span>.
        </p>
      </div>

      <div className="border-t border-border pt-5">
        <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted">
          Accessibility
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={reduceMotion}
          onClick={() => setReduceMotion(!reduceMotion)}
          className={`flex w-full min-h-tap items-center justify-between gap-3 rounded-xl border px-3 py-3 text-start transition ${
            reduceMotion
              ? "border-accent/35 bg-navSelected"
              : "border-border bg-canvas hover:bg-black/5"
          }`}
        >
          <span>
            <span className="block text-sm font-medium text-foreground">Reduce motion</span>
            <span className="block text-[11px] text-muted">
              Trim transitions and parallax for motion sensitivity
            </span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              reduceMotion ? "bg-accent" : "bg-border"
            }`}
            aria-hidden
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                reduceMotion ? "translate-x-[1.35rem]" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}
