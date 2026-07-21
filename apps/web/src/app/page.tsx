"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { consumeSessionReason } from "@/lib/auth-session";

/**
 * OM–03 landing gate — brand, one line, Sign up / Log in.
 * No nav, no hamburger, no preview of authenticated pages.
 */
function LandingInner() {
  const searchParams = useSearchParams();
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    const reason = searchParams.get("reason") || consumeSessionReason();
    if (reason === "session" || reason === "expired") {
      setBanner("Your session ended — log back in to continue.");
    }
  }, [searchParams]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-field px-6 text-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in oklab, var(--alive) 22%, transparent), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 50%)",
        }}
      />

      {banner && (
        <p
          role="status"
          className="absolute left-1/2 top-6 z-10 w-[min(100%,24rem)] -translate-x-1/2 rounded-2xl border border-border bg-surface/90 px-4 py-3 text-center text-sm text-muted shadow-soft backdrop-blur-md"
        >
          {banner}
        </p>
      )}

      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        <div className="mb-8 flex items-center gap-2.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[2px] bg-alive"
            aria-hidden
          />
          <p className="font-display text-2xl font-semibold tracking-[0.18em] text-foreground">
            OMNIA
          </p>
        </div>

        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
          Describe an agent. OMNIA builds it.
        </h1>

        <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="inline-flex min-h-tap items-center justify-center rounded-full bg-alive px-8 text-sm font-semibold text-on-alive transition hover:opacity-90"
          >
            Sign up
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex min-h-tap items-center justify-center rounded-full border border-border bg-surface/70 px-8 text-sm font-semibold text-foreground backdrop-blur-md transition hover:bg-surface-elevated"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LandingGatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-field" aria-busy="true" />
      }
    >
      <LandingInner />
    </Suspense>
  );
}
