"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, X } from "lucide-react";
import { LazyImage } from "../LazyImage";
import { SPRING, T, slideUp } from "../motion";
import { useCollectionsStore } from "../store";

/**
 * Mobbin / Pinterest-inspired save flow:
 * pick a destination collection (or create one), confirm, settle.
 */
export function SaveSheetScreen({ itemId }: { itemId: string }) {
  const {
    getItem,
    collections,
    collectionsForItem,
    toggleItemInCollection,
    pushOverlay,
    popOverlay,
  } = useCollectionsStore();
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const item = getItem(itemId);
  if (!item) return null;

  const members = new Set(collectionsForItem(itemId).map((c) => c.id));
  const thumb =
    item.kind === "artwork"
      ? item.imageUrl
      : item.kind === "publication"
        ? item.coverUrl
        : "";
  const title =
    item.kind === "quote"
      ? item.text.slice(0, 48) + (item.text.length > 48 ? "…" : "")
      : item.title;

  return (
    <motion.div
      variants={slideUp}
      initial="hidden"
      animate="show"
      exit="exit"
      className="absolute inset-x-0 bottom-0 z-30 flex max-h-[78%] flex-col overflow-hidden rounded-t-[20px] bg-[#f4f4f4] shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"
      role="dialog"
      aria-label="Save to collection"
    >
      <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          {thumb ? (
            <div className="product-app-media size-11 shrink-0 overflow-hidden">
              <LazyImage src={thumb} alt="" className="h-full w-full" />
            </div>
          ) : (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[6px] bg-white text-[10px] text-black/40">
              Q
            </div>
          )}
          <div className="min-w-0">
            <p
              className="truncate text-[15px] tracking-[-0.03em]"
              style={{
                fontFamily: "var(--pf-font-display, inherit)",
                color: "var(--pf-fg, #000)",
                lineHeight: 1.2,
              }}
            >
              Save to…
            </p>
            <p
              className="mt-0.5 truncate text-[10px]"
              style={{
                fontFamily: "var(--pf-font-mono, inherit)",
                color: "var(--pf-muted, #999)",
              }}
            >
              {title}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={popOverlay}
          className="flex size-9 shrink-0 items-center justify-center rounded-full active:scale-95"
          aria-label="Close"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className="product-app-scroll flex-1 overflow-y-auto px-5 pb-6">
        <ul className="flex flex-col gap-2">
          {collections.map((c) => {
            const active = members.has(c.id);
            const preview = c.itemIds
              .map((id) => getItem(id))
              .find((i) => i?.kind === "artwork");
            return (
              <li key={c.id}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING}
                  onClick={() => {
                    toggleItemInCollection(itemId, c.id);
                    if (!active) {
                      setJustSaved(c.name);
                      window.setTimeout(() => popOverlay(), 520);
                    }
                  }}
                  className="flex w-full items-center gap-3 rounded-[12px] bg-white px-3 py-3 text-left"
                >
                  <div className="product-app-media size-12 shrink-0 overflow-hidden bg-[rgba(0,0,0,0.04)]">
                    {preview && preview.kind === "artwork" ? (
                      <LazyImage
                        src={preview.imageUrl}
                        alt=""
                        className="h-full w-full"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[16px] tracking-[-0.03em]"
                      style={{
                        fontFamily: "var(--pf-font-display, inherit)",
                        lineHeight: 1.2,
                      }}
                    >
                      {c.name}
                    </p>
                    <p
                      className="mt-0.5 text-[10px]"
                      style={{
                        fontFamily: "var(--pf-font-mono, inherit)",
                        color: "var(--pf-muted, #999)",
                      }}
                    >
                      {c.itemIds.length} items
                    </p>
                  </div>
                  <span
                    className={`flex size-8 items-center justify-center rounded-full ${
                      active ? "bg-black text-white" : "bg-[rgba(0,0,0,0.06)]"
                    }`}
                  >
                    {active ? (
                      <Check size={14} strokeWidth={2.25} />
                    ) : (
                      <Plus size={14} strokeWidth={2} />
                    )}
                  </span>
                </motion.button>
              </li>
            );
          })}
        </ul>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          onClick={() =>
            pushOverlay({ type: "newCollection", attachItemId: itemId })
          }
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[rgba(0,0,0,0.12)] bg-transparent py-3.5"
        >
          <Plus size={16} strokeWidth={1.75} />
          <span
            className="text-[14px] tracking-[-0.03em]"
            style={{
              fontFamily: "var(--pf-font-display, inherit)",
              lineHeight: 1.2,
            }}
          >
            New collection
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {justSaved ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: T.micro }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center"
          >
            <span
              className="rounded-full bg-black px-4 py-2 text-[11px] text-white"
              style={{ fontFamily: "var(--pf-font-mono, inherit)" }}
            >
              Saved to {justSaved}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
