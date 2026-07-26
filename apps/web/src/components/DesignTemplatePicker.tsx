"use client";

/**
 * DesignTemplatePicker.tsx
 *
 * Full-screen design gallery shown during agent creation.
 * Phase 1 — grid of 96 live CSS-rendered template cards.
 * Phase 2 — clicking a card opens an all-pages preview lightbox.
 */

import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  type CSSProperties,
} from "react";
import {
  Search,
  X,
  ChevronLeft,
  Check,
  LayoutTemplate,
} from "lucide-react";
import {
  DESIGN_TEMPLATES,
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  filterTemplates,
  loadTemplateFonts,
  type DesignTemplate,
  type TemplateCategory,
} from "@/lib/design-templates";

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  onSelect: (template: DesignTemplate) => void;
  onSkip: () => void;
};

// ─── Page-scene types ────────────────────────────────────────────────────────

type PageScene = "main" | "results" | "settings" | "empty" | "loading" | "content";

const PAGE_SCENES: { id: PageScene; label: string }[] = [
  { id: "main",     label: "Main" },
  { id: "results",  label: "Results" },
  { id: "settings", label: "Settings" },
  { id: "empty",    label: "Empty State" },
  { id: "loading",  label: "Loading" },
  { id: "content",  label: "Content" },
];

// ─── CSS var helper ──────────────────────────────────────────────────────────

function templateVars(t: DesignTemplate): CSSProperties {
  const c = t.tokens.colors;
  return {
    "--t-bg":      c.bg,
    "--t-fg":      c.fg,
    "--t-surface": c.surface,
    "--t-muted":   c.muted,
    "--t-accent":  c.accent,
    "--t-border":  c.border,
    "--t-sans":    `"${t.tokens.typography.font_sans}", system-ui, sans-serif`,
    "--t-display": `"${t.tokens.typography.font_display}", serif`,
    "--t-mono":    `"${t.tokens.typography.font_mono}", monospace`,
    backgroundColor: c.bg,
    color:           c.fg,
    fontFamily:      `"${t.tokens.typography.font_sans}", system-ui, sans-serif`,
  } as CSSProperties;
}

// ─── Card radius helper ───────────────────────────────────────────────────────

function cardRadius(t: DesignTemplate): string {
  if (t.tokens.radius === "sharp") return "0px";
  if (t.tokens.radius === "pill")  return "24px";
  return "12px";
}

// ─── Mini card preview (shown in gallery grid) ────────────────────────────────
// Renders a tiny artboard (300×220) scaled to fit a 180×132 card slot

function MiniPreview({ t }: { t: DesignTemplate }) {
  const c = t.tokens.colors;
  const r = cardRadius(t);
  const isNeu = t.category === "neumorphic";
  const neuShadow = isNeu
    ? `5px 5px 10px ${c.muted}66, -5px -5px 10px ${c.bg}cc`
    : "none";

  return (
    <div
      aria-hidden
      style={{
        width: 300,
        height: 200,
        transform: "scale(0.6)",
        transformOrigin: "top left",
        overflow: "hidden",
        backgroundColor: c.bg,
        color: c.fg,
        fontFamily: `"${t.tokens.typography.font_sans}", system-ui`,
      }}
    >
      {/* Nav */}
      <div style={{ height: 28, backgroundColor: c.surface, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", padding: "0 10px", gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: c.accent }} />
        <div style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: c.muted, opacity: 0.3 }} />
        <div style={{ width: 36, height: 12, borderRadius: r === "0px" ? 1 : 6, backgroundColor: c.accent, opacity: 0.85 }} />
      </div>

      {/* Hero */}
      <div style={{ padding: "14px 12px 10px", borderBottom: `1px solid ${c.border}` }}>
        <div style={{ height: 10, width: "55%", borderRadius: 3, backgroundColor: c.fg, marginBottom: 5, opacity: 0.85 }} />
        <div style={{ height: 6, width: "72%", borderRadius: 2, backgroundColor: c.muted, opacity: 0.45, marginBottom: 10 }} />
        {/* Input bar */}
        <div style={{ height: 22, borderRadius: r === "0px" ? 2 : r === "pill" ? 11 : 6, backgroundColor: c.surface, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", padding: "0 8px", gap: 5, boxShadow: neuShadow }}>
          <div style={{ flex: 1, height: 5, borderRadius: 2, backgroundColor: c.muted, opacity: 0.25 }} />
          <div style={{ width: 28, height: 14, borderRadius: r === "0px" ? 1 : r === "pill" ? 7 : 4, backgroundColor: c.accent }} />
        </div>
      </div>

      {/* Cards row */}
      <div style={{ padding: "10px 10px 0", display: "flex", gap: 6 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 52,
              borderRadius: r === "0px" ? 2 : r === "pill" ? 12 : 6,
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              padding: "6px 6px",
              boxShadow: isNeu ? `3px 3px 6px ${c.muted}44, -2px -2px 5px ${c.bg}aa` : "none",
            }}
          >
            <div style={{ width: "60%", height: 5, borderRadius: 2, backgroundColor: c.accent, opacity: 0.7, marginBottom: 4 }} />
            <div style={{ width: "80%", height: 4, borderRadius: 2, backgroundColor: c.muted, opacity: 0.3 }} />
            <div style={{ width: "50%", height: 4, borderRadius: 2, backgroundColor: c.muted, opacity: 0.2, marginTop: 3 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Full artboard scene renderers (for the detail view, 1440×900) ────────────

function SceneMain({ t }: { t: DesignTemplate }) {
  const c = t.tokens.colors;
  const r = cardRadius(t);
  const isNeu = t.category === "neumorphic";
  const neuBox = isNeu ? `8px 8px 18px ${c.muted}55, -8px -8px 18px ${c.bg}cc` : "none";
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: c.bg, color: c.fg, fontFamily: `"${t.tokens.typography.font_sans}", system-ui`, display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <div style={{ height: 52, backgroundColor: c.surface, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", padding: "0 32px", gap: 12, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: c.accent, opacity: 0.9 }} />
        <div style={{ width: 80, height: 8, borderRadius: 3, backgroundColor: c.fg, opacity: 0.8 }} />
        <div style={{ flex: 1 }} />
        {["Product", "Docs", "About"].map((label) => (
          <div key={label} style={{ height: 8, width: label.length * 7, borderRadius: 2, backgroundColor: c.muted, opacity: 0.4 }} />
        ))}
        <div style={{ width: 80, height: 28, borderRadius: r === "0px" ? 3 : r === "pill" ? 14 : 8, backgroundColor: c.accent }} />
      </div>
      {/* Hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 120px", gap: 20 }}>
        <div style={{ width: "70%", height: 48, borderRadius: 4, backgroundColor: c.fg, opacity: 0.85, fontFamily: `"${t.tokens.typography.font_display}", serif` }} />
        <div style={{ width: "50%", height: 16, borderRadius: 3, backgroundColor: c.muted, opacity: 0.4 }} />
        <div style={{ width: "50%", height: 16, borderRadius: 3, backgroundColor: c.muted, opacity: 0.25 }} />
        <div style={{ display: "flex", gap: 12, marginTop: 12, width: "50%", alignItems: "center" }}>
          <div style={{ flex: 1, height: 44, borderRadius: r === "0px" ? 2 : r === "pill" ? 22 : 10, backgroundColor: c.surface, border: `1px solid ${c.border}`, boxShadow: neuBox }} />
          <div style={{ width: 120, height: 44, borderRadius: r === "0px" ? 2 : r === "pill" ? 22 : 10, backgroundColor: c.accent, flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}

function SceneResults({ t }: { t: DesignTemplate }) {
  const c = t.tokens.colors;
  const r = cardRadius(t);
  const isNeu = t.category === "neumorphic";
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: c.bg, color: c.fg, fontFamily: `"${t.tokens.typography.font_sans}", system-ui`, display: "flex" }}>
      {/* Sidebar */}
      <div style={{ width: 220, backgroundColor: c.surface, borderRight: `1px solid ${c.border}`, flexShrink: 0, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ height: 28, borderRadius: 6, backgroundColor: c.accent, opacity: 0.8, marginBottom: 16 }} />
        {[80, 60, 90, 50, 70].map((w, i) => (
          <div key={i} style={{ height: 10, width: `${w}%`, borderRadius: 3, backgroundColor: i === 0 ? c.accent : c.muted, opacity: i === 0 ? 0.7 : 0.3 }} />
        ))}
      </div>
      {/* Content */}
      <div style={{ flex: 1, padding: "24px 28px", overflow: "hidden" }}>
        <div style={{ height: 10, width: 180, borderRadius: 3, backgroundColor: c.fg, opacity: 0.7, marginBottom: 20 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ borderRadius: r === "0px" ? 2 : r === "pill" ? 16 : 10, backgroundColor: c.surface, border: `1px solid ${c.border}`, padding: 16, boxShadow: isNeu ? `4px 4px 10px ${c.muted}44, -3px -3px 8px ${c.bg}aa` : "none" }}>
              <div style={{ height: 72, borderRadius: r === "0px" ? 1 : 6, backgroundColor: c.muted, opacity: 0.12, marginBottom: 10 }} />
              <div style={{ height: 8, width: "70%", borderRadius: 2, backgroundColor: c.fg, opacity: 0.7, marginBottom: 6 }} />
              <div style={{ height: 6, width: "90%", borderRadius: 2, backgroundColor: c.muted, opacity: 0.3 }} />
              <div style={{ height: 6, width: "60%", borderRadius: 2, backgroundColor: c.muted, opacity: 0.2, marginTop: 4 }} />
              <div style={{ marginTop: 12, height: 24, borderRadius: r === "0px" ? 1 : r === "pill" ? 12 : 6, backgroundColor: c.accent, opacity: 0.8 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SceneSettings({ t }: { t: DesignTemplate }) {
  const c = t.tokens.colors;
  const r = cardRadius(t);
  const isNeu = t.category === "neumorphic";
  const neuBox = isNeu ? `6px 6px 14px ${c.muted}44, -5px -5px 12px ${c.bg}aa` : "none";
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: c.bg, color: c.fg, fontFamily: `"${t.tokens.typography.font_sans}", system-ui`, padding: "40px 200px" }}>
      <div style={{ height: 14, width: 160, borderRadius: 3, backgroundColor: c.fg, opacity: 0.8, marginBottom: 8 }} />
      <div style={{ height: 8, width: 300, borderRadius: 2, backgroundColor: c.muted, opacity: 0.35, marginBottom: 36 }} />
      {[
        ["Name", 240], ["Email", 300], ["API Key", 260], ["Model", 200],
      ].map(([label, w], i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <div style={{ height: 7, width: Number(w) * 0.4, borderRadius: 2, backgroundColor: c.muted, opacity: 0.5, marginBottom: 8 }} />
          <div style={{ height: 40, borderRadius: r === "0px" ? 2 : r === "pill" ? 20 : 8, backgroundColor: c.surface, border: `1px solid ${c.border}`, boxShadow: neuBox, display: "flex", alignItems: "center", padding: "0 14px" }}>
            <div style={{ height: 6, width: "50%", borderRadius: 2, backgroundColor: c.muted, opacity: 0.2 }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <div style={{ width: 120, height: 40, borderRadius: r === "0px" ? 2 : r === "pill" ? 20 : 8, backgroundColor: c.accent }} />
        <div style={{ width: 100, height: 40, borderRadius: r === "0px" ? 2 : r === "pill" ? 20 : 8, backgroundColor: c.surface, border: `1px solid ${c.border}` }} />
      </div>
    </div>
  );
}

function SceneEmpty({ t }: { t: DesignTemplate }) {
  const c = t.tokens.colors;
  const r = cardRadius(t);
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: c.bg, color: c.fg, fontFamily: `"${t.tokens.typography.font_sans}", system-ui`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      {/* Illustration stand-in */}
      <div style={{ width: 120, height: 120, borderRadius: r === "0px" ? 8 : "50%", backgroundColor: c.surface, border: `2px dashed ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: r === "0px" ? 4 : "50%", backgroundColor: c.accent, opacity: 0.3 }} />
      </div>
      <div style={{ height: 16, width: 220, borderRadius: 4, backgroundColor: c.fg, opacity: 0.65 }} />
      <div style={{ height: 8, width: 300, borderRadius: 3, backgroundColor: c.muted, opacity: 0.3 }} />
      <div style={{ height: 8, width: 240, borderRadius: 3, backgroundColor: c.muted, opacity: 0.2 }} />
      <div style={{ width: 140, height: 44, borderRadius: r === "0px" ? 2 : r === "pill" ? 22 : 10, backgroundColor: c.accent, marginTop: 12 }} />
    </div>
  );
}

function SceneLoading({ t }: { t: DesignTemplate }) {
  const c = t.tokens.colors;
  const r = cardRadius(t);
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: c.bg, color: c.fg, fontFamily: `"${t.tokens.typography.font_sans}", system-ui`, padding: "40px 200px" }}>
      <div style={{ height: 12, width: 200, borderRadius: 3, backgroundColor: c.fg, opacity: 0.6, marginBottom: 32 }} />
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 14, marginBottom: 20, alignItems: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: r === "0px" ? 4 : "50%", backgroundColor: c.surface, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 8, width: `${60 + Math.sin(i) * 20}%`, borderRadius: 3, backgroundColor: c.surface, marginBottom: 8 }} />
            <div style={{ height: 6, width: `${75 + Math.cos(i) * 15}%`, borderRadius: 3, backgroundColor: c.surface, opacity: 0.6 }} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${c.accent}`, borderTopColor: "transparent", opacity: 0.8 }} />
        <div style={{ height: 6, width: 160, borderRadius: 3, backgroundColor: c.muted, opacity: 0.3 }} />
      </div>
    </div>
  );
}

function SceneContent({ t }: { t: DesignTemplate }) {
  const c = t.tokens.colors;
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: c.bg, color: c.fg, fontFamily: `"${t.tokens.typography.font_sans}", system-ui`, display: "flex" }}>
      <div style={{ flex: 1, padding: "48px 120px", maxWidth: 700 }}>
        <div style={{ height: 8, width: 120, borderRadius: 2, backgroundColor: c.accent, opacity: 0.7, marginBottom: 16 }} />
        <div style={{ height: 32, width: "90%", borderRadius: 4, backgroundColor: c.fg, opacity: 0.8, marginBottom: 8, fontFamily: `"${t.tokens.typography.font_display}", serif` }} />
        <div style={{ height: 32, width: "60%", borderRadius: 4, backgroundColor: c.fg, opacity: 0.6, marginBottom: 24 }} />
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ height: 7, width: "100%", borderRadius: 2, backgroundColor: c.muted, opacity: 0.3, marginBottom: 6 }} />
            <div style={{ height: 7, width: "95%", borderRadius: 2, backgroundColor: c.muted, opacity: 0.25, marginBottom: 6 }} />
            <div style={{ height: 7, width: "80%", borderRadius: 2, backgroundColor: c.muted, opacity: 0.2 }} />
          </div>
        ))}
      </div>
      <div style={{ width: 260, borderLeft: `1px solid ${c.border}`, padding: "48px 28px", flexShrink: 0 }}>
        <div style={{ height: 8, width: 100, borderRadius: 2, backgroundColor: c.muted, opacity: 0.4, marginBottom: 16 }} />
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ height: 7, width: `${55 + i * 8}%`, borderRadius: 2, backgroundColor: c.muted, opacity: 0.25, marginBottom: 10 }} />
        ))}
      </div>
    </div>
  );
}

function PageScene({ t, scene }: { t: DesignTemplate; scene: PageScene }) {
  switch (scene) {
    case "main":     return <SceneMain t={t} />;
    case "results":  return <SceneResults t={t} />;
    case "settings": return <SceneSettings t={t} />;
    case "empty":    return <SceneEmpty t={t} />;
    case "loading":  return <SceneLoading t={t} />;
    case "content":  return <SceneContent t={t} />;
  }
}

// ─── Detail overlay ───────────────────────────────────────────────────────────

function TemplateDetail({
  t,
  onSelect,
  onBack,
}: {
  t: DesignTemplate;
  onSelect: () => void;
  onBack: () => void;
}) {
  const [scene, setScene] = useState<PageScene>("main");

  useEffect(() => {
    loadTemplateFonts(t);
  }, [t]);

  const c = t.tokens.colors;
  const r = cardRadius(t);

  return (
    <div
      className="design-detail-overlay"
      style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", flexDirection: "column", backgroundColor: c.bg, color: c.fg }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 64,
          backgroundColor: c.surface,
          borderBottom: `1px solid ${c.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: c.muted, cursor: "pointer", fontSize: 14 }}
        >
          <ChevronLeft size={18} />
          Back
        </button>
        <div style={{ flex: 1, paddingLeft: 16 }}>
          <p style={{ fontFamily: `"${t.tokens.typography.font_display}", serif`, fontSize: 18, fontWeight: 600, margin: 0, color: c.fg }}>{t.name}</p>
          <p style={{ fontSize: 12, margin: 0, color: c.muted }}>{t.vibe}</p>
        </div>
        {/* Color swatches */}
        <div style={{ display: "flex", gap: 6 }}>
          {[c.bg, c.surface, c.muted, c.accent].map((col, i) => (
            <div key={i} style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: col, border: `1px solid ${c.border}` }} title={col} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: r === "pill" ? 99 : 6, border: `1px solid ${c.border}`, color: c.muted }}>{t.tokens.radius}</span>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: r === "pill" ? 99 : 6, border: `1px solid ${c.border}`, color: c.muted }}>{t.tokens.motion}</span>
        </div>
        <button
          type="button"
          onClick={onSelect}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 24px",
            borderRadius: r === "0px" ? 3 : r === "pill" ? 99 : 10,
            backgroundColor: c.accent,
            color: c.bg,
            border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
          }}
        >
          <Check size={16} />
          Use this design
        </button>
      </div>

      {/* Page preview — artboard */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Scaled artboard: 1440×900 → fits in container */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 0 80px 0",
            backgroundColor: c.bg,
          }}
        >
          <div
            style={{
              width: 1440,
              height: 900,
              transform: "scale(var(--detail-scale, 0.65))",
              transformOrigin: "center center",
              border: `1px solid ${c.border}`,
              overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
            }}
          >
            <ScaleArtboard />
            <PageScene t={t} scene={scene} />
          </div>
        </div>
      </div>

      {/* Page strip */}
      <div
        style={{
          height: 72,
          backgroundColor: c.surface,
          borderTop: `1px solid ${c.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        {PAGE_SCENES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setScene(id)}
            style={{
              padding: "8px 18px",
              borderRadius: r === "0px" ? 2 : r === "pill" ? 99 : 8,
              border: `1px solid ${scene === id ? c.accent : c.border}`,
              backgroundColor: scene === id ? c.accent : "transparent",
              color: scene === id ? c.bg : c.muted,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: scene === id ? 600 : 400,
              transition: "all 0.15s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Sets --detail-scale CSS var based on viewport so the 1440px artboard fits */
function ScaleArtboard() {
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight - 64 - 72 - 24; // minus top/bottom bars + padding
      const scale = Math.min((vw - 48) / 1440, vh / 900, 0.8);
      document.documentElement.style.setProperty("--detail-scale", String(scale));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return null;
}

// ─── Template card (gallery) ──────────────────────────────────────────────────

function TemplateCard({
  t,
  onClick,
}: {
  t: DesignTemplate;
  onClick: () => void;
}) {
  const c = t.tokens.colors;
  const r = cardRadius(t);

  return (
    <button
      type="button"
      onClick={onClick}
      className="design-template-card"
      style={{
        display: "flex",
        flexDirection: "column",
        border: "none",
        padding: 0,
        cursor: "pointer",
        background: "none",
        borderRadius: r === "0px" ? 4 : r === "pill" ? 20 : 12,
        overflow: "hidden",
        outline: "none",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-4px) scale(1.01)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 12px 32px rgba(0,0,0,0.2), 0 0 0 2px ${c.accent}88`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.12)";
      }}
      aria-label={`${t.name} — ${t.vibe}. Click to preview.`}
    >
      {/* Preview area — 300×200 at 0.6 scale = 180×120 */}
      <div style={{ width: 180, height: 120, overflow: "hidden", backgroundColor: c.bg, position: "relative" }}>
        <MiniPreview t={t} />
      </div>
      {/* Label */}
      <div
        style={{
          width: 180,
          padding: "10px 12px 11px",
          backgroundColor: c.surface,
          borderTop: `1px solid ${c.border}`,
          textAlign: "left",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: c.fg, fontFamily: `"${t.tokens.typography.font_sans}", system-ui`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {t.name}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 10, color: c.muted, fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {t.vibe}
        </p>
      </div>
    </button>
  );
}

// ─── Main picker ──────────────────────────────────────────────────────────────

export function DesignTemplatePicker({ onSelect, onSkip }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");
  const [detailTemplate, setDetailTemplate] = useState<DesignTemplate | null>(null);

  const filtered = useMemo(
    () => filterTemplates(DESIGN_TEMPLATES, search, activeCategory),
    [search, activeCategory]
  );

  const handleSelect = useCallback(
    (t: DesignTemplate) => {
      loadTemplateFonts(t);
      onSelect(t);
    },
    [onSelect]
  );

  return (
    <>
      {/* Main gallery overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          backgroundColor: "#0a0a0f",
          color: "#f0f0f4",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 60,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
            gap: 16,
            flexShrink: 0,
            backgroundColor: "#0f0f16",
          }}
        >
          <LayoutTemplate size={20} style={{ color: "#a855f7", flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>
              Choose a design
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {DESIGN_TEMPLATES.length} templates · 12 categories · live previews
            </p>
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: "relative", width: 220 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", pointerEvents: "none" }} />
            <input
              type="search"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 34,
                paddingLeft: 32,
                paddingRight: 12,
                backgroundColor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "#f0f0f4",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          <button
            type="button"
            onClick={onSkip}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              backgroundColor: "transparent",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <X size={14} />
            Skip
          </button>
        </div>

        {/* Category filter */}
        <div
          style={{
            height: 44,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: 4,
            flexShrink: 0,
            overflowX: "auto",
            backgroundColor: "#0c0c12",
          }}
        >
          <CategoryPill
            label="All"
            active={activeCategory === "all"}
            count={DESIGN_TEMPLATES.length}
            onClick={() => setActiveCategory("all")}
          />
          {ALL_CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat}
              label={CATEGORY_LABELS[cat]}
              active={activeCategory === cat}
              count={DESIGN_TEMPLATES.filter((t) => t.category === cat).length}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>

        {/* Grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 28px 40px",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", gap: 12, color: "rgba(255,255,255,0.3)" }}>
              <Search size={32} />
              <p style={{ margin: 0 }}>No templates match "{search}"</p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              {filtered.map((t) => (
                <TemplateCard
                  key={t.id}
                  t={t}
                  onClick={() => setDetailTemplate(t)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Count bar */}
        <div
          style={{
            height: 36,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            flexShrink: 0,
          }}
        >
          {filtered.length} of {DESIGN_TEMPLATES.length} templates
          {activeCategory !== "all" && ` · ${CATEGORY_LABELS[activeCategory as TemplateCategory]}`}
          {search && ` · matching "${search}"`}
        </div>
      </div>

      {/* Detail overlay (slides in on top) */}
      {detailTemplate && (
        <TemplateDetail
          t={detailTemplate}
          onBack={() => setDetailTemplate(null)}
          onSelect={() => handleSelect(detailTemplate)}
        />
      )}
    </>
  );
}

// ─── Category pill ────────────────────────────────────────────────────────────

function CategoryPill({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 26,
        padding: "0 12px",
        borderRadius: 99,
        border: active ? "1px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.08)",
        backgroundColor: active ? "rgba(168,85,247,0.18)" : "transparent",
        color: active ? "#e9d5ff" : "rgba(255,255,255,0.45)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
      <span
        style={{
          fontSize: 10,
          opacity: 0.6,
          backgroundColor: "rgba(255,255,255,0.08)",
          padding: "1px 5px",
          borderRadius: 99,
        }}
      >
        {count}
      </span>
    </button>
  );
}
