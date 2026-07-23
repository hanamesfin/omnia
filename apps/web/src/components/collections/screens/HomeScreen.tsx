"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FilterBar } from "../FilterBar";
import { MasonryGrid } from "../MasonryGrid";
import { fadeUp, T } from "../motion";
import { useCollectionsStore } from "../store";

type HomeFilter = "all" | "artwork" | "quote" | "publication";

const OPTIONS: { id: HomeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "artwork", label: "Artworks" },
  { id: "quote", label: "Quotes" },
  { id: "publication", label: "Publications" },
];

export function HomeScreen() {
  const { feed, status } = useCollectionsStore();
  const [filter, setFilter] = useState<HomeFilter>("all");

  const items = useMemo(
    () => (filter === "all" ? feed : feed.filter((i) => i.kind === filter)),
    [feed, filter]
  );

  return (
    <div className="product-app-scroll flex h-full min-h-0 flex-1 flex-col overflow-y-auto">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center pb-4 pt-2.5"
      >
        <div className="flex items-baseline gap-2.5">
          <span
            className="text-[20px] tracking-[-0.03em]"
            style={{
              fontFamily: "var(--pf-font-display, inherit)",
              color: "var(--pf-fg, #000)",
              lineHeight: 1.1,
            }}
          >
            My Trove
          </span>
          <span
            className="text-[12px]"
            style={{
              fontFamily: "var(--pf-font-mono, inherit)",
              color: "var(--pf-muted, #999)",
            }}
          >
            [{status === "loading" ? "…" : feed.length}]
          </span>
        </div>
        <p
          className="mt-2 max-w-[16rem] text-center text-[10px] tracking-[-0.02em]"
          style={{
            fontFamily: "var(--pf-font-mono, inherit)",
            color: "var(--pf-muted, #999)",
          }}
        >
          Quiet canvas — browse, then save into collections.
        </p>
      </motion.div>

      <div
        className="sticky top-0 z-10 px-5 pb-4 pt-1 backdrop-blur-md"
        style={{
          background:
            "color-mix(in srgb, var(--pf-bg, #f4f4f4) 92%, transparent)",
        }}
      >
        <FilterBar
          options={OPTIONS}
          value={filter}
          onChange={setFilter}
          layoutId="homeFilterInk"
        />
      </div>

      {status === "loading" ? (
        <SkeletonGrid />
      ) : status === "error" && feed.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: T.base }}
          className="px-8 py-16 text-center text-[12px]"
          style={{
            fontFamily: "var(--pf-font-mono, inherit)",
            color: "var(--pf-muted, #999)",
          }}
        >
          Couldn’t reach the archive. Showing local seeds when available —
          pull to refresh later.
        </motion.p>
      ) : items.length === 0 ? (
        <p
          className="px-8 py-16 text-center text-[12px]"
          style={{
            fontFamily: "var(--pf-font-mono, inherit)",
            color: "var(--pf-muted, #999)",
          }}
        >
          Nothing in this filter yet.
        </p>
      ) : (
        <MasonryGrid items={items} />
      )}
    </div>
  );
}

function SkeletonGrid() {
  const heights = [220, 150, 180, 240, 160, 200, 175, 210];
  return (
    <div className="flex w-full items-start gap-3 px-5">
      {[0, 1].map((col) => (
        <div key={col} className="flex flex-1 flex-col gap-3">
          {heights
            .filter((_, i) => i % 2 === col)
            .map((h, i) => (
              <div
                key={i}
                className="product-app-skeleton w-full rounded-[6px]"
                style={{ height: h }}
              />
            ))}
        </div>
      ))}
    </div>
  );
}
