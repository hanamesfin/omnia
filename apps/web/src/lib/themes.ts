export const THEME_IDS = [
  "dark",
  "light",
  "midnight",
  "aurora",
  "ember",
  "ocean",
  "graphite",
  "dusk",
  "frost",
  "citric",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeMeta = {
  id: ThemeId;
  label: string;
  group: "core" | "atmospheres";
  /** Swatches shown in the Appearance picker */
  swatches: [string, string, string];
};

export const THEMES: ThemeMeta[] = [
  { id: "light", label: "Light", group: "core", swatches: ["#f5f4f1", "#ffffff", "#0071e3"] },
  { id: "dark", label: "Dark", group: "core", swatches: ["#1c1c1e", "#2c2c2e", "#0a84ff"] },
  { id: "frost", label: "Frost", group: "atmospheres", swatches: ["#eef2f6", "#ffffff", "#0071e3"] },
  { id: "midnight", label: "Midnight", group: "atmospheres", swatches: ["#0b1020", "#60a5fa", "#93c5fd"] },
  { id: "aurora", label: "Aurora", group: "atmospheres", swatches: ["#0c1612", "#34d399", "#a7f3d0"] },
  { id: "ember", label: "Ember", group: "atmospheres", swatches: ["#1a1410", "#f59e0b", "#fb923c"] },
  { id: "ocean", label: "Ocean", group: "atmospheres", swatches: ["#0a171c", "#22d3ee", "#0ea5e9"] },
  { id: "graphite", label: "Graphite", group: "atmospheres", swatches: ["#2c2c2e", "#f5f5f7", "#aeaeb2"] },
  { id: "dusk", label: "Dusk", group: "atmospheres", swatches: ["#18141c", "#e879f9", "#c4b5fd"] },
  { id: "citric", label: "Citric", group: "atmospheres", swatches: ["#12180e", "#a3e635", "#84cc16"] },
];

export const THEME_STORAGE_KEY = "omnia-theme";
/** Soft Neutrals — Apple-like warm light by default */
export const DEFAULT_THEME: ThemeId = "light";

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && (THEME_IDS as readonly string[]).includes(value);
}
