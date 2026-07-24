import type { ProductBlueprint } from "@/components/ProductShell";

const COLLECTIONS_PAGE_RE =
  /^(home|feed|trove|collections|library|search|saves)$/i;

/**
 * True only for real Collections / Trove products — not every agent that
 * inherited Collections chrome as a design reference or has a generic "library" page.
 *
 * Signals (any strong match):
 * 1. Figma template id is collections_curation (primary match, not a soft fallback)
 * 2. product_type / uvp / workflow clearly describe a collections/trove app
 * 3. Classic Trove IA (home + collections + search) AND curation intent in copy
 *
 * References alone never qualify — factory prompts historically injected
 * "Collections App" as chrome inspiration for every product.
 */
export function isCollectionsProduct(blueprint: ProductBlueprint | null | undefined): boolean {
  if (!blueprint) return false;

  const tmpl = blueprint.figma_template;
  if (tmpl && typeof tmpl === "object") {
    const id = String(tmpl.id || "");
    const fallback = String(tmpl.fallback_to || "");
    // Primary Collections match (not "we fell back because placeholder")
    if (id === "collections_curation" && fallback !== "collections_curation") {
      return true;
    }
  }

  const pt = String(blueprint.product_type || "").toLowerCase();
  if (
    /^(collections?\s*app|trove)$/.test(pt.trim()) ||
    /\bcollections?\s*app\b|\btrove\b/.test(pt)
  ) {
    return true;
  }

  const corpus = [
    pt,
    blueprint.uvp || "",
    blueprint.daily_workflow || "",
    blueprint.problem_worth_solving || "",
  ]
    .join(" ")
    .toLowerCase();

  const curationIntent =
    /\btrove\b/.test(corpus) ||
    /\bcollections?\s*app\b/.test(corpus) ||
    /\bcurated\s+(gallery|library|collection|canvas|feed)\b/.test(corpus) ||
    /\bmasonry\s+(feed|grid)\b/.test(corpus) ||
    /\bsave[- ]to[- ](board|collection)\b/.test(corpus);

  const ia = blueprint.information_architecture || {};
  const pages = [
    ...(Array.isArray(ia.pages) ? ia.pages : []),
    ...(Array.isArray(ia.nav) ? ia.nav : []),
  ];
  const ids = pages.map((p) => String(p.id || "").toLowerCase());
  const hasHome = ids.some((id) => /^(home|feed|trove)$/.test(id));
  // Require explicit "collections" (or trove) — not generic "library"
  const hasCollections = ids.some((id) => /^(collections?|trove)$/.test(id));
  const hasSearch = ids.some((id) => /^(search|saves)$/.test(id));
  const hasTroveIA = hasHome && hasCollections && hasSearch;

  return Boolean(curationIntent && hasTroveIA);
}

export function isCollectionsContentPage(pageId: string): boolean {
  return COLLECTIONS_PAGE_RE.test(pageId);
}

export function collectionsTabFromPageId(
  pageId: string
): "home" | "collections" | "search" | null {
  const id = pageId.toLowerCase();
  if (/home|feed|trove/.test(id)) return "home";
  if (/collection|library/.test(id)) return "collections";
  if (/search|saves|find/.test(id)) return "search";
  return null;
}

/** True when blueprint carries vision-codegen TSX that should own the product surface. */
export function hasGeneratedFrontend(blueprint: ProductBlueprint | null | undefined): boolean {
  if (!blueprint) return false;
  const chrome = blueprint.design_system?.chrome || {};
  if (chrome && typeof chrome === "object" && Boolean((chrome as { codegen?: boolean }).codegen)) {
    const files = blueprint.generated_frontend?.files;
    if (files && typeof files === "object" && Object.keys(files).length > 0) return true;
  }
  const files = blueprint.generated_frontend?.files;
  return Boolean(files && typeof files === "object" && Object.keys(files).length > 0);
}
