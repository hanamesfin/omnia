"use client";

import { useState } from "react";
import { Star } from "lucide-react";

type Props = {
  value: number;
  count?: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (n: number) => void | Promise<void>;
  className?: string;
  showValue?: boolean;
  disabled?: boolean;
};

/** Premium star rating — display or interactive 1–5 with half-star support. */
export function StarRating({
  value,
  count,
  max = 5,
  size = 16,
  interactive = false,
  onChange,
  className = "",
  showValue = true,
  disabled = false,
}: Props) {
  const clamped = Math.max(0, Math.min(max, Number(value) || 0));
  const [hover, setHover] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  const display = pending ?? hover ?? clamped;

  const pick = (n: number) => {
    if (!interactive || disabled || !onChange) return;
    setPending(n);
    try {
      const result = onChange(n) as unknown;
      // Support async onChange
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>)
          .catch(() => setPending(null))
          .finally(() => {
            // Parent usually updates `value`; clear pending shortly after
            window.setTimeout(() => setPending(null), 400);
          });
      } else {
        window.setTimeout(() => setPending(null), 400);
      }
    } catch {
      setPending(null);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={`${clamped.toFixed(1)} of ${max}`}
    >
      <div
        className="flex items-center gap-0.5"
        role={interactive ? "radiogroup" : "img"}
        aria-label={`${clamped.toFixed(1)} out of ${max} stars`}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: max }).map((_, i) => {
          const n = i + 1;
          if (interactive) {
            const on = Math.round(display) >= n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={Math.round(clamped) === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                disabled={disabled}
                onMouseEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(null)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pick(n);
                }}
                className="inline-flex min-h-[44px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg text-amber-400/35 transition hover:scale-110 hover:bg-amber-400/10 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Star
                  size={size}
                  className={on ? "text-amber-400" : "text-amber-400/40"}
                  fill={on ? "currentColor" : "none"}
                  strokeWidth={1.75}
                />
              </button>
            );
          }

          const fillRatio = Math.max(0, Math.min(1, clamped - i));
          return (
            <span key={n} className="relative inline-flex" style={{ width: size, height: size }}>
              <Star
                size={size}
                className="absolute inset-0 text-muted/30"
                fill="none"
                strokeWidth={1.75}
                aria-hidden
              />
              <span
                className="absolute inset-0 overflow-hidden text-amber-400"
                style={{ width: `${fillRatio * 100}%` }}
              >
                <Star size={size} fill="currentColor" strokeWidth={1.75} aria-hidden />
              </span>
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className="font-mono text-xs tabular-nums text-muted">
          {clamped > 0 ? clamped.toFixed(1) : "New"}
          {typeof count === "number" && count > 0 ? (
            <span className="text-muted/70">
              {" "}
              · {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
            </span>
          ) : null}
        </span>
      )}
    </div>
  );
}
