"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppStoreHero } from "@/components/store/AppStoreHero";
import { AppStoreListingRow } from "@/components/store/AppStoreListingRow";
import { OmniStar } from "@/components/OmniStar";
import {
  CYBER_FEATURE_CARD,
  OMNI_FEATURE_APPS,
  PLAY_PACK_CARD,
  type StoreApp,
} from "@/lib/store-home";

export default function HomePage() {
  const router = useRouter();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const getApp = async (app: StoreApp) => {
    if (app.agent_id.startsWith("seed-")) {
      setToast("Connect the API — opening Discover");
      setTimeout(() => router.push("/explore"), 600);
      return;
    }
    try {
      setAddingId(app.id);
      setToast(`Added ${app.name} to Yours`);
      setTimeout(() => router.push("/yours"), 500);
    } finally {
      setAddingId(null);
      setTimeout(() => setToast(null), 2800);
    }
  };

  return (
    <div className="app-store-page mx-auto max-w-5xl px-4 pb-10 pt-14 sm:px-8 sm:pb-12 sm:pt-10">
      <AppStoreHero />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href={PLAY_PACK_CARD.href}
          className="app-store-mid-card group relative overflow-hidden rounded-2xl p-5 transition hover:scale-[1.01]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950" />
          <div className="relative flex gap-4">
            <div className="relative shrink-0">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-violet-600 ring-2 ring-white/20">
                <span className="text-lg font-bold text-white">▶</span>
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 ring-2 ring-slate-900">
                <OmniStar size={16} />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/90">
                {PLAY_PACK_CARD.subtitle}
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold text-white group-hover:text-cyan-200">
                {PLAY_PACK_CARD.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm text-white/65">{PLAY_PACK_CARD.description}</p>
            </div>
          </div>
        </Link>

        <Link
          href={CYBER_FEATURE_CARD.href}
          className="app-store-mid-card group relative overflow-hidden rounded-2xl p-5 transition hover:scale-[1.01]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a12] via-[#1a0a1f] to-[#2d0a1a]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "linear-gradient(135deg, transparent 40%, rgba(255,215,0,0.08) 50%, rgba(255,0,80,0.12) 70%)",
            }}
          />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-400/90">
              Featured
            </p>
            <h2 className="mt-1 font-display text-lg font-bold uppercase tracking-tight text-yellow-300 group-hover:text-yellow-200">
              {CYBER_FEATURE_CARD.title}
            </h2>
            <p className="mt-0.5 text-xs text-fuchsia-300/80">{CYBER_FEATURE_CARD.subtitle}</p>
            <p className="mt-2 line-clamp-2 text-sm text-white/60">{CYBER_FEATURE_CARD.description}</p>
          </div>
        </Link>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Best New Apps and Updates
          </h2>
          <Link
            href="/explore"
            className="shrink-0 text-sm font-medium text-alive hover:underline"
          >
            See All
          </Link>
        </div>
        <div className="app-store-listings rounded-2xl px-1 sm:px-3">
          {OMNI_FEATURE_APPS.map((app) => (
            <AppStoreListingRow
              key={app.id}
              app={app}
              onGet={getApp}
              getting={addingId === app.id}
            />
          ))}
        </div>
      </section>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-surface-elevated px-5 py-2.5 text-sm shadow-float"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
