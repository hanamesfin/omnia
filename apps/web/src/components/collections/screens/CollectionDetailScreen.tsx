"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Plus } from "lucide-react";
import { MasonryGrid } from "../MasonryGrid";
import { SPRING, T } from "../motion";
import { useCollectionsStore } from "../store";

export function CollectionDetailScreen({ collectionId }: { collectionId: string }) {
  const { getCollection, itemsInCollection, popOverlay, navigateTab } =
    useCollectionsStore();
  const collection = getCollection(collectionId);
  const items = itemsInCollection(collectionId);

  if (!collection) return null;

  const counts = {
    images: items.filter((i) => i.kind === "artwork").length,
    quotes: items.filter((i) => i.kind === "quote").length,
    documents: items.filter((i) => i.kind === "publication").length,
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#f4f4f4]">
      <div className="flex shrink-0 items-center px-5 pt-3">
        <button
          type="button"
          onClick={popOverlay}
          className="flex size-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div className="product-app-scroll flex-1 overflow-y-auto">
        <motion.div
          className="flex flex-col gap-10 px-5 py-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { ...T.base, delay: 0.1 } }}
        >
          <div className="flex flex-col gap-5">
            <p
              className="text-[12px]"
              style={{
                fontFamily: "var(--pf-font-mono, inherit)",
                color: "var(--pf-muted, #999)",
              }}
            >
              Collection
            </p>
            <div className="flex items-start gap-1 text-black">
              <p
                className="flex-1 text-[30px] tracking-[-0.03em]"
                style={{
                  fontFamily: "var(--pf-font-display, inherit)",
                  lineHeight: 1.2,
                  fontWeight: 300,
                }}
              >
                {collection.name}
              </p>
              <p
                className="whitespace-nowrap text-[12px]"
                style={{ fontFamily: "var(--pf-font-mono, inherit)" }}
              >
                [{collection.itemIds.length}]
              </p>
            </div>
          </div>

          <div className="flex items-center gap-[21px]">
            <Legend color="#a261da" n={counts.images} label="Images" />
            <Legend color="#3d83ed" n={counts.quotes} label="Quotes" />
            <Legend color="#cada61" n={counts.documents} label="Documents" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { ...T.base, delay: 0.24 } }}
        >
          <div className="flex flex-col items-center border-t border-[rgba(0,0,0,0.1)] px-5 py-[30px]">
            <motion.button
              type="button"
              onClick={() => navigateTab("home")}
              whileTap={{ scale: 0.95 }}
              transition={SPRING}
              className="flex items-center gap-1.5 rounded-[50px] bg-[#1c1c1c] py-2.5 pl-3 pr-[19px]"
            >
              <Plus size={18} color="white" strokeWidth={2} />
              <span
                className="text-[14px] tracking-[-0.03em] text-white"
                style={{
                  fontFamily: "var(--pf-font-display, inherit)",
                  lineHeight: 1.2,
                }}
              >
                Add to collection
              </span>
            </motion.button>
          </div>

          <MasonryGrid items={items} />
        </motion.div>
      </div>
    </div>
  );
}

function Legend({ color, n, label }: { color: string; n: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-[9px]" style={{ background: color }} />
      <span
        className="text-[10px] text-black"
        style={{ fontFamily: "var(--pf-font-mono, inherit)" }}
      >
        {n}
      </span>
      <span
        className="text-[10px] text-black"
        style={{ fontFamily: "var(--pf-font-mono, inherit)" }}
      >
        {label}
      </span>
    </div>
  );
}
