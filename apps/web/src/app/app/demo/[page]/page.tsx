"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ProductAppShell } from "@/components/ProductAppShell";
import { ProductAgentSurface } from "@/components/ProductAgentSurface";
import { TROVE_PRODUCT_BLUEPRINT } from "@/lib/product-design-defaults";

const VALID_PAGES = new Set(["home", "collections", "search", "assistant"]);

/**
 * Local blank-canvas preview — no API required for Collections UI.
 * Open /app/demo/home | /app/demo/collections | /app/demo/search | /app/demo/assistant
 */
export default function CollectionsDemoPage() {
  const params = useParams();
  const router = useRouter();
  const rawPage = decodeURIComponent(String(params.page || "home"));
  const pageId = VALID_PAGES.has(rawPage) ? rawPage : "home";
  const agentId = "demo";

  useEffect(() => {
    document.title = "Trove";
  }, []);

  useEffect(() => {
    if (!VALID_PAGES.has(rawPage)) {
      router.replace("/app/demo/home");
    }
  }, [rawPage, router]);

  const mockAgent = useMemo(
    () => ({
      id: agentId,
      name: "Trove",
      specialty: "Personal collections curator",
      domain: "content",
      kind: "chat",
      model_id: "gpt-4o-mini",
      interface_schema: { mode: "chat" },
      product_blueprint: TROVE_PRODUCT_BLUEPRINT,
    }),
    []
  );

  return (
    <ProductAppShell
      agentId={agentId}
      productName="Trove"
      specialty={mockAgent.specialty}
      pageId={pageId}
      blueprint={TROVE_PRODUCT_BLUEPRINT}
      immersive={pageId === "assistant"}
      aiSurface={<ProductAgentSurface agentId={agentId} agent={mockAgent} />}
    />
  );
}
