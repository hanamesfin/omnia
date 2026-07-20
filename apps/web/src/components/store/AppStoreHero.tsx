"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OmniStar } from "@/components/OmniStar";

const SLIDES = [
  {
    id: "experience",
    headline: "The Omni Experience: Redefining AI Interaction",
    tagline:
      "Discover the power of multi-turn conversational agents, built on ChatGPT-class Omni.",
    cards: ["reasoning", "chat", "files"] as const,
  },
  {
    id: "tools",
    headline: "Tools, Memory, and Files — First Class",
    tagline: "Frontier agents that reason across your corpus without inventing facts.",
    cards: ["files", "reasoning", "chat"] as const,
  },
];

function FeatureCard({ type }: { type: "reasoning" | "chat" | "files" }) {
  const labels = {
    reasoning: { title: "Reasoning", sub: "Step plans & risk flags" },
    chat: { title: "Multi-turn", sub: "Context that persists" },
    files: { title: "File analysis", sub: "CSV · PDF · code" },
  };
  const { title, sub } = labels[type];
  const accents = {
    reasoning: "from-violet-500/30 to-indigo-600/20 border-cyan-400/60",
    chat: "from-fuchsia-500/25 to-purple-700/20 border-pink-400/55",
    files: "from-emerald-500/25 to-teal-700/20 border-lime-400/55",
  };

  return (
    <div
      className={`relative h-28 w-36 shrink-0 overflow-hidden rounded-2xl border-2 bg-gradient-to-br shadow-[0_0_24px_rgba(56,189,248,0.25)] sm:h-32 sm:w-40 ${accents[type]}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.12),transparent_50%)]" />
      <div className="relative flex h-full flex-col justify-end p-3">
        {type === "reasoning" && (
          <div className="mb-2 space-y-1">
            <div className="h-1 w-full rounded-full bg-white/25" />
            <div className="h-1 w-4/5 rounded-full bg-cyan-300/50" />
            <div className="h-1 w-3/5 rounded-full bg-violet-300/40" />
          </div>
        )}
        {type === "chat" && (
          <div className="mb-2 space-y-1.5">
            <div className="ml-auto h-6 w-[70%] rounded-lg rounded-br-sm bg-white/20" />
            <div className="h-6 w-[80%] rounded-lg rounded-bl-sm bg-fuchsia-300/25" />
          </div>
        )}
        {type === "files" && (
          <div className="mb-2 flex gap-1">
            <div className="h-8 w-6 rounded bg-emerald-300/30" />
            <div className="h-8 flex-1 rounded bg-white/15" />
          </div>
        )}
        <p className="text-[11px] font-semibold text-white">{title}</p>
        <p className="text-[9px] text-white/70">{sub}</p>
      </div>
    </div>
  );
}

export function AppStoreHero() {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];

  return (
    <section className="app-store-hero relative overflow-hidden rounded-[1.35rem] sm:rounded-[1.75rem]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2d1b69] via-[#4c1d95] to-[#1e1b4b]" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative flex min-h-[280px] flex-col gap-6 p-6 sm:min-h-[320px] sm:flex-row sm:items-center sm:p-10">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => setIdx((i) => (i === 0 ? SLIDES.length - 1 : i - 1))}
          className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20 sm:inline-flex"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => setIdx((i) => (i + 1) % SLIDES.length)}
          className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20 sm:inline-flex"
        >
          <ChevronRight size={20} />
        </button>

        <div className="relative z-[1] max-w-lg flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200/90">
            Featured
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-[2rem]">
            {slide.headline}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-violet-100/85 sm:text-[15px]">
            {slide.tagline}
          </p>
        </div>

        <div className="relative z-[1] flex flex-1 items-center justify-center sm:justify-end">
          <div className="relative flex items-end gap-2 sm:gap-3">
            {slide.cards.map((c, i) => (
              <div
                key={c}
                className="transition-transform duration-300"
                style={{
                  transform: `translateY(${i === 1 ? -12 : i === 0 ? 4 : 8}px) rotate(${i === 0 ? -4 : i === 2 ? 4 : 0}deg)`,
                  zIndex: i === 1 ? 3 : 1,
                }}
              >
                <FeatureCard type={c} />
              </div>
            ))}
            <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22%] bg-gradient-to-br from-violet-400 to-indigo-600 shadow-[0_0_32px_rgba(167,139,250,0.65)] ring-2 ring-white/30 sm:h-[4.5rem] sm:w-[4.5rem]">
                <OmniStar size={36} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex justify-center gap-1.5 pb-4">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-6 bg-white" : "w-1.5 bg-white/35"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
