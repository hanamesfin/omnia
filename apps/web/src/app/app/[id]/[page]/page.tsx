"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { hasProductShell, type ProductBlueprint } from "@/components/ProductShell";
import {
  ProductAppShell,
  firstProductPageId,
} from "@/components/ProductAppShell";
import { ProductAgentSurface } from "@/components/ProductAgentSurface";
import { ShellMenuAnchor } from "@/components/ShellMenuDock";

export default function ProductAppPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = String(params.id || "");
  const pageId = decodeURIComponent(String(params.page || ""));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [agent, setAgent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      try {
        const res = await fetchApi(`/agents/${agentId}`);
        setAgent(res);
        const bp = res.product_blueprint as ProductBlueprint;
        if (!hasProductShell(bp)) {
          router.replace(`/yours/${agentId}`);
          return;
        }
        const pages = bp.information_architecture?.nav?.length
          ? bp.information_architecture.nav
          : bp.information_architecture?.pages || [];
        const ids = pages.map((p: { id?: string }) => String(p.id || ""));
        if (pageId && !ids.includes(pageId)) {
          const first = firstProductPageId(bp);
          if (first) router.replace(`/app/${agentId}/${encodeURIComponent(first)}`);
        }
      } catch {
        setError("Couldn't load this product.");
      }
    })();
  }, [agentId, pageId, router]);

  useEffect(() => {
    if (!agent?.name) return;
    const previousTitle = document.title;
    document.title = String(agent.name);
    return () => {
      document.title = previousTitle;
    };
  }, [agent?.name]);

  const onAction = useCallback(
    (action: string, fromPage: string) => {
      setToast(`Action: ${action}`);
      window.setTimeout(() => setToast(null), 2200);
      const bp = agent?.product_blueprint as ProductBlueprint | undefined;
      const aiPage = firstProductPageId(bp);
      if (aiPage && aiPage !== fromPage) {
        setSeedMessage(
          `User triggered "${action}" from the ${fromPage} page. Help them complete that action for ${agent?.name || "this product"}.`
        );
        router.push(`/app/${agentId}/${encodeURIComponent(aiPage)}`);
      } else {
        setSeedMessage(
          `Help me with this product action: ${action}. Context page: ${fromPage}.`
        );
      }
    },
    [agent, agentId, router]
  );

  if (error) {
    return (
      <div className="relative mx-auto flex h-full max-w-3xl flex-col px-4 py-8 sm:px-6">
        <ShellMenuAnchor />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted">
          <p>{error}</p>
          <Link href="/yours" className="text-alive hover:underline">
            Back to Yours
          </Link>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="relative mx-auto flex h-full max-w-3xl flex-col px-4 py-8 sm:px-6" aria-busy>
        <ShellMenuAnchor />
        <div className="flex flex-1 items-center justify-center">
          <div className="skeleton h-16 w-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const blueprint = (agent.product_blueprint || {}) as ProductBlueprint;
  const isConversational = String(agent?.interface_schema?.mode || "").toLowerCase() === "chat";

  return (
    <ProductAppShell
      agentId={agentId}
      productName={agent.name}
      specialty={agent.specialty}
      pageId={pageId}
      blueprint={blueprint}
      immersive={isConversational}
      toast={toast}
      onAction={onAction}
      aiSurface={
        <ProductAgentSurface
          agentId={agentId}
          agent={agent}
          seedMessage={seedMessage}
          onSeedConsumed={() => setSeedMessage(null)}
        />
      }
    />
  );
}
