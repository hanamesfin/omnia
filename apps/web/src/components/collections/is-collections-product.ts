import type { ProductBlueprint } from "@/components/ProductShell";

const COLLECTIONS_PAGE_RE =
  /^(home|feed|trove|collections|library|search|saves)$/i;

/**
 * True when the product IA matches the Collections / Trove pattern
 * (home feed + collections + search) or design refs name Collections/Trove.
 */
export function isCollectionsProduct(blueprint: ProductBlueprint | null | undefined): boolean {
  if (!blueprint) return false;
  const refs = (blueprint.design_system?.references || []).join(" ").toLowerCase();
  if (/collections|trove/.test(refs)) return true;
  const pt = String(blueprint.product_type || "").toLowerCase();
  if (/collection|trove|curat/.test(pt)) return true;

  const ia = blueprint.information_architecture || {};
  const pages = [
    ...(Array.isArray(ia.pages) ? ia.pages : []),
    ...(Array.isArray(ia.nav) ? ia.nav : []),
  ];
  const ids = pages.map((p) => String(p.id || "").toLowerCase());
  const hasHome = ids.some((id) => /home|feed|trove/.test(id));
  const hasCollections = ids.some((id) => /collection|library/.test(id));
  const hasSearch = ids.some((id) => /search|saves|find/.test(id));
  return hasHome && hasCollections && hasSearch;
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
