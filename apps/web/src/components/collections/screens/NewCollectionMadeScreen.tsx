"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Plus } from "lucide-react";
import type { ContentItem } from "../types";
import { LazyImage } from "../LazyImage";
import { fadeUp, SPRING, T } from "../motion";
import { useCollectionsStore } from "../store";

export function NewCollectionMadeScreen({ collectionId }: { collectionId: string }) {
  const { getCollection, itemsInCollection, popOverlay, navigateTab } =
    useCollectionsStore();
  const collection = getCollection(collectionId);
  const items = itemsInCollection(collectionId);
  if (!collection) return null;

  const images = items.filter((i) => i.kind === "artwork").length;

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

      <motion.div
        className="product-app-scroll flex-1 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { ...T.base, delay: 0.22 } }}
      >
        <div className="flex flex-col gap-10 px-5 py-10">
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
          <div className="flex items-center gap-1.5">
            <span className="size-[9px] bg-[#a261da]" />
            <span
              className="text-[12px] text-black"
              style={{ fontFamily: "var(--pf-font-mono, inherit)" }}
            >
              {images}
            </span>
            <span
              className="text-[12px] text-black"
              style={{ fontFamily: "var(--pf-font-mono, inherit)" }}
            >
              Images
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center border-t border-[rgba(0,0,0,0.1)] px-5 py-[30px]">
          <motion.button
            type="button"
            onClick={() => navigateTab("home")}
            whileTap={{ scale: 0.95 }}
            transition={SPRING}
            className="flex items-center gap-2 rounded-[50px] bg-[#1c1c1c] py-2.5 pl-3 pr-[19px]"
          >
            <Plus size={20} color="white" strokeWidth={2} />
            <span
              className="text-[16px] tracking-[-0.03em] text-white"
              style={{
                fontFamily: "var(--pf-font-display, inherit)",
                lineHeight: 1.2,
              }}
            >
              Add to collection
            </span>
          </motion.button>
        </div>

        <div className="flex items-start gap-3 px-5">
          <div className="flex flex-1 flex-col gap-3">
            {items
              .filter((_, i) => i % 2 === 0)
              .map((item, i) => (
                <ItemThumb key={item.id} index={i} item={item} />
              ))}
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {items
              .filter((_, i) => i % 2 === 1)
              .map((item, i) => (
                <ItemThumb key={item.id} index={i} item={item} />
              ))}
            <motion.button
              type="button"
              onClick={() => navigateTab("home")}
              whileTap={{ scale: 0.97 }}
              transition={SPRING}
              className="flex min-h-[180px] w-full items-center justify-center rounded-[6px] bg-white"
              aria-label="Add more"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-black/10">
                <Plus size={18} color="black" strokeWidth={2} />
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ItemThumb({ item, index }: { item: ContentItem; index: number }) {
  const src =
    item.kind === "artwork"
      ? item.imageUrl
      : item.kind === "publication"
        ? item.coverUrl
        : "";
  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="show">
      {item.kind === "quote" ? (
        <div className="w-full rounded-[6px] bg-white p-[18px] text-center">
          <p
            className="text-[13px] text-black"
            style={{
              fontFamily: "var(--pf-font-display, inherit)",
              lineHeight: 1.2,
            }}
          >
            {item.text}
          </p>
          <p
            className="mt-3 text-[10px] text-black/40"
            style={{ fontFamily: "var(--pf-font-mono, inherit)" }}
          >
            {item.author}
          </p>
        </div>
      ) : (
        <div className="product-app-media w-full overflow-hidden">
          <LazyImage src={src} alt="" className="w-full" imgClassName="w-full object-cover" />
        </div>
      )}
    </motion.div>
  );
}
