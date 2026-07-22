"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Check, Sparkles } from "lucide-react";
import { ShellMenuAnchor } from "@/components/ShellMenuDock";

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
 * OMNIA menu opens via the docked hamburger (overlay drawer; no push rail).
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
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-field">
        <header className="flex shrink-0 items-center gap-3 border-b border-border/80 bg-surface/30 px-3 py-2.5 backdrop-blur-md sm:px-5">
          <ShellMenuAnchor className="pointer-events-none relative z-50 flex w-fit max-w-full flex-row items-start justify-start gap-2" />
          <p className="flex min-w-0 items-center gap-2 font-display text-sm font-semibold tracking-tight text-foreground sm:text-base">
            <Sparkles className="h-4 w-4 shrink-0 text-alive" aria-hidden />
            Create studio
          </p>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <aside
            className="hidden w-[13.5rem] shrink-0 flex-col border-r border-border/80 bg-surface/35 backdrop-blur-md md:flex lg:w-[15rem]"
            aria-label="Create steps"
          >
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
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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

            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </div>
        </div>
      </div>
    </CreateStudioContext.Provider>
  );
}
