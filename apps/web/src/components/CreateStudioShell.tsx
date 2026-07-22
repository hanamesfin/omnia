"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";

export type CreatePhase = "mode" | "interview" | "generate" | "ready";
export type CreateTier = "normal" | "enterprise";

const STEPS: Array<{ id: CreatePhase; label: string; hint: string }> = [
  { id: "mode", label: "Mode", hint: "Normal or Enterprise" },
  { id: "interview", label: "Interview", hint: "Chat the brief" },
  { id: "generate", label: "Generate", hint: "Name & build" },
  { id: "ready", label: "Ready", hint: "Logo & publish" },
];

type CreateStudioContextValue = {
  phase: CreatePhase;
  setPhase: (phase: CreatePhase) => void;
  progress: number;
  setProgress: (n: number) => void;
  tier: CreateTier | null;
  setTier: (tier: CreateTier | null) => void;
};

const CreateStudioContext = createContext<CreateStudioContextValue | null>(null);

export function useCreateStudio(): CreateStudioContextValue {
  const ctx = useContext(CreateStudioContext);
  if (!ctx) {
    throw new Error("useCreateStudio must be used within CreateStudioShell");
  }
  return ctx;
}

export function useCreateStudioOptional(): CreateStudioContextValue | null {
  return useContext(CreateStudioContext);
}

/**
 * Dedicated Create studio chrome — step rail + top bar.
 * Intentionally not the global OMNIA AppShell sidebar (Discover / Create / Yours).
 */
export function CreateStudioShell({ children }: { children: ReactNode }) {
  const [phase, setPhaseState] = useState<CreatePhase>("mode");
  const [progress, setProgress] = useState(0);
  const [tier, setTier] = useState<CreateTier | null>(null);

  const setPhase = useCallback((next: CreatePhase) => {
    setPhaseState(next);
  }, []);

  const value = useMemo(
    () => ({ phase, setPhase, progress, setProgress, tier, setTier }),
    [phase, setPhase, progress, tier]
  );

  const activeIdx = Math.max(
    0,
    STEPS.findIndex((s) => s.id === phase)
  );

  return (
    <CreateStudioContext.Provider value={value}>
      <div className="flex h-dvh w-full overflow-hidden bg-field">
        <aside
          className="hidden w-[13.5rem] shrink-0 flex-col border-r border-border/80 bg-surface/35 backdrop-blur-md md:flex lg:w-[15rem]"
          aria-label="Create steps"
        >
          <div className="border-b border-border/70 px-4 py-4">
            <Link
              href="/explore"
              className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-foreground"
            >
              <ArrowLeft
                size={14}
                className="transition group-hover:-translate-x-0.5"
                aria-hidden
              />
              Discover
            </Link>
            <p className="mt-4 flex items-center gap-2 font-display text-base font-semibold tracking-tight text-foreground">
              <Sparkles className="h-4 w-4 text-alive" aria-hidden />
              Create studio
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Focused builder — not the app menu.
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-2 py-3" aria-label="Create progress">
            {STEPS.map((step, i) => {
              const done = i < activeIdx;
              const active = i === activeIdx;
              return (
                <div
                  key={step.id}
                  aria-current={active ? "step" : undefined}
                  className={`flex items-start gap-3 rounded-xl px-2.5 py-2.5 ${
                    active
                      ? "bg-alive/10 ring-1 ring-alive/25"
                      : done
                        ? "opacity-90"
                        : "opacity-55"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      done
                        ? "bg-alive text-on-alive"
                        : active
                          ? "bg-alive/20 text-alive ring-1 ring-alive/40"
                          : "bg-background/70 text-muted ring-1 ring-border"
                    }`}
                  >
                    {done ? <Check size={13} strokeWidth={2.5} aria-hidden /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-medium ${
                        active ? "text-foreground" : "text-foreground/90"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                      {step.hint}
                    </span>
                  </span>
                </div>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2 border-t border-border/70 px-4 py-3 text-[11px] text-muted">
            {tier ? (
              <p>
                Mode{" "}
                <span className="font-medium capitalize text-foreground">{tier}</span>
              </p>
            ) : null}
            {phase !== "mode" && phase !== "ready" ? (
              <p>
                Brief{" "}
                <span className="font-mono text-foreground">{Math.round(progress)}%</span>
              </p>
            ) : null}
            <Link href="/yours" className="inline-block text-alive hover:underline">
              Open Yours
            </Link>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-surface/30 px-3 py-2.5 backdrop-blur-md sm:px-5 md:hidden">
            <Link
              href="/explore"
              className="inline-flex min-h-tap items-center gap-1.5 text-xs font-medium text-muted"
            >
              <ArrowLeft size={14} aria-hidden />
              Exit
            </Link>
            <p className="font-display text-sm font-semibold tracking-tight">Create studio</p>
            <Link href="/yours" className="text-xs font-medium text-alive">
              Yours
            </Link>
          </header>

          <ol
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/70 px-3 py-2 md:hidden"
            aria-label="Create progress"
          >
            {STEPS.map((step, i) => {
              const done = i < activeIdx;
              const active = i === activeIdx;
              return (
                <li
                  key={step.id}
                  aria-current={active ? "step" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    active
                      ? "bg-alive/15 text-alive ring-1 ring-alive/30"
                      : done
                        ? "text-foreground"
                        : "text-muted"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      done || active ? "bg-alive text-on-alive" : "bg-border/80 text-muted"
                    }`}
                  >
                    {done ? <Check size={10} strokeWidth={3} aria-hidden /> : i + 1}
                  </span>
                  {step.label}
                </li>
              );
            })}
          </ol>

          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-alive focus:px-3 focus:py-2 focus:text-on-alive focus:outline-none"
          >
            Skip to content
          </a>

          <main id="main" className="min-h-0 flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </CreateStudioContext.Provider>
  );
}
