/**
 * agent-kind-themes.ts
 *
 * Every agent kind gets its own visual identity — deliberately designed so a
 * Chat agent feels nothing like a Tool agent feels nothing like an Analyzer.
 *
 * These are the *base* palettes. Any agent-level design_system the creator
 * defines is merged on top and always wins.
 */

import type { DesignSystem } from "@/components/DesignTokenProvider";
import type { AgentKind } from "@/lib/agent-kinds";

// ─────────────────────────────────────────────────────────────────────────────
// Per-kind palettes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CHAT — Midnight Companion
 * Deep navy canvas, warm ivory type, literary serif display.
 * Feels personal, intimate, like a private notebook.
 */
export const CHAT_KIND_THEME: DesignSystem = {
  personality: "midnight_companion",
  emotional_goals: ["intimate", "warm", "focused"],
  tokens: {
    colors: {
      bg: "#0d1117",
      fg: "#f0ece2",
      surface: "#161b26",
      muted: "#7a7e8a",
      accent: "#7c9ef8",
      border: "rgba(240,236,226,0.08)",
    },
    typography: {
      font_display: "Lora",
      font_sans: "Inter",
      font_mono: "JetBrains Mono",
    },
    radius: {
      card: "16px",
      pill: "999px",
      control: "10px",
      media: "8px",
    },
    motion: {
      enter: "fade-up 280ms cubic-bezier(0.22, 1, 0.36, 1)",
      micro: "120ms ease",
    },
  },
};

/**
 * TOOL — Precision Edge
 * Near-black background, electric cyan accent, monospace-first typography.
 * Clinical, exact, no decoration — every pixel earns its place.
 */
export const TOOL_KIND_THEME: DesignSystem = {
  personality: "precision_edge",
  emotional_goals: ["clarity", "speed", "exactness"],
  tokens: {
    colors: {
      bg: "#0a0a0c",
      fg: "#e8eaf0",
      surface: "#111216",
      muted: "#5c5f6e",
      accent: "#00d4d8",
      border: "rgba(0,212,216,0.12)",
    },
    typography: {
      font_display: "IBM Plex Mono",
      font_sans: "IBM Plex Sans",
      font_mono: "IBM Plex Mono",
    },
    radius: {
      card: "8px",
      pill: "6px",
      control: "6px",
      media: "4px",
    },
    motion: {
      enter: "fade-in 180ms linear",
      micro: "80ms linear",
    },
  },
};

/**
 * TRANSFORMER — Studio Violet
 * Rich dark-purple canvas, lavender surface, editorial serif + grotesque.
 * Creative studio energy — transforms raw material into something new.
 */
export const TRANSFORMER_KIND_THEME: DesignSystem = {
  personality: "studio_violet",
  emotional_goals: ["creative", "expressive", "editorial"],
  tokens: {
    colors: {
      bg: "#12082a",
      fg: "#f4f0ff",
      surface: "#1d1040",
      muted: "#8b7ab8",
      accent: "#c084fc",
      border: "rgba(192,132,252,0.15)",
    },
    typography: {
      font_display: "Playfair Display",
      font_sans: "DM Sans",
      font_mono: "Fira Code",
    },
    radius: {
      card: "20px",
      pill: "999px",
      control: "12px",
      media: "10px",
    },
    motion: {
      enter: "fade-up 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      micro: "150ms cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
  },
};

/**
 * ANALYZER — Forest Insight
 * Dark forest green backdrop, crisp emerald accent, paper-like surface.
 * Research-grade, methodical — like studying a well-lit report at night.
 */
export const ANALYZER_KIND_THEME: DesignSystem = {
  personality: "forest_insight",
  emotional_goals: ["methodical", "trustworthy", "deep"],
  tokens: {
    colors: {
      bg: "#071a12",
      fg: "#dff2e8",
      surface: "#0e2c1e",
      muted: "#5a8a6e",
      accent: "#34d399",
      border: "rgba(52,211,153,0.12)",
    },
    typography: {
      font_display: "Source Serif 4",
      font_sans: "Nunito Sans",
      font_mono: "Source Code Pro",
    },
    radius: {
      card: "12px",
      pill: "999px",
      control: "8px",
      media: "6px",
    },
    motion: {
      enter: "fade-in 240ms ease",
      micro: "100ms ease",
    },
  },
};

/**
 * AUTOMATION — Amber Workflow
 * Warm charcoal background, golden amber accent, structured and systematic.
 * Feels like a command center — dependable, organized, always running.
 */
export const AUTOMATION_KIND_THEME: DesignSystem = {
  personality: "amber_workflow",
  emotional_goals: ["systematic", "dependable", "efficient"],
  tokens: {
    colors: {
      bg: "#100e08",
      fg: "#f5ede0",
      surface: "#1c190e",
      muted: "#7a6e50",
      accent: "#f59e0b",
      border: "rgba(245,158,11,0.14)",
    },
    typography: {
      font_display: "Barlow",
      font_sans: "Barlow",
      font_mono: "Roboto Mono",
    },
    radius: {
      card: "10px",
      pill: "999px",
      control: "8px",
      media: "6px",
    },
    motion: {
      enter: "fade-up 200ms ease",
      micro: "90ms ease",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Palette map
// ─────────────────────────────────────────────────────────────────────────────

const KIND_THEMES: Record<AgentKind, DesignSystem> = {
  chat: CHAT_KIND_THEME,
  tool: TOOL_KIND_THEME,
  transformer: TRANSFORMER_KIND_THEME,
  analyzer: ANALYZER_KIND_THEME,
  automation: AUTOMATION_KIND_THEME,
};

// ─────────────────────────────────────────────────────────────────────────────
// Resolver — kind palette as base, agent design_system always wins on top
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the final DesignSystem for an agent.
 *
 * Priority (highest → lowest):
 *   1. Agent's own design_system tokens (set by creator)
 *   2. Kind palette tokens (set here)
 *
 * This ensures:
 * - Every agent has a strong, unique visual identity by default.
 * - Creators who deliberately design their agent can override anything.
 */
export function resolveAgentKindTheme(
  kind: AgentKind,
  agentDesignSystem?: DesignSystem | null
): DesignSystem {
  const base = KIND_THEMES[kind] || TOOL_KIND_THEME;
  const incoming = agentDesignSystem || {};
  const baseTokens = base.tokens || {};
  const inTokens = incoming.tokens || {};

  return {
    personality: String(incoming.personality || base.personality || ""),
    emotional_goals:
      Array.isArray(incoming.emotional_goals) && incoming.emotional_goals.length > 0
        ? incoming.emotional_goals
        : base.emotional_goals || [],
    references:
      Array.isArray(incoming.references) && incoming.references.length > 0
        ? incoming.references
        : [],
    chrome: {
      mode: "isolated",
      omnia_shell: false,
      product_nav_only: false,
    },
    tokens: {
      colors: {
        ...(baseTokens.colors || {}),
        ...(inTokens.colors || {}),
      },
      typography: {
        ...(baseTokens.typography || {}),
        ...(inTokens.typography || {}),
      },
      space: {
        ...(baseTokens.space || {}),
        ...(inTokens.space || {}),
        ...(inTokens.spacing || {}),
      },
      radius:
        typeof inTokens.radius === "string"
          ? inTokens.radius
          : {
              ...((typeof baseTokens.radius === "object" && baseTokens.radius) || {}),
              ...((typeof inTokens.radius === "object" && inTokens.radius) || {}),
            },
      motion: {
        ...(baseTokens.motion || {}),
        ...(inTokens.motion || {}),
      },
    },
  };
}

/** CSS variable map for the given resolved design system — used inline on the shell root.
 *
 * Emits BOTH the OMNIA standard variable names (--background, --foreground,
 * --surface, --muted, --alive, --border …) AND the --ak-* / --pf-* names so
 * that every OMNIA component and Tailwind utility inside the shell inherits
 * the kind theme automatically — no class overrides needed.
 *
 * CSS custom properties cascade down the DOM tree, so setting these on the
 * shell's root div overrides :root for all descendants.
 */
export function kindThemeCssVars(ds: DesignSystem): Record<string, string> {
  const colors = ds.tokens?.colors || {};
  const typo   = ds.tokens?.typography || {};

  const bg      = String(colors.bg      || "#0a0a0c");
  const fg      = String(colors.fg      || "#f0f0f0");
  const surface = String(colors.surface || "#111216");
  const muted   = String(colors.muted   || "#666");
  const accent  = String(colors.accent  || "#7c9ef8");
  const border  = String(colors.border  || "rgba(255,255,255,0.08)");

  // Derive an "elevated" surface that's slightly lighter for modals/tooltips.
  // We can't do real math in JS for hex colours without a library, so we
  // reuse surface for now — good enough for distinct theming.
  const surfaceElevated = surface;

  const fontBody    = typo.font_sans
    ? `"${typo.font_sans}", system-ui, sans-serif`
    : '"Inter", system-ui, sans-serif';
  const fontDisplay = typo.font_display
    ? `"${typo.font_display}", Georgia, serif`
    : fontBody;
  const fontMono    = typo.font_mono
    ? `"${typo.font_mono}", monospace`
    : '"JetBrains Mono", monospace';

  return {
    // ── Kind-scoped aliases (used by .agent-isolated-shell CSS rules) ────────
    "--ak-bg":      bg,
    "--ak-fg":      fg,
    "--ak-surface": surface,
    "--ak-muted":   muted,
    "--ak-accent":  accent,
    "--ak-border":  border,

    // ── OMNIA standard variables — THESE are what all components read ────────
    // Override every :root token so the kind theme takes full effect inside
    // the shell without touching a single component's className.
    "--background":       bg,
    "--foreground":       fg,
    "--canvas":           bg,
    "--sidebar":          surface,
    "--nav-selected":     surfaceElevated,
    "--text-primary":     fg,
    "--text-secondary":   muted,
    "--text-tertiary":    muted,
    "--muted":            muted,
    "--surface":          surface,
    "--surface-solid":    surface,
    "--surface-elevated": surfaceElevated,
    "--primary":          accent,
    "--alive":            accent,
    "--accent":           accent,
    "--on-alive":         bg,
    "--border":           border,
    "--ring":             accent,
    "--glow":             `color-mix(in srgb, ${accent} 20%, transparent)`,
    "--mesh-a":           `color-mix(in srgb, ${surface} 55%, transparent)`,
    "--mesh-b":           `color-mix(in srgb, ${bg} 82%, transparent)`,
    "--mesh-c":           `color-mix(in srgb, ${accent} 9%, transparent)`,
    "--constellation":    accent,
    "--shadow-soft":      "0 4px 24px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25)",
    "--shadow-float":     "0 16px 48px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)",
    "--radius-control":   "1.25rem",
    "--radius-panel":     "1.75rem",

    // ── Product-frame vars (ProductAppShell / ProductShell) ─────────────────
    "--pf-bg":           bg,
    "--pf-fg":           fg,
    "--pf-surface":      surface,
    "--pf-muted":        muted,
    "--pf-accent":       accent,
    "--pf-border":       border,
    "--pf-font-display": fontDisplay,
    "--pf-font-body":    fontBody,
    "--pf-font-mono":    fontMono,

    // ── Font stack — overrides the html-level default for elements inside ──
    "--omnia-font-stack": fontBody,
  };
}
