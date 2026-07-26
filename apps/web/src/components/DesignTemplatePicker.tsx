"use client";

/**
 * DesignTemplatePicker.tsx
 *
 * Field Manual V1 — The Builder's Blueprint Design Engine.
 * Dynamic visual gallery rendering 8 distinct structural layout archetypes
 * and the 5 Schools of Thought (Silicon Valley, SpaceX, Apple, Unit 8200, Shenzhen).
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
  ShieldAlert,
  Cpu,
  Zap,
  Layers,
  Terminal as TerminalIcon,
  Compass,
  FileText,
} from "lucide-react";
import {
  DESIGN_TEMPLATES,
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  SCHOOL_LABELS,
  filterTemplates,
  loadTemplateFonts,
  type DesignTemplate,
  type TemplateCategory,
  type LayoutArchetype,
  type FieldManualSchool,
} from "@/lib/design-templates";

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  onSelect: (template: DesignTemplate) => void;
  onSkip: () => void;
};

// ─── Page-scene types ────────────────────────────────────────────────────────

type PageSceneType = "main" | "results" | "settings" | "empty" | "loading" | "content";

const PAGE_SCENES: { id: PageSceneType; label: string }[] = [
  { id: "main",     label: "Main Surface" },
  { id: "results",  label: "Results / Data" },
  { id: "settings", label: "Configuration" },
  { id: "empty",    label: "Zero State" },
  { id: "loading",  label: "Execution State" },
  { id: "content",  label: "Document Reader" },
];

function cardRadius(t: DesignTemplate): string {
  if (t.tokens.radius === "sharp") return "0px";
  if (t.tokens.radius === "pill")  return "24px";
  return "12px";
}

// ─────────── 8 RADICALLY DISTINCT MINI PREVIEW RENDERERS ─────────────────────

function MiniPreview({ t }: { t: DesignTemplate }) {
  const c = t.tokens.colors;
  const r = cardRadius(t);
  const arch = t.layout_archetype;

  // Shared wrapper style: 300x200 scaled to 0.6 = 180x120 slot
  const baseStyle: CSSProperties = {
    width: 300,
    height: 200,
    transform: "scale(0.6)",
    transformOrigin: "top left",
    overflow: "hidden",
    backgroundColor: c.bg,
    color: c.fg,
    fontFamily: `"${t.tokens.typography.font_sans}", system-ui, sans-serif`,
  };

  // 1. HUD (SpaceX / Elon Musk Telemetry)
  if (arch === "hud") {
    return (
      <div style={baseStyle}>
        <div style={{ height: 26, backgroundColor: c.surface, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", padding: "0 10px", gap: 8 }}>
          <div style={{ width: 6, height: 6, backgroundColor: c.accent, borderRadius: 1 }} />
          <div style={{ fontFamily: `"${t.tokens.typography.font_mono}", monospace`, fontSize: 9, color: c.accent }}>TELEMETRY.SYS // LIVE</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontFamily: `"${t.tokens.typography.font_mono}", monospace`, fontSize: 9, color: c.muted }}>99.98%</div>
        </div>
        <div style={{ padding: "8px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <div style={{ height: 38, border: `1px solid ${c.border}`, padding: 5, backgroundColor: c.surface }}>
            <div style={{ fontSize: 7, color: c.muted, fontFamily: `"${t.tokens.typography.font_mono}", monospace` }}>ALTITUDE</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.accent, fontFamily: `"${t.tokens.typography.font_mono}", monospace` }}>142.8 km</div>
          </div>
          <div style={{ height: 38, border: `1px solid ${c.border}`, padding: 5, backgroundColor: c.surface }}>
            <div style={{ fontSize: 7, color: c.muted, fontFamily: `"${t.tokens.typography.font_mono}", monospace` }}>VELOCITY</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.fg, fontFamily: `"${t.tokens.typography.font_mono}", monospace` }}>7.8 km/s</div>
          </div>
        </div>
        <div style={{ padding: "0 10px 8px" }}>
          <div style={{ height: 95, border: `1px solid ${c.border}`, backgroundColor: "#000000", padding: 6, fontFamily: `"${t.tokens.typography.font_mono}", monospace`, fontSize: 8, color: c.fg, opacity: 0.9 }}>
            <div style={{ color: c.accent }}>{`> SYS_INIT: AGENT_CORE_ACTIVE`}</div>
            <div>{`> PAYLOAD_VERIFIED: 100%`}</div>
            <div>{`> TELEMETRY: NOMINAL`}</div>
            <div style={{ color: c.muted }}>{`> WAITING FOR COMMAND...`}</div>
          </div>
        </div>
      </div>
    );
  }

  // 2. ZEN (Apple Glass Studio)
  if (arch === "zen") {
    return (
      <div style={baseStyle}>
        <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: c.accent }} />
          <div style={{ height: 20, padding: "0 10px", borderRadius: 10, backgroundColor: c.surface, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: c.fg }} />
            <div style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: c.muted }} />
          </div>
        </div>
        <div style={{ padding: "20px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontFamily: `"${t.tokens.typography.font_display}", serif`, fontSize: 16, fontWeight: 600, color: c.fg, marginBottom: 4 }}>Restraint</div>
          <div style={{ fontSize: 9, color: c.muted, maxWidth: 180, marginBottom: 16 }}>Say no to a thousand things so the one thing left is obvious.</div>
          <div style={{ width: 220, height: 32, borderRadius: 16, backgroundColor: c.surface, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", padding: "0 12px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 100, height: 5, borderRadius: 2, backgroundColor: c.muted, opacity: 0.4 }} />
          </div>
        </div>
      </div>
    );
  }

  // 3. TRIAGE (Unit 8200 Tactical Command Workbench)
  if (arch === "triage") {
    return (
      <div style={{ ...baseStyle, display: "flex" }}>
        <div style={{ width: 90, backgroundColor: c.surface, borderRight: `1px solid ${c.border}`, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: c.accent, fontFamily: `"${t.tokens.typography.font_mono}", monospace` }}>INTEL PANEL</div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 22, border: `1px solid ${c.border}`, borderRadius: r === "0px" ? 0 : 3, padding: "3px 4px", backgroundColor: i === 1 ? c.accent : "transparent", color: i === 1 ? c.bg : c.fg }}>
              <div style={{ width: "80%", height: 4, borderRadius: 1, backgroundColor: "currentColor" }} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: c.fg }}>TRIAGE WORKBENCH</div>
            <span style={{ fontSize: 7, padding: "1px 5px", backgroundColor: c.accent, color: c.bg, fontWeight: 700 }}>UNIT 8200</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
            <div style={{ height: 40, backgroundColor: c.surface, border: `1px solid ${c.border}`, padding: 4 }}>
              <div style={{ width: "50%", height: 4, backgroundColor: c.muted, marginBottom: 3 }} />
              <div style={{ width: "80%", height: 4, backgroundColor: c.fg }} />
            </div>
            <div style={{ height: 40, backgroundColor: c.surface, border: `1px solid ${c.border}`, padding: 4 }}>
              <div style={{ width: "40%", height: 4, backgroundColor: c.muted, marginBottom: 3 }} />
              <div style={{ width: "70%", height: 4, backgroundColor: c.accent }} />
            </div>
          </div>
          <div style={{ height: 60, backgroundColor: c.surface, border: `1px solid ${c.border}`, padding: 6 }}>
            <div style={{ width: "60%", height: 5, backgroundColor: c.fg, marginBottom: 4 }} />
            <div style={{ width: "90%", height: 4, backgroundColor: c.muted, opacity: 0.5 }} />
          </div>
        </div>
      </div>
    );
  }

  // 4. MATRIX (Shenzhen Modular Circuit)
  if (arch === "matrix") {
    return (
      <div style={baseStyle}>
        <div style={{ height: 26, backgroundColor: c.surface, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", padding: "0 10px", justifyContent: "space-between" }}>
          <span style={{ fontSize: 9, fontWeight: 700, fontFamily: `"${t.tokens.typography.font_mono}", monospace`, color: c.accent }}>SHENZHEN PCB // MODULAR MATRIX</span>
          <div style={{ display: "flex", gap: 3 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: c.accent }} />
            <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#e11d48" }} />
          </div>
        </div>
        <div style={{ padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 68, backgroundColor: c.surface, border: `1px dashed ${c.border}`, padding: 6, borderRadius: r === "0px" ? 0 : 4, position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 8, fontFamily: `"${t.tokens.typography.font_mono}", monospace`, color: c.muted }}>MOD_0{i}</span>
                <div style={{ width: 6, height: 6, backgroundColor: i % 2 === 0 ? c.accent : c.muted, borderRadius: 1 }} />
              </div>
              <div style={{ width: "70%", height: 5, backgroundColor: c.fg, marginBottom: 4 }} />
              <div style={{ width: "40%", height: 4, backgroundColor: c.muted, opacity: 0.6 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. STREAM (Silicon Valley Rapid Launchpad)
  if (arch === "stream") {
    return (
      <div style={baseStyle}>
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${c.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: c.fg }}>Silicon Valley Stream</div>
          <div style={{ height: 18, padding: "0 8px", backgroundColor: c.accent, color: c.bg, borderRadius: 99, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center" }}>v1.4 SHIP NOW</div>
        </div>
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ padding: 8, backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: r === "pill" ? 12 : r === "sharp" ? 0 : 6 }}>
              <div style={{ width: "60%", height: 6, backgroundColor: c.fg, marginBottom: 4 }} />
              <div style={{ width: "85%", height: 4, backgroundColor: c.muted, opacity: 0.5 }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
            <span style={{ padding: "2px 6px", borderRadius: 10, border: `1px solid ${c.border}`, fontSize: 7, color: c.accent }}>+ Quick Chip</span>
            <span style={{ padding: "2px 6px", borderRadius: 10, border: `1px solid ${c.border}`, fontSize: 7, color: c.muted }}>+ Iteration</span>
          </div>
        </div>
      </div>
    );
  }

  // 6. PPCEE (Autonomous Operational Pipeline)
  if (arch === "ppcee") {
    return (
      <div style={baseStyle}>
        <div style={{ padding: "8px 10px", backgroundColor: c.surface, borderBottom: `1px solid ${c.border}`, fontSize: 9, fontWeight: 700, color: c.accent }}>PPCEE AUTONOMOUS PIPELINE</div>
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {["PROMPT", "PREVIEW", "CONFIRM", "EXECUTE"].map((stage, i) => (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", backgroundColor: i === 1 ? c.surface : "transparent", border: i === 1 ? `1px solid ${c.accent}` : `1px solid ${c.border}` }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: i <= 1 ? c.accent : c.muted, color: c.bg, fontSize: 7, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i+1}</div>
              <span style={{ fontSize: 8, fontWeight: 700, color: i === 1 ? c.accent : c.fg }}>{stage}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 7. TERMINAL (Retro CRT / CLI Console)
  if (arch === "terminal") {
    return (
      <div style={{ ...baseStyle, backgroundColor: "#000000", border: `1px solid ${c.accent}`, padding: 10, fontFamily: `"${t.tokens.typography.font_mono}", monospace` }}>
        <div style={{ fontSize: 9, color: c.accent, borderBottom: `1px solid ${c.accent}`, paddingBottom: 4, marginBottom: 8 }}>{`[OMNIA-CLI v2.0]`}</div>
        <div style={{ fontSize: 8, color: c.fg, display: "flex", flexDirection: "column", gap: 4 }}>
          <div>{`$ omnia init --school=${t.school}`}</div>
          <div style={{ color: c.accent }}>{`[OK] Compiled doctrine specs`}</div>
          <div>{`$ omnia deploy --tier=enterprise`}</div>
          <div style={{ color: c.muted }}>{`> Agent running on port 8000...`}</div>
          <div style={{ display: "flex", gap: 4, color: c.accent }}>
            <span>{`$`}</span>
            <span style={{ width: 6, height: 10, backgroundColor: c.accent, display: "inline-block" }} />
          </div>
        </div>
      </div>
    );
  }

  // 8. EDITORIAL (Broadsheet Reader)
  return (
    <div style={baseStyle}>
      <div style={{ padding: "10px 14px", borderBottom: `2px solid ${c.fg}`, textAlign: "center" }}>
        <div style={{ fontFamily: `"${t.tokens.typography.font_display}", serif`, fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>THE BROADSHEET</div>
      </div>
      <div style={{ padding: 10, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
        <div>
          <div style={{ fontFamily: `"${t.tokens.typography.font_display}", serif`, fontSize: 10, fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>Philosophy Over Preference</div>
          <div style={{ fontSize: 7, color: c.muted, lineHeight: 1.3 }}>Every field, button, and screen must justify its existence from first principles.</div>
        </div>
        <div style={{ borderLeft: `1px solid ${c.border}`, paddingLeft: 6 }}>
          <div style={{ fontSize: 8, fontStyle: "italic", fontFamily: `"${t.tokens.typography.font_display}", serif`, color: c.accent }}>"The interface is the entire product."</div>
        </div>
      </div>
    </div>
  );
}

// ─────────── FULL ARTBOARD PREVIEW (DETAIL VIEW) ────────────────────────────

function DetailSceneRenderer({ t, scene }: { t: DesignTemplate; scene: PageSceneType }) {
  const c = t.tokens.colors;
  const r = cardRadius(t);
  const arch = t.layout_archetype;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: c.bg,
        color: c.fg,
        fontFamily: `"${t.tokens.typography.font_sans}", system-ui, sans-serif`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Header */}
      <div style={{ height: 56, backgroundColor: c.surface, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", padding: "0 32px", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: r === "pill" ? 12 : 4, backgroundColor: c.accent }} />
          <span style={{ fontWeight: 700, fontSize: 15, fontFamily: `"${t.tokens.typography.font_display}", serif` }}>{t.name}</span>
          <span style={{ fontSize: 11, padding: "2px 8px", backgroundColor: c.bg, border: `1px solid ${c.border}`, borderRadius: 4, color: c.muted }}>{SCHOOL_LABELS[t.school]}</span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: c.muted }}>
          <span style={{ color: c.accent, fontWeight: 600 }}>Surface</span>
          <span>Telemetry</span>
          <span>Doctrine</span>
          <span>Config</span>
        </div>
      </div>

      {/* Main Body Grid according to Layout Archetype */}
      <div style={{ flex: 1, padding: 32, overflow: "hidden", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Banner with Rule Citation */}
        <div style={{ padding: "12px 20px", backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: r === "pill" ? 16 : 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: c.accent, letterSpacing: "0.08em" }}>FIELD MANUAL DOCTRINE</span>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.fg }}>{t.rule_citation}</p>
          </div>
          <span style={{ fontSize: 11, padding: "4px 12px", backgroundColor: c.accent, color: c.bg, fontWeight: 700, borderRadius: 99 }}>{arch.toUpperCase()} ARCHETYPE</span>
        </div>

        {/* Archetype Specific Center Layout */}
        {arch === "hud" || arch === "terminal" ? (
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
            <div style={{ backgroundColor: "#020617", border: `1px solid ${c.border}`, padding: 24, fontFamily: `"${t.tokens.typography.font_mono}", monospace`, color: c.accent, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{`[SYSTEM TELEMETRY HUD // ${scene.toUpperCase()}]`}</div>
              <div style={{ fontSize: 12, color: c.fg }}>{`> MODEL_WEIGHTS: INVISIBLE BY DEFINITION`}</div>
              <div style={{ fontSize: 12, color: c.fg }}>{`> INTERFACE_LATENCY: 42ms (NOMINAL)`}</div>
              <div style={{ fontSize: 12, color: c.muted }}>{`> PPCEE_PIPELINE: PROMPT -> PREVIEW -> CONFIRM -> EXECUTE -> EXPLAIN`}</div>
              <div style={{ marginTop: 20, padding: 16, border: `1px dashed ${c.accent}`, backgroundColor: "rgba(0,0,0,0.5)" }}>
                <div style={{ fontSize: 13, color: c.accent, fontWeight: 700, marginBottom: 8 }}>{`LIVE COMMAND STREAM:`}</div>
                <div style={{ fontSize: 12, color: c.fg }}>{`1. Questioning requirement: Strip unnecessary fields`}</div>
                <div style={{ fontSize: 12, color: c.fg }}>{`2. Deleting process: Reduced from 5 steps to 1 step`}</div>
                <div style={{ fontSize: 12, color: c.accent }}>{`3. Execution confirmed: Agent active in viewport`}</div>
              </div>
            </div>
            <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Telemetry Specs</h3>
              {["CPU Load: 12%", "Memory: 256MB", "Latency: 40ms", "Trust Index: 100%"].map((item) => (
                <div key={item} style={{ padding: "8px 12px", border: `1px solid ${c.border}`, fontSize: 12, fontFamily: `"${t.tokens.typography.font_mono}", monospace` }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        ) : arch === "triage" ? (
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "240px 1fr 280px", gap: 16 }}>
            <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: c.accent }}>TRIAGE QUEUE</span>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ padding: 10, border: `1px solid ${c.border}`, backgroundColor: i === 1 ? c.accent : "transparent", color: i === 1 ? c.bg : c.fg, fontWeight: 600, fontSize: 12 }}>
                  Task Item #00{i}
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, padding: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Unit 8200 Triage Workbench</h2>
              <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.6 }}>One person who owns a feature end-to-end will out-execute five people who each own one-fifth of it. Total accountability produces sharp decisions.</p>
              <div style={{ marginTop: 24, padding: 16, border: `1px solid ${c.border}`, backgroundColor: c.bg }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.accent, marginBottom: 6 }}>ACTIVE TASK SPECS</div>
                <div style={{ fontSize: 13, color: c.fg }}>Autonomous action previewable and reversible before execution.</div>
              </div>
            </div>
            <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, padding: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: c.muted }}>INSPECTOR</span>
              <div style={{ marginTop: 12, fontSize: 12, color: c.fg }}>Status: Verified</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 80px" }}>
            <h1 style={{ fontFamily: `"${t.tokens.typography.font_display}", serif`, fontSize: 36, fontWeight: 700, margin: "0 0 12px", color: c.fg }}>
              {t.name}
            </h1>
            <p style={{ fontSize: 16, color: c.muted, maxWidth: 600, marginBottom: 28, lineHeight: 1.5 }}>
              {t.vibe}
            </p>
            <div style={{ width: 500, padding: 20, backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: r === "pill" ? 24 : 12, boxShadow: "0 12px 32px rgba(0,0,0,0.15)" }}>
              <div style={{ fontSize: 13, color: c.accent, fontWeight: 600, marginBottom: 8 }}>{`[${SCHOOL_LABELS[t.school]}]`}</div>
              <div style={{ fontSize: 14, color: c.fg, fontWeight: 500 }}>{t.rule_citation}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
  const [scene, setScene] = useState<PageSceneType>("main");

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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ fontFamily: `"${t.tokens.typography.font_display}", serif`, fontSize: 18, fontWeight: 600, margin: 0, color: c.fg }}>{t.name}</p>
            <span style={{ fontSize: 11, padding: "2px 8px", backgroundColor: c.bg, border: `1px solid ${c.border}`, borderRadius: 4, color: c.accent, fontWeight: 600 }}>
              {SCHOOL_LABELS[t.school]}
            </span>
          </div>
          <p style={{ fontSize: 12, margin: 0, color: c.muted }}>{t.rule_citation}</p>
        </div>

        {/* Color swatches */}
        <div style={{ display: "flex", gap: 6 }}>
          {[c.bg, c.surface, c.muted, c.accent].map((col, i) => (
            <div key={i} style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: col, border: `1px solid ${c.border}` }} title={col} />
          ))}
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
          Confirm & Use Design
        </button>
      </div>

      {/* Page preview — artboard */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
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
            <DetailSceneRenderer t={t} scene={scene} />
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

function ScaleArtboard() {
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight - 64 - 72 - 24;
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
      {/* Preview area with Layout Archetype */}
      <div style={{ width: 180, height: 120, overflow: "hidden", backgroundColor: c.bg, position: "relative" }}>
        <MiniPreview t={t} />
      </div>
      {/* Label & Field Manual citation */}
      <div
        style={{
          width: 180,
          padding: "10px 12px 11px",
          backgroundColor: c.surface,
          borderTop: `1px solid ${c.border}`,
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c.fg, fontFamily: `"${t.tokens.typography.font_sans}", system-ui`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t.name}
          </p>
        </div>
        <p style={{ margin: "2px 0 0", fontSize: 9, color: c.accent, fontWeight: 600, fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {SCHOOL_LABELS[t.school]}
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
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          backgroundColor: "#08090e",
          color: "#f0f0f4",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 64,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
            gap: 16,
            flexShrink: 0,
            backgroundColor: "#0d0e14",
          }}
        >
          <Compass size={22} style={{ color: "#38bdf8", flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>
              Field Manual V1 — Design Architecture Gallery
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              5 Schools of Thought · 8 Structural Layout Archetypes · Real UI Parallels
            </p>
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: "relative", width: 260 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", pointerEvents: "none" }} />
            <input
              type="search"
              placeholder="Search schools, rules, or styles…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 36,
                paddingLeft: 32,
                paddingRight: 12,
                backgroundColor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
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
              padding: "8px 16px",
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
            height: 48,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: 6,
            flexShrink: 0,
            overflowX: "auto",
            backgroundColor: "#0a0b10",
          }}
        >
          <CategoryPill
            label="All Architectures"
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
              <p style={{ margin: 0 }}>No design architectures match "{search}"</p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
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
      </div>

      {/* Detail overlay */}
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
        gap: 6,
        height: 28,
        padding: "0 12px",
        borderRadius: 99,
        border: active ? "1px solid rgba(56,189,248,0.6)" : "1px solid rgba(255,255,255,0.08)",
        backgroundColor: active ? "rgba(56,189,248,0.18)" : "transparent",
        color: active ? "#38bdf8" : "rgba(255,255,255,0.45)",
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
