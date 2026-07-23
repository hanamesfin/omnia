import type { DesignSystem } from "@/components/DesignTokenProvider";
import type { ProductBlueprint } from "@/components/ProductShell";

/**
 * Default product UI language from Figma Make "Collections-App" (Trove).
 * Soft gray canvas, black accent, Platypi display + Host Grotesk body + IBM Plex Mono meta,
 * centered top mark, floating frosted bottom pill nav.
 */
export const COLLECTIONS_PRODUCT_DESIGN: DesignSystem = {
  personality: "curated_calm",
  emotional_goals: ["calm", "clarity", "focus"],
  references: [
    "Collections App / Trove",
    "Recent (Godly) — quiet chrome, content-first masonry",
    "Siteinspire — save to collection browse",
    "Mobbin / Pinterest — save-to-board sheet",
  ],
  chrome: {
    mode: "standalone",
    omnia_shell: false,
    product_nav_only: true,
    nav_placement: "bottom_pill",
    top_bar: "centered_brand",
  },
  tokens: {
    colors: {
      bg: "#f4f4f4",
      fg: "#000000",
      accent: "#000000",
      muted: "#999999",
      border: "rgba(0,0,0,0.1)",
      surface: "#ffffff",
    },
    typography: {
      font_display: "Platypi",
      font_sans: "Host Grotesk",
      font_mono: "IBM Plex Mono",
    },
    space: {
      unit: "4px",
      gutter: "20px",
      section: "2.5rem",
      nav_pad: "34px",
    },
    radius: {
      media: "6px",
      card: "12px",
      pill: "999px",
      control: "0.625rem",
    },
    motion: {
      enter: "fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1)",
      micro: "140ms cubic-bezier(0.22, 1, 0.36, 1)",
      spring: "spring 420/38",
      emphasis: "nav-pill layout spring",
    },
  },
};

/**
 * Canonical Trove / Collections product blueprint (Figma Make Collections-App).
 * Used by the seed agent and as the IA target for collection-style products.
 */
export const TROVE_PRODUCT_BLUEPRINT: ProductBlueprint = {
  product_type: "Collections App",
  uvp: "Collect, organize, and browse artworks, quotes, and publications with a calm curated canvas.",
  daily_workflow:
    "Browse My Trove, open or create collections, search saves, and ask the AI curator for help.",
  information_architecture: {
    pages: [
      {
        id: "home",
        label: "Home",
        description: "Masonry feed of artworks, quotes, and publications.",
      },
      {
        id: "collections",
        label: "Collections",
        description: "Browse and create curated collections.",
      },
      {
        id: "search",
        label: "Search",
        description: "Find saved items across collections.",
      },
      {
        id: "assistant",
        label: "Curator",
        ai_powered: true,
        description: "AI curator for tagging, grouping, and discovery ideas.",
      },
    ],
    nav: [
      { id: "home", label: "Home" },
      { id: "collections", label: "Collections" },
      { id: "search", label: "Search" },
      { id: "assistant", label: "Curator" },
    ],
  },
  design_system: COLLECTIONS_PRODUCT_DESIGN,
  page_specs: {
    home: {
      purpose: "Scan your personal trove in a two-column masonry.",
      primary_actions: ["Open item", "Filter by type"],
      empty_state: "Your trove is empty — start collecting.",
      loading_state: "Gathering your saves…",
    },
    collections: {
      purpose: "Open a collection or start a new one.",
      primary_actions: ["New collection", "Open collection"],
      empty_state: "No collections yet — tap + to create one.",
    },
    search: {
      purpose: "Search everything you've saved.",
      primary_actions: ["Search", "Filter"],
      empty_state: "No matching saves yet.",
    },
    assistant: {
      purpose: "Ask the curator to group, tag, or suggest collections.",
      ai_powered: true,
      empty_state: "Ask the curator for grouping ideas or what to collect next.",
      primary_actions: ["Suggest collection", "Tag this item"],
    },
  },
};

/** Map Google font names → CSS stacks (loaded via product font link). */
export function fontStackFor(name: string | undefined | null, kind: "display" | "sans" | "mono"): string {
  const n = String(name || "").trim();
  if (!n) {
    if (kind === "display") return '"Platypi", Georgia, "Times New Roman", serif';
    if (kind === "mono") return '"IBM Plex Mono", ui-monospace, Menlo, monospace';
    return '"Host Grotesk", system-ui, sans-serif';
  }
  if (n.includes(",") || n.startsWith("var(") || n.startsWith('"')) return n;
  if (kind === "mono" || /mono|plex mono|jetbrains|sf mono/i.test(n)) {
    return `"${n}", ui-monospace, Menlo, Consolas, monospace`;
  }
  if (kind === "display" || /serif|platypi|fraunces|source serif|playfair|noticia/i.test(n)) {
    return `"${n}", Georgia, "Times New Roman", serif`;
  }
  return `"${n}", system-ui, -apple-system, sans-serif`;
}

/** Merge blueprint design_system onto Collections defaults (blueprint wins). */
export function resolveProductDesignSystem(
  designSystem?: DesignSystem | null
): DesignSystem {
  const base = COLLECTIONS_PRODUCT_DESIGN;
  const incoming = designSystem || {};
  const baseTokens = base.tokens || {};
  const inTokens = incoming.tokens || {};
  const baseChrome = (base as DesignSystem).chrome || {
    mode: "standalone",
    omnia_shell: false,
    product_nav_only: true,
    nav_placement: "bottom_pill",
    top_bar: "centered_brand",
  };
  return {
    personality: String(incoming.personality || base.personality || ""),
    references: incoming.references || base.references,
    emotional_goals: incoming.emotional_goals || base.emotional_goals,
    chrome: {
      ...baseChrome,
      ...(incoming.chrome || {}),
    },
    tokens: {
      colors: { ...(baseTokens.colors || {}), ...(inTokens.colors || {}) },
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
      motion: { ...(baseTokens.motion || {}), ...(inTokens.motion || {}) },
    },
  };
}
