"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { getLocalAgents } from "@/lib/agent-storage";
import { hasProductShell } from "@/components/ProductShell";
import { firstProductPageId } from "@/components/ProductAppShell";

/** Redirect /app/[id] → first product page (or studio if no blueprint). */
export default function ProductAppIndexPage() {
  const { id } = useParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const agentId = String(id);
    (async () => {
      let agent: any;
      try {
        agent = await fetchApi(`/agents/${agentId}`);
      } catch {
        agent = getLocalAgents().find((a) => a.id === agentId || a.agent_id === agentId);
      }
      if (!agent) {
        setError("Couldn't open this product.");
        return;
      }
      const bp = agent.product_blueprint;
      if (hasProductShell(bp)) {
        const page = firstProductPageId(bp);
        router.replace(`/app/${agentId}/${encodeURIComponent(page)}`);
        return;
      }
      router.replace(`/yours/${agentId}`);
    })();
  }, [id, router]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-8" aria-busy>
      <div className="skeleton h-10 w-48 rounded-xl" />
    </div>
  );
}
