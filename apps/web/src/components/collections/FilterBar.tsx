"use client";

import { motion } from "framer-motion";
import { SPRING, T } from "./motion";

export function FilterBar<T extends string>({
  options,
  value,
  onChange,
  layoutId,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  layoutId: string;
}) {
  return (
    <div className="product-app-filter">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="relative pb-1.5"
            aria-pressed={active}
          >
            <motion.span
              animate={{ opacity: active ? 1 : 0.4 }}
              transition={T.micro}
              className="whitespace-nowrap text-[12px] tracking-[-0.02em]"
              style={{
                fontFamily: "var(--pf-font-mono, inherit)",
                color: "var(--pf-fg, #000)",
              }}
            >
              {opt.label}
            </motion.span>
            {active ? (
              <motion.span
                layoutId={layoutId}
                transition={SPRING}
                className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-full bg-black"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
