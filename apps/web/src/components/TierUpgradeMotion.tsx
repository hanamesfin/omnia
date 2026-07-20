"use client";

import { useEffect, useState } from "react";
import { ComplexityMark } from "@/components/ComplexityMark";

type Props = {
  tier: "normal" | "enterprise";
  /** When true, play flat → layered once after switching to enterprise */
  play?: boolean;
  className?: string;
};

/**
 * Visual "level up" when selecting Enterprise Create — flat card lifts into layers.
 */
export function TierUpgradeMotion({ tier, play = true, className = "" }: Props) {
  const [phase, setPhase] = useState<"flat" | "lift" | "layered">(
    tier === "enterprise" ? "layered" : "flat"
  );

  useEffect(() => {
    if (tier === "normal") {
      setPhase("flat");
      return;
    }
    if (!play) {
      setPhase("layered");
      return;
    }
    setPhase("flat");
    const t1 = window.setTimeout(() => setPhase("lift"), 40);
    const t2 = window.setTimeout(() => setPhase("layered"), 420);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [tier, play]);

  const layered = phase === "layered" || phase === "lift";

  return (
    <div
      className={`relative mx-auto h-28 w-40 ${className}`}
      aria-hidden
      data-tier={tier}
      data-phase={phase}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-x-2 rounded-2xl border border-border bg-surface shadow-soft transition-all duration-500 ease-out"
          style={{
            height: "4.5rem",
            top: layered ? `${0.35 + i * 0.55}rem` : "1.1rem",
            transform: layered
              ? `translateY(${i * -2}px) scale(${1 - i * 0.02})`
              : "translateY(0) scale(1)",
            opacity: tier === "normal" && i > 0 ? 0 : layered ? 1 - i * 0.12 : i === 0 ? 1 : 0,
            zIndex: 3 - i,
            background:
              i === 0
                ? "linear-gradient(145deg, color-mix(in oklab, var(--alive) 18%, transparent), var(--surface))"
                : undefined,
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <ComplexityMark
          tier={tier}
          size={22}
          className={`text-alive transition-transform duration-500 ${
            phase === "lift" ? "scale-125" : "scale-100"
          }`}
        />
      </div>
    </div>
  );
}
