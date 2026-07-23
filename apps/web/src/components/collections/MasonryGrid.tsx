"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ContentItem } from "./types";
import { ContentCard, estimateHeight } from "./ContentCards";
import { fadeUp } from "./motion";
import { useCollectionsStore } from "./store";

const COL_WIDTH = 175;

export function MasonryGrid({ items }: { items: ContentItem[] }) {
  const { pushOverlay } = useCollectionsStore();

  const [colA, colB] = useMemo(() => {
    const a: ContentItem[] = [];
    const b: ContentItem[] = [];
    let ha = 0;
    let hb = 0;
    for (const item of items) {
      const h = estimateHeight(item, COL_WIDTH);
      if (ha <= hb) {
        a.push(item);
        ha += h + 12;
      } else {
        b.push(item);
        hb += h + 12;
      }
    }
    return [a, b];
  }, [items]);

  const renderCol = (col: ContentItem[], offset: number) => (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      {col.map((item, i) => (
        <motion.div
          key={item.id}
          custom={offset + i}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <ContentCard
            item={item}
            onOpen={() => pushOverlay({ type: "itemDetail", itemId: item.id })}
            onSave={() => pushOverlay({ type: "saveSheet", itemId: item.id })}
          />
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="flex w-full items-start gap-3 px-5">
      {renderCol(colA, 0)}
      {renderCol(colB, 1)}
    </div>
  );
}
