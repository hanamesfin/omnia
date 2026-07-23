"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { Collection } from "../types";
import { LazyImage } from "../LazyImage";
import { fadeUp, SPRING } from "../motion";
import { useCollectionsStore } from "../store";

export function CollectionsScreen() {
  const { collections, pushOverlay } = useCollectionsStore();

  return (
    <div className="product-app-scroll flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-5">
      <div className="flex flex-col items-center justify-center gap-[21px] py-10">
        <div className="flex flex-col items-center gap-[22px]">
          <h1
            className="text-[clamp(2rem,8vw,3.125rem)] tracking-[-0.03em]"
            style={{
              fontFamily: "var(--pf-font-display, inherit)",
              color: "var(--pf-fg, #000)",
              lineHeight: 1.2,
              fontWeight: 300,
            }}
          >
            Collections
          </h1>
          <p
            className="text-[12px]"
            style={{
              fontFamily: "var(--pf-font-mono, inherit)",
              color: "var(--pf-muted, #999)",
            }}
          >
            {collections.length} collections
          </p>
        </div>
        <motion.button
          type="button"
          onClick={() => pushOverlay({ type: "newCollection" })}
          whileTap={{ scale: 0.92 }}
          transition={SPRING}
          aria-label="New collection"
          className="flex size-[41px] items-center justify-center rounded-full bg-black"
        >
          <Plus size={20} color="white" strokeWidth={2} />
        </motion.button>
      </div>

      <div className="flex flex-col items-center gap-4 pb-4 pt-2">
        {collections.map((c, i) => (
          <motion.div
            key={c.id}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="w-full"
          >
            <CollectionCard
              collection={c}
              onOpen={() =>
                pushOverlay({ type: "collectionDetail", collectionId: c.id })
              }
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CollectionCard({
  collection,
  onOpen,
}: {
  collection: Collection;
  onOpen: () => void;
}) {
  const { itemsInCollection } = useCollectionsStore();
  const previews = itemsInCollection(collection.id)
    .filter((i) => i.kind === "artwork")
    .slice(0, 4);

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileTap={{ scale: 0.97 }}
      transition={SPRING}
      className="product-app-card block w-full overflow-hidden"
    >
      <div className="flex flex-col items-center justify-end gap-4 px-6 pb-2.5 pt-7">
        <p
          className="text-center text-[20px] font-light tracking-[-0.03em]"
          style={{
            fontFamily: "var(--pf-font-display, inherit)",
            color: "var(--pf-fg, #000)",
            lineHeight: 1.2,
          }}
        >
          {collection.name}
        </p>
        <p
          className="text-[10px]"
          style={{
            fontFamily: "var(--pf-font-mono, inherit)",
            color: "var(--pf-muted, #999)",
          }}
        >
          {collection.itemIds.length} items
        </p>
      </div>
      <div className="flex h-[107px] items-center gap-2 p-2">
        {previews.length > 0
          ? previews.map((p) => (
              <div
                key={p.id}
                className="product-app-media h-full flex-1 overflow-hidden"
              >
                <LazyImage
                  src={"imageUrl" in p ? p.imageUrl : ""}
                  alt={collection.name}
                  className="h-full w-full"
                />
              </div>
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="product-app-skeleton h-full flex-1 rounded-[6px]"
              />
            ))}
      </div>
    </motion.button>
  );
}
