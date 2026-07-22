"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";
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
    <div className="omnia-landing relative min-h-screen overflow-x-hidden bg-field text-foreground">
      <div className="landing-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="landing-aurora landing-aurora-one" aria-hidden />
      <div className="landing-aurora landing-aurora-two" aria-hidden />

      {banner && (
        <p
          role="status"
          className="fixed left-1/2 top-5 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-border bg-surface-elevated/95 px-4 py-3 text-center text-sm text-muted shadow-float backdrop-blur-xl"
        >
          {banner}
        </p>
      )}

      <header className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12 lg:py-7">
        <Link href="/" className="group inline-flex items-center gap-3" aria-label="OMNIA home">
          <span className="landing-mark relative grid h-9 w-9 place-items-center rounded-xl">
            <span className="h-2.5 w-2.5 rotate-45 rounded-[3px] bg-white" aria-hidden />
          </span>
          <span className="font-display text-lg font-semibold tracking-[0.16em]">OMNIA</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/sign-in"
            className="interactive inline-flex min-h-tap items-center justify-center rounded-full px-4 text-sm font-semibold text-foreground sm:px-5"
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="interactive inline-flex min-h-tap items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-soft sm:px-6"
          >
            Start building
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100svh-84px)] w-full max-w-[1440px] items-center gap-12 px-5 pb-12 pt-8 sm:px-8 sm:pb-16 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,.98fr)] lg:gap-8 lg:px-12 lg:pb-14 lg:pt-4">
        <section className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
          <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs font-semibold text-muted shadow-soft backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5 text-alive" aria-hidden />
            AI products, designed from one sentence
          </div>

          <h1 className="animate-rise mt-7 text-balance font-display text-[clamp(3.15rem,8.2vw,7.4rem)] font-semibold leading-[0.88] tracking-[-0.065em] [animation-delay:80ms]">
            Don&apos;t hire
            <br />
            another bot.
            <span className="landing-gradient-text block">Build an expert.</span>
          </h1>

          <p className="animate-rise mx-auto mt-7 max-w-xl text-balance text-base leading-relaxed text-muted [animation-delay:160ms] sm:text-lg lg:mx-0 lg:text-xl">
            Tell OMNIA the outcome. It designs the intelligence, tools, memory, interface,
            and evaluation system—then gives you an agent ready to work.
          </p>

          <div className="animate-rise mt-8 flex flex-col items-stretch justify-center gap-3 [animation-delay:240ms] min-[440px]:flex-row lg:justify-start">
            <Link
              href="/sign-up"
              className="landing-primary-cta interactive group inline-flex min-h-[3.5rem] items-center justify-center gap-3 rounded-full px-7 text-base font-semibold text-white shadow-float"
            >
              Create your first agent
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              href="/sign-in"
              className="interactive inline-flex min-h-[3.5rem] items-center justify-center rounded-full border border-border bg-surface/65 px-7 text-base font-semibold backdrop-blur-xl"
            >
              I already have an account
            </Link>
          </div>

          <ul className="animate-rise mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium text-muted [animation-delay:320ms] lg:justify-start">
            {["No code", "Built-in evaluation", "Yours to evolve"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-alive/12 text-alive">
                  <Check className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="animate-rise relative mx-auto w-full max-w-[620px] [animation-delay:180ms]"
          aria-label="OMNIA agent creation preview"
        >
          <div className="landing-visual-shell relative aspect-[4/4.35] overflow-hidden rounded-[2rem] p-3 shadow-float sm:rounded-[2.5rem] sm:p-5">
            <div className="relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0b0b12] p-4 text-white sm:rounded-[1.9rem] sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#9b87ff] shadow-[0_0_14px_#9b87ff]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
                    Agent architecture
                  </span>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[9px] text-white/50">
                  BUILDING
                </span>
              </div>

              <div className="relative flex flex-1 items-center justify-center">
                <div className="agent-orbit agent-orbit-outer" aria-hidden />
                <div className="agent-orbit agent-orbit-inner" aria-hidden />
                <div className="agent-core">
                  <div className="agent-core-glow" />
                  <span className="relative z-10 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                    ATLAS
                  </span>
                  <span className="relative z-10 mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">
                    Research expert
                  </span>
                </div>

                {[
                  ["Knowledge", "top-[10%] left-[4%]", "01"],
                  ["Memory", "top-[18%] right-[1%]", "02"],
                  ["Tools", "bottom-[20%] left-[0%]", "03"],
                  ["Evaluation", "bottom-[10%] right-[2%]", "04"],
                ].map(([label, position, number]) => (
                  <div
                    key={label}
                    className={`agent-node absolute ${position} rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2.5 backdrop-blur-xl sm:px-4`}
                  >
                    <span className="block font-mono text-[8px] text-[#9b87ff]">{number}</span>
                    <span className="mt-0.5 block text-[11px] font-medium text-white/80 sm:text-xs">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3.5 sm:p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">
                  Your brief
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/80 sm:text-base">
                  “Research any market, challenge assumptions, and turn evidence into a clear
                  decision.”
                </p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                  <span className="landing-progress block h-full w-[78%] rounded-full" />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-2 rounded-2xl border border-border bg-surface-elevated/90 px-4 py-3 shadow-float backdrop-blur-xl sm:-left-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Quality</p>
            <p className="mt-1 font-display text-xl font-semibold">94<span className="text-xs text-muted"> / 100</span></p>
          </div>
        </section>
      </main>

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between border-t border-border px-5 py-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:px-8 lg:px-12">
        <span>Designed to evolve</span>
        <span className="hidden sm:inline">Knowledge · Memory · Tools · Evaluation</span>
        <span>© 2026 OMNIA</span>
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
