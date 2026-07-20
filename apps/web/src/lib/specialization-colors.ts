/**
 * Specialization color taxonomy — consistent hue families by domain/kind
 * across Discover, Yours, and icon accents.
 */

export type SpecFamily =
  | "coding"
  | "support"
  | "research"
  | "content"
  | "data"
  | "automation"
  | "onboarding"
  | "general";

export type SpecPalette = {
  family: SpecFamily;
  label: string;
  /** Soft wash for cards / chips */
  wash: string;
  /** Strong accent (text / border) */
  accent: string;
  /** CSS variable-friendly hex for motifs */
  hex: string;
};

const FAMILIES: Record<SpecFamily, SpecPalette> = {
  coding: {
    family: "coding",
    label: "Coding",
    wash: "bg-emerald-500/12",
    accent: "text-emerald-700 dark:text-emerald-300",
    hex: "#059669",
  },
  support: {
    family: "support",
    label: "Support",
    wash: "bg-sky-500/12",
    accent: "text-sky-700 dark:text-sky-300",
    hex: "#0284c7",
  },
  research: {
    family: "research",
    label: "Research",
    wash: "bg-amber-500/14",
    accent: "text-amber-800 dark:text-amber-200",
    hex: "#d97706",
  },
  content: {
    family: "content",
    label: "Writing",
    wash: "bg-rose-500/12",
    accent: "text-rose-700 dark:text-rose-300",
    hex: "#e11d48",
  },
  data: {
    family: "data",
    label: "Data",
    wash: "bg-teal-500/12",
    accent: "text-teal-800 dark:text-teal-200",
    hex: "#0d9488",
  },
  automation: {
    family: "automation",
    label: "Automate",
    wash: "bg-orange-500/12",
    accent: "text-orange-800 dark:text-orange-200",
    hex: "#ea580c",
  },
  onboarding: {
    family: "onboarding",
    label: "Guide",
    wash: "bg-alive/12",
    accent: "text-alive",
    hex: "var(--alive, #2563eb)",
  },
  general: {
    family: "general",
    label: "General",
    wash: "bg-slate-500/10",
    accent: "text-slate-700 dark:text-slate-300",
    hex: "#64748b",
  },
};

export function specializationFamily(domain?: string, kind?: string): SpecFamily {
  const d = (domain || "").toLowerCase();
  const k = (kind || "").toLowerCase();
  if (d.includes("onboard") || d.includes("guide")) return "onboarding";
  if (d.includes("coding") || d.includes("dev") || k === "tool") return "coding";
  if (d.includes("support") || d.includes("customer")) return "support";
  if (d.includes("research") || d.includes("educat")) return "research";
  if (d.includes("content") || d.includes("creative") || k === "transformer") return "content";
  if (d.includes("data") || d.includes("financ") || k === "analyzer") return "data";
  if (k === "automation" || d.includes("ops")) return "automation";
  return "general";
}

export function specializationPalette(domain?: string, kind?: string): SpecPalette {
  return FAMILIES[specializationFamily(domain, kind)];
}
