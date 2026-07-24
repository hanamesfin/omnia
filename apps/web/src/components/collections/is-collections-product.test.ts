/**
 * Contract tests for Collections detection.
 * Run: npx --yes tsx --test src/components/collections/is-collections-product.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasGeneratedFrontend,
  isCollectionsProduct,
} from "./is-collections-product";
import { TROVE_PRODUCT_BLUEPRINT } from "@/lib/product-design-defaults";
import type { ProductBlueprint } from "@/components/ProductShell";

describe("isCollectionsProduct", () => {
  it("accepts canonical Trove blueprint", () => {
    assert.equal(isCollectionsProduct(TROVE_PRODUCT_BLUEPRINT), true);
  });

  it("rejects generic SaaS with library page and Collections refs", () => {
    const bp: ProductBlueprint = {
      product_type: "saas",
      uvp: "A workspace for projects",
      daily_workflow: "Open projects and run AI",
      information_architecture: {
        pages: [
          { id: "workspace", label: "Workspace" },
          { id: "projects", label: "Projects" },
          { id: "library", label: "Library" },
        ],
        nav: [
          { id: "workspace", label: "Workspace" },
          { id: "projects", label: "Projects" },
          { id: "library", label: "Library" },
        ],
      },
      design_system: {
        personality: "editorial_utility",
        references: ["Collections App / Trove", "Notion"],
      },
    };
    assert.equal(isCollectionsProduct(bp), false);
  });

  it("rejects home+collections+search without curation intent", () => {
    const bp: ProductBlueprint = {
      product_type: "saas",
      uvp: "Team productivity hub",
      information_architecture: {
        pages: [
          { id: "home", label: "Home" },
          { id: "collections", label: "Collections" },
          { id: "search", label: "Search" },
        ],
        nav: [
          { id: "home", label: "Home" },
          { id: "collections", label: "Collections" },
          { id: "search", label: "Search" },
        ],
      },
    };
    assert.equal(isCollectionsProduct(bp), false);
  });

  it("accepts curation intent + Trove IA", () => {
    const bp: ProductBlueprint = {
      product_type: "personal library",
      uvp: "A curated gallery canvas for saves",
      daily_workflow: "Browse masonry feed and save to collection",
      information_architecture: {
        pages: [
          { id: "home", label: "Home" },
          { id: "collections", label: "Collections" },
          { id: "search", label: "Search" },
          { id: "assistant", label: "Curator", ai_powered: true },
        ],
        nav: [
          { id: "home", label: "Home" },
          { id: "collections", label: "Collections" },
          { id: "search", label: "Search" },
        ],
      },
    };
    assert.equal(isCollectionsProduct(bp), true);
  });

  it("accepts Collections App product_type", () => {
    assert.equal(
      isCollectionsProduct({ product_type: "Collections App" }),
      true
    );
  });

  it("accepts primary figma collections_curation match", () => {
    assert.equal(
      isCollectionsProduct({
        product_type: "saas",
        figma_template: { id: "collections_curation" },
      }),
      true
    );
  });
});

describe("hasGeneratedFrontend", () => {
  it("detects files", () => {
    assert.equal(
      hasGeneratedFrontend({
        generated_frontend: { files: { "src/App.tsx": "export default function App(){return null}" } },
      }),
      true
    );
  });

  it("false when empty", () => {
    assert.equal(hasGeneratedFrontend({ generated_frontend: { files: {} } }), false);
    assert.equal(hasGeneratedFrontend({}), false);
  });
});
