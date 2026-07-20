/** Appearance preferences — typography, chat, sidebar, motion (persisted locally). */

export type FontFamilyId = "system" | "serif" | "mono" | "dyslexic";
export type MessageStyleId = "bubble" | "flat";
export type SidebarLayoutId = "expanded" | "collapsed";
export type SidebarPinId = "pinned" | "auto-hide";

export const APPEARANCE_STORAGE_KEY = "omnia-appearance";

/** Continuous UI scale: 0.5× (~8px) → 2.5× (~40px). Default 1× = 16px. */
export const FONT_SCALE_MIN = 0.5;
export const FONT_SCALE_MAX = 2.5;
export const FONT_SCALE_DEFAULT = 1;
export const FONT_SCALE_STEP = 0.05;

/** Message / UI compactness: 0.25× packed → 3× airy. Default 1×. */
export const DENSITY_SCALE_MIN = 0.25;
export const DENSITY_SCALE_MAX = 3;
export const DENSITY_SCALE_DEFAULT = 1;
export const DENSITY_SCALE_STEP = 0.05;

export const SIDEBAR_WIDTH_MIN = 200;
export const SIDEBAR_WIDTH_MAX = 360;
export const SIDEBAR_WIDTH_DEFAULT = 280;
export const SIDEBAR_COLLAPSED_WIDTH = 72;

export const FONT_STACKS: Record<FontFamilyId, string> = {
  system:
    '"SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", var(--font-body), system-ui, sans-serif',
  serif:
    'var(--font-serif), "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", Times, serif',
  mono: 'var(--font-mono), "SF Mono", ui-monospace, Menlo, Consolas, monospace',
  dyslexic:
    'OpenDyslexic, "OpenDyslexic Regular", "Comic Sans MS", var(--font-body), system-ui, sans-serif',
};

export type AppearancePrefs = {
  /** Multiplier on 16px root — continuous slider value */
  fontScale: number;
  fontFamily: FontFamilyId;
  /** Multiplier on chat/UI spacing — continuous slider */
  densityScale: number;
  messageStyle: MessageStyleId;
  sidebarLayout: SidebarLayoutId;
  sidebarPin: SidebarPinId;
  sidebarWidth: number;
  reduceMotion: boolean;
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  fontScale: FONT_SCALE_DEFAULT,
  fontFamily: "system",
  densityScale: DENSITY_SCALE_DEFAULT,
  messageStyle: "bubble",
  sidebarLayout: "expanded",
  sidebarPin: "pinned",
  sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
  reduceMotion: false,
};

const FONT_FAMILY_IDS: FontFamilyId[] = ["system", "serif", "mono", "dyslexic"];
const STYLE_IDS: MessageStyleId[] = ["bubble", "flat"];
const SIDEBAR_LAYOUT_IDS: SidebarLayoutId[] = ["expanded", "collapsed"];
const SIDEBAR_PIN_IDS: SidebarPinId[] = ["pinned", "auto-hide"];

/** Legacy stepped ids → scale (migrate old localStorage). */
const LEGACY_FONT_SIZE: Record<string, number> = {
  sm: 0.875,
  default: 1,
  lg: 1.125,
  xl: 1.22,
};

const LEGACY_DENSITY: Record<string, number> = {
  compact: 0.5,
  comfortable: 1,
  spacious: 1.75,
};

export function isFontFamilyId(v: string): v is FontFamilyId {
  return FONT_FAMILY_IDS.includes(v as FontFamilyId);
}
export function isMessageStyleId(v: string): v is MessageStyleId {
  return STYLE_IDS.includes(v as MessageStyleId);
}
export function isSidebarLayoutId(v: string): v is SidebarLayoutId {
  return SIDEBAR_LAYOUT_IDS.includes(v as SidebarLayoutId);
}
export function isSidebarPinId(v: string): v is SidebarPinId {
  return SIDEBAR_PIN_IDS.includes(v as SidebarPinId);
}

export function clampFontScale(n: number): number {
  if (!Number.isFinite(n)) return FONT_SCALE_DEFAULT;
  const stepped = Math.round(n / FONT_SCALE_STEP) * FONT_SCALE_STEP;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(stepped * 100) / 100));
}

export function clampDensityScale(n: number): number {
  if (!Number.isFinite(n)) return DENSITY_SCALE_DEFAULT;
  const stepped = Math.round(n / DENSITY_SCALE_STEP) * DENSITY_SCALE_STEP;
  return Math.min(DENSITY_SCALE_MAX, Math.max(DENSITY_SCALE_MIN, Math.round(stepped * 100) / 100));
}

export function clampSidebarWidth(n: number): number {
  if (!Number.isFinite(n)) return SIDEBAR_WIDTH_DEFAULT;
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(n)));
}

function parseFontScale(raw: unknown): number {
  if (typeof raw === "number") return clampFontScale(raw);
  if (typeof raw === "string" && raw in LEGACY_FONT_SIZE) {
    return LEGACY_FONT_SIZE[raw];
  }
  return FONT_SCALE_DEFAULT;
}

function parseDensityScale(raw: unknown, legacyDensity?: unknown): number {
  if (typeof raw === "number") return clampDensityScale(raw);
  if (typeof legacyDensity === "string" && legacyDensity in LEGACY_DENSITY) {
    return LEGACY_DENSITY[legacyDensity];
  }
  return DENSITY_SCALE_DEFAULT;
}

export function readAppearancePrefs(): AppearancePrefs {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs> & {
      fontSize?: unknown;
      messageDensity?: unknown;
    };
    return {
      fontScale: parseFontScale(
        parsed.fontScale !== undefined ? parsed.fontScale : parsed.fontSize
      ),
      fontFamily: isFontFamilyId(parsed.fontFamily || "")
        ? parsed.fontFamily!
        : DEFAULT_APPEARANCE.fontFamily,
      densityScale: parseDensityScale(parsed.densityScale, parsed.messageDensity),
      messageStyle: isMessageStyleId(parsed.messageStyle || "")
        ? parsed.messageStyle!
        : DEFAULT_APPEARANCE.messageStyle,
      sidebarLayout: isSidebarLayoutId(parsed.sidebarLayout || "")
        ? parsed.sidebarLayout!
        : DEFAULT_APPEARANCE.sidebarLayout,
      sidebarPin: isSidebarPinId(parsed.sidebarPin || "")
        ? parsed.sidebarPin!
        : DEFAULT_APPEARANCE.sidebarPin,
      sidebarWidth: clampSidebarWidth(
        typeof parsed.sidebarWidth === "number" ? parsed.sidebarWidth : DEFAULT_APPEARANCE.sidebarWidth
      ),
      reduceMotion: typeof parsed.reduceMotion === "boolean" ? parsed.reduceMotion : false,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function writeAppearancePrefs(prefs: AppearancePrefs) {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function applyAppearancePrefs(prefs: AppearancePrefs) {
  const root = document.documentElement;
  const scale = clampFontScale(prefs.fontScale);
  const density = clampDensityScale(prefs.densityScale);
  root.style.setProperty("--omnia-font-scale", String(scale));
  root.style.setProperty("--omnia-font-stack", FONT_STACKS[prefs.fontFamily]);
  root.style.setProperty("--omnia-density-scale", String(density));
  // Set derived chat tokens inline so spacing updates immediately (not only via stylesheet calc).
  root.style.setProperty("--chat-turn-gap", `calc(1.25rem * ${density})`);
  root.style.setProperty("--chat-bubble-pad-x", `calc(1rem * ${density})`);
  root.style.setProperty("--chat-bubble-pad-y", `calc(0.75rem * ${density})`);
  root.style.setProperty("--chat-row-gap", `calc(0.75rem * ${density})`);
  root.setAttribute("data-font-family", prefs.fontFamily);
  root.setAttribute("data-message-style", prefs.messageStyle);
  root.setAttribute("data-sidebar-layout", prefs.sidebarLayout);
  root.setAttribute("data-sidebar-pin", prefs.sidebarPin);
  root.setAttribute("data-reduce-motion", prefs.reduceMotion ? "true" : "false");
  root.setAttribute("data-density", String(density));
  root.style.setProperty("--sidebar-width", `${clampSidebarWidth(prefs.sidebarWidth)}px`);
  root.style.setProperty("--sidebar-collapsed-width", `${SIDEBAR_COLLAPSED_WIDTH}px`);
}

export const FONT_FAMILY_OPTIONS: { id: FontFamilyId; label: string; hint: string }[] = [
  { id: "system", label: "System", hint: "SF Pro / system sans" },
  { id: "serif", label: "Serif", hint: "Reading & long-form" },
  { id: "mono", label: "Monospace", hint: "Code-forward UI" },
  { id: "dyslexic", label: "OpenDyslexic", hint: "Dyslexia-friendly" },
];

export const MESSAGE_STYLE_OPTIONS: { id: MessageStyleId; label: string }[] = [
  { id: "bubble", label: "Bubbles" },
  { id: "flat", label: "Flat" },
];

export const SIDEBAR_LAYOUT_OPTIONS: { id: SidebarLayoutId; label: string; hint: string }[] = [
  { id: "expanded", label: "Expanded", hint: "Icons + labels" },
  { id: "collapsed", label: "Icons", hint: "Collapsed to icons" },
];

export const SIDEBAR_PIN_OPTIONS: { id: SidebarPinId; label: string; hint: string }[] = [
  { id: "pinned", label: "Pinned", hint: "Always visible" },
  { id: "auto-hide", label: "Auto-hide", hint: "Reveal on hover" },
];
