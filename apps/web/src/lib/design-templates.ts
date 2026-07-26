/**
 * design-templates.ts
 *
 * Field Manual V1 — The Builder's Blueprint Design Engine.
 * Encodes the 5 Schools of Thought and Field Manual Rules into
 * 96 distinct design templates with 8 structural layout archetypes.
 */

export type FieldManualSchool =
  | "silicon-valley"      // School 01: Ship smallest, rapid iteration stream
  | "spacex-tesla"        // School 02: First principles, zero chrome, Telemetry HUD
  | "apple"               // School 03: Restraint, Zen glass, typography-first
  | "unit-8200"           // School 04: Tactical triage workbench, dual pane
  | "shenzhen"            // School 05: Circuit revision, modular grid matrix
  | "ppcee-loop"          // Method 2.4: Prompt > Preview > Confirm > Execute > Explain
  | "musk-algorithm"      // Method 2.1: Question > Delete > Simplify > Accelerate > Automate
  | "editorial-reader";   // Literary & Broadsheet typography

export type LayoutArchetype =
  | "hud"          // SpaceX Telemetry HUD: Top telemetry gauges, monospaced data feed
  | "zen"          // Apple Zen Glass Studio: Centered hero, floating pill nav, whitespace
  | "triage"       // Unit 8200 Workbench: Split pane, tree nav + detail inspector
  | "matrix"       // Shenzhen Circuit: Modular component tiles, hardware LEDs
  | "stream"       // Silicon Valley Launchpad: Action feed, quick chips, floating bar
  | "ppcee"        // PPCEE Pipeline: 5-stage workflow cards (Prompt, Preview, Confirm, Exec, Explain)
  | "terminal"     // CRT/CLI Console: Phosphor text, ASCII headers, prompt command line
  | "editorial";   // Broadsheet Reader: Multi-column typography, drop caps, pull quotes

export type TemplateCategory =
  | "minimal"
  | "editorial"
  | "dark-pro"
  | "glassmorphism"
  | "colorful"
  | "dashboard"
  | "brutalist"
  | "terminal"
  | "organic"
  | "luxury"
  | "neumorphic"
  | "retro";

export type RadiusMode = "sharp" | "rounded" | "pill";
export type MotionMode = "instant" | "fluid" | "bouncy";

export type DesignTemplate = {
  id: string;
  name: string;
  category: TemplateCategory;
  school: FieldManualSchool;
  layout_archetype: LayoutArchetype;
  vibe: string;
  rule_citation: string;
  tokens: {
    colors: {
      bg: string;
      fg: string;
      surface: string;
      muted: string;
      accent: string;
      border: string;
    };
    typography: {
      font_display: string;
      font_sans: string;
      font_mono: string;
    };
    radius: RadiusMode;
    motion: MotionMode;
  };
};

export const SCHOOL_LABELS: Record<FieldManualSchool, string> = {
  "silicon-valley":    "School 01 · Silicon Valley",
  "spacex-tesla":      "School 02 · SpaceX & Tesla",
  "apple":             "School 03 · Apple Restraint",
  "unit-8200":         "School 04 · Unit 8200",
  "shenzhen":          "School 05 · Shenzhen Hardware",
  "ppcee-loop":        "Method 2.4 · PPCEE Pipeline",
  "musk-algorithm":    "Method 2.1 · Musk Algorithm",
  "editorial-reader":  "Editorial & Broadsheet",
};

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  minimal: "Minimal",
  editorial: "Editorial",
  "dark-pro": "Dark Pro",
  glassmorphism: "Glassmorphism",
  colorful: "Colorful",
  dashboard: "Dashboard",
  brutalist: "Brutalist",
  terminal: "Terminal",
  organic: "Organic",
  luxury: "Luxury",
  neumorphic: "Neumorphic",
  retro: "Retro",
};

export const ALL_CATEGORIES: TemplateCategory[] = [
  "minimal", "editorial", "dark-pro", "glassmorphism", "colorful",
  "dashboard", "brutalist", "terminal", "organic", "luxury", "neumorphic", "retro",
];

// ─── Factory ─────────────────────────────────────────────────────────────────

function tpl(
  id: string, name: string, category: TemplateCategory,
  school: FieldManualSchool, layout_archetype: LayoutArchetype,
  vibe: string, rule_citation: string,
  bg: string, fg: string, surface: string, muted: string, accent: string, border: string,
  dispFont: string, sansFont: string, monoFont: string,
  radius: RadiusMode, motion: MotionMode
): DesignTemplate {
  return {
    id, name, category, school, layout_archetype, vibe, rule_citation,
    tokens: {
      colors: { bg, fg, surface, muted, accent, border },
      typography: { font_display: dispFont, font_sans: sansFont, font_mono: monoFont },
      radius, motion,
    },
  };
}

// ─── Templates ───────────────────────────────────────────────────────────────

export const DESIGN_TEMPLATES: DesignTemplate[] = [

  // ── SCHOOL 02: SPACEX & TESLA (FIRST PRINCIPLES TELEMETRY HUD) ──────────────
  tpl("spacex-telemetry", "SpaceX Telemetry HUD", "dark-pro", "spacex-tesla", "hud",
    "Zero chrome, raw telemetry, mission critical", "School 02: The best part is no part. The best process is no process.",
    "#05080c", "#00f0ff", "#0b121b", "#3a5673", "#00f0ff", "rgba(0,240,255,0.2)",
    "JetBrains Mono", "Inter", "JetBrains Mono", "sharp", "instant"),

  tpl("tesla-cyber",     "Tesla Cybertruck HUD", "dark-pro", "spacex-tesla", "hud",
    "Angular stainless steel, laser cyan readout", "Method 2.1: Question -> Delete -> Simplify -> Accelerate -> Automate",
    "#0a0a0c", "#f0f0f0", "#141418", "#5a5a66", "#22d3ee", "rgba(255,255,255,0.12)",
    "Fira Code", "Inter", "Fira Code", "sharp", "instant"),

  tpl("starship-control","Starship Command HUD", "terminal", "spacex-tesla", "hud",
    "High-contrast vector grid, real-time sensor meters", "Rule 01: Question the requirement before you design it",
    "#00040a", "#38bdf8", "#030f1c", "#1e3a5f", "#38bdf8", "rgba(56,189,248,0.25)",
    "Source Code Pro", "Source Code Pro", "Source Code Pro", "sharp", "instant"),

  // ── SCHOOL 03: APPLE (RESTRAINT, ZEN GLASS, TYPOGRAPHY-FIRST) ──────────────
  tpl("apple-zen-glass", "Apple Zen Glass Studio", "glassmorphism", "apple", "zen",
    "Frosted glassmorphism, generous whitespace, quiet deference", "School 03: Say no to a thousand things so the one thing left is obvious.",
    "#f5f5f7", "#1d1d1f", "rgba(255,255,255,0.72)", "#8e8e93", "#0071e3", "rgba(0,0,0,0.08)",
    "SF Pro Display", "Inter", "JetBrains Mono", "pill", "fluid"),

  tpl("mac-monarch",     "Mac Monarch Studio", "minimal", "apple", "zen",
    "Subtle depth, precise typography, single focal point", "Method 2.2: Clarity, Deference, Depth as a review checklist",
    "#ffffff", "#000000", "#f8f8fa", "#6e6e73", "#6366f1", "rgba(0,0,0,0.06)", "Plus Jakarta Sans", "Plus Jakarta Sans", "Source Code Pro", "rounded", "fluid"),

  tpl("vision-spatial",  "Vision Spatial Glass", "glassmorphism", "apple", "zen",
    "Translucent spatial depth, soft ambient glow", "Rule 02: The Interface Is the Entire Product",
    "#0c0b14", "#f8f8fc", "rgba(255,255,255,0.08)", "#7a7893", "#c084fc", "rgba(255,255,255,0.15)",
    "Outfit", "Outfit", "JetBrains Mono", "pill", "bouncy"),

  // ── SCHOOL 04: UNIT 8200 (TACTICAL COMMAND TRIAGE WORKBENCH) ───────────────
  tpl("unit8200-triage", "Unit 8200 Tactical Workbench", "dashboard", "unit-8200", "triage", "Dual-pane threat triage, total ownership, split-screen", "School 04: Small teams, total ownership, zero hand-offs, real consequences.",
    "#0b0f19", "#e2e8f0", "#111827", "#4b5563", "#10b981", "rgba(16,185,129,0.2)",
    "Inter", "Inter", "Fira Code", "sharp", "instant"),

  tpl("triage-command",  "Tactical Intel Workbench", "dark-pro", "unit-8200", "triage",
    "High-density triage tree, status badges, split inspector", "Rule 04: One person who owns a feature end-to-end will out-execute five",
    "#070a10", "#cbd5e1", "#0f172a", "#475569", "#f59e0b", "rgba(245,158,11,0.2)",
    "JetBrains Mono", "Inter", "JetBrains Mono", "sharp", "instant"),

  tpl("cyber-defence",   "Cyber Defence Station", "terminal", "unit-8200", "triage",
    "Split-pane security triage, live event stream", "Method 2.5: Red-Team Review before any design is considered done",
    "#090d16", "#94a3b8", "#111a2e", "#334155", "#ef4444", "rgba(239,68,68,0.25)",
    "Source Code Pro", "Inter", "Source Code Pro", "sharp", "instant"),

  // ── SCHOOL 05: SHENZHEN (CIRCUIT REVISION MODULAR MATRIX) ──────────────────
  tpl("shenzhen-circuit","Shenzhen Modular Matrix", "dashboard", "shenzhen", "matrix",
    "Breadboard pin grid, modular component tiles, LED indicators", "School 05: Treat every screen like a circuit revision: cheap to prototype, fast to replace.",
    "#0e141b", "#e6edf3", "#161b22", "#484f58", "#3fb950", "rgba(63,185,80,0.25)",
    "Fira Code", "Inter", "Fira Code", "sharp", "instant"),

  tpl("hardware-lab",    "Hardware Lab Breadboard", "minimal", "shenzhen", "matrix",
    "Industrial utility, high component density, PCB copper accents", "Rule 05: Build Like Hardware, Ship Like Software",
    "#f4f4f0", "#1c1c1a", "#eaeae4", "#8c8c82", "#d97706", "rgba(28,28,26,0.15)",
    "Source Code Pro", "Source Sans 3", "Source Code Pro", "sharp", "instant"),

  // ── SCHOOL 01: SILICON VALLEY (RAPID STREAM LAUNCHPAD) ─────────────────────
  tpl("valley-launchpad","Silicon Valley Launchpad", "minimal", "silicon-valley", "stream",
    "Action feed, floating trigger bar, rapid iteration feedback", "School 01: Ship the smallest thing that teaches you something — then ship again tomorrow.",
    "#ffffff", "#0f172a", "#f8fafc", "#64748b", "#3b82f6", "rgba(15,23,42,0.08)",
    "Inter", "Inter", "JetBrains Mono", "rounded", "fluid"),

  tpl("speed-run",       "Speed Run Iteration", "colorful", "silicon-valley", "stream",
    "Vibrant action cards, quick-response chips, floating bar", "Rule 03: Speed Is a Feature, Not a Trade-off Against Quality",
    "#0a0f1d", "#f1f5f9", "#151d30", "#475569", "#ec4899", "rgba(236,72,153,0.2)",
    "Outfit", "Outfit", "JetBrains Mono", "pill", "bouncy"),

  // ── METHOD 2.4: PPCEE AUTONOMOUS PIPELINE ──────────────────────────────────
  tpl("ppcee-autonomous","PPCEE Autonomous Deck", "glassmorphism", "ppcee-loop", "ppcee",
    "Prompt -> Preview -> Confirm -> Execute -> Explain visual pipeline", "Rule 06: Trust Is the Real Feature of an Autonomous System",
    "#0d0b18", "#f3e8ff", "#18142a", "#6b5b95", "#a855f7", "rgba(168,85,247,0.2)",
    "Plus Jakarta Sans", "Plus Jakarta Sans", "Fira Code", "rounded", "fluid"),

  // ── METHOD 2.1: MUSK ALGORITHM FIRST PRINCIPLES ────────────────────────────
  tpl("musk-first-princ","Musk First Principles", "minimal", "musk-algorithm", "hud",
    "Stripped-back requirements: Question -> Delete -> Simplify -> Accelerate", "Method 2.1: Deleting the part or process is step two. Optimizing comes third.",
    "#09090b", "#fafafa", "#18181b", "#71717a", "#e11d48", "rgba(225,29,72,0.2)",
    "JetBrains Mono", "Inter", "JetBrains Mono", "sharp", "instant"),

  // ── EDITORIAL & BROADSHEET READER ──────────────────────────────────────────
  tpl("broadsheet-v1",   "Broadsheet Editorial", "editorial", "editorial-reader", "editorial",
    "Ink-on-paper authority, drop caps, literary column grid", "Field Manual Standard: High-fidelity reading, clear hierarchy",
    "#f6f2ea", "#1a1612", "#ebe5d8", "#8c8270", "#8b0000", "rgba(26,22,18,0.12)",
    "Playfair Display", "Source Sans 3", "Source Code Pro", "sharp", "fluid"),

  tpl("literary-gazette","Literary Gazette", "editorial", "editorial-reader", "editorial",
    "Warm cream paper, serif pull-quotes, traditional print feel", "Field Manual Standard: Restraint in typography and white space",
    "#faf6ee", "#231e18", "#f0e6d6", "#948672", "#b45309", "rgba(35,30,24,0.1)",
    "EB Garamond", "Nunito Sans", "Fira Code", "rounded", "fluid"),

  // ── RETRO CLI / TERMINAL ───────────────────────────────────────────────────
  tpl("green-phosphor",  "Green CRT Terminal", "terminal", "spacex-tesla", "terminal",
    "Phosphor scanlines, pure CLI prompt, zero distraction", "Field Manual Standard: Hardware precision, raw terminal feed",
    "#050d05", "#22c55e", "#0a190a", "#15803d", "#4ade80", "rgba(34,197,94,0.2)",
    "Source Code Pro", "Source Code Pro", "Source Code Pro", "sharp", "instant"),

  tpl("amber-vt100",     "Amber VT100 Terminal", "terminal", "spacex-tesla", "terminal",
    "Cathode amber glow, command line interface", "Field Manual Standard: Monospaced telemetry deck",
    "#0d0800", "#f59e0b", "#1a1000", "#b45309", "#fbbf24", "rgba(245,158,11,0.2)",
    "Source Code Pro", "Source Code Pro", "Source Code Pro", "sharp", "instant"),
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function filterTemplates(
  templates: DesignTemplate[],
  query: string,
  category: TemplateCategory | "all"
): DesignTemplate[] {
  const q = query.toLowerCase().trim();
  return templates.filter((t) => {
    const matchCat = category === "all" || t.category === category;
    const matchQ = !q
      || t.name.toLowerCase().includes(q)
      || t.vibe.toLowerCase().includes(q)
      || t.rule_citation.toLowerCase().includes(q)
      || t.category.toLowerCase().includes(q)
      || t.school.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
}

/** Convert DesignTemplate tokens → kindThemeCssVars-compatible object for AgentIsolatedShell */
export function templateToDesignSystem(t: DesignTemplate) {
  return {
    personality: t.id,
    school: t.school,
    layout_archetype: t.layout_archetype,
    rule_citation: t.rule_citation,
    emotional_goals: [t.category, t.vibe, t.rule_citation],
    tokens: {
      colors: t.tokens.colors,
      typography: t.tokens.typography,
      radius: t.tokens.radius,
      motion: {
        enter: t.tokens.motion === "bouncy"
          ? "fade-up 320ms cubic-bezier(0.34,1.56,0.64,1)"
          : t.tokens.motion === "instant"
            ? "fade-in 80ms linear"
            : "fade-up 260ms cubic-bezier(0.22,1,0.36,1)",
        micro: t.tokens.motion === "instant" ? "60ms linear" : "120ms ease",
      },
    },
  };
}

/** Google Fonts URL for a given display+sans+mono combination */
const FONT_URLS: Record<string, string> = {
  "Inter":             "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  "DM Sans":           "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap",
  "Outfit":            "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap",
  "Plus Jakarta Sans": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap",
  "Nunito Sans":       "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap",
  "EB Garamond":       "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap",
  "Lora":              "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap",
  "Playfair Display":  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap",
  "Merriweather":      "https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;1,400&display=swap",
  "Crimson Pro":       "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap",
  "Source Sans 3":     "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap",
  "JetBrains Mono":    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap",
  "Fira Code":         "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap",
  "Source Code Pro":   "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap",
};

export function loadTemplateFonts(t: DesignTemplate): void {
  if (typeof document === "undefined") return;
  const fonts = new Set([t.tokens.typography.font_display, t.tokens.typography.font_sans, t.tokens.typography.font_mono]);
  fonts.forEach((font) => {
    const url = FONT_URLS[font];
    if (!url) return;
    if (document.querySelector(`link[href="${url}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  });
}
