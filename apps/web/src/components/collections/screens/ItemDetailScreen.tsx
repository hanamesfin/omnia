"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, MoreHorizontal, Plus, X } from "lucide-react";
import type { ContentItem } from "../types";
import { LazyImage } from "../LazyImage";
import { fadeUp, SPRING, SPRING_HERO, T, EASE } from "../motion";
import { useCollectionsStore } from "../store";

export function ItemDetailScreen({ itemId }: { itemId: string }) {
  const {
    getItem,
    collections,
    collectionsForItem,
    toggleItemInCollection,
    popOverlay,
    pushOverlay,
  } = useCollectionsStore();
  const [showAll, setShowAll] = useState(false);

  const item = getItem(itemId);
  if (!item) return null;

  const members = collectionsForItem(itemId);
  const memberIds = new Set(members.map((c) => c.id));
  const suggestions = collections.filter((c) => !memberIds.has(c.id));
  const visibleSuggestions = showAll ? suggestions : suggestions.slice(0, 4);
  const hiddenCount = suggestions.length - visibleSuggestions.length;

  const bgImage =
    item.kind === "artwork"
      ? item.imageUrl
      : item.kind === "publication"
        ? item.coverUrl
        : "";
  const heroRatio =
    item.kind === "artwork" ? item.height / item.width || 1.2 : 1.2;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: T.base }}
        exit={{ opacity: 0, transition: { duration: 0.08, ease: EASE } }}
        className="absolute inset-0"
      >
        <div className="absolute inset-0 bg-[#1c1c1c]" />
        {bgImage ? (
          <>
            <LazyImage
              src={bgImage}
              alt=""
              className="h-full w-full"
              imgClassName="scale-125 object-cover blur-3xl"
            />
            <div className="absolute inset-0 bg-black/65" />
          </>
        ) : null}
      </motion.div>

      <div className="relative flex h-full flex-col">
        <div className="flex shrink-0 justify-end px-5 pt-3">
          <button
            type="button"
            onClick={popOverlay}
            className="flex size-10 items-center justify-center rounded-full text-white active:scale-95"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="product-app-scroll flex-1 overflow-y-auto px-5 pb-[60px]">
          <div className="flex flex-col items-center gap-[30px] pt-2.5">
            <Header item={item} />

            <div className="w-full px-2.5">
              <motion.div
                layoutId={`art-${item.id}`}
                transition={SPRING_HERO}
                className="w-full overflow-hidden rounded-[20px] border border-white/20 shadow-[0px_4px_50px_rgba(0,0,0,0.4)]"
              >
                {item.kind === "quote" ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center gap-[18px] bg-white px-6 py-[60px] text-center">
                    <p
                      className="text-[22px] tracking-[-0.03em] text-black"
                      style={{
                        fontFamily: "var(--pf-font-display, inherit)",
                        lineHeight: 1.25,
                      }}
                    >
                      {item.text}
                    </p>
                    <p
                      className="text-[12px] text-black/50"
                      style={{ fontFamily: "var(--pf-font-mono, inherit)" }}
                    >
                      {item.author}
                    </p>
                  </div>
                ) : (
                  <div className="w-full" style={{ aspectRatio: `1 / ${heroRatio}` }}>
                    <LazyImage
                      src={bgImage}
                      alt={"title" in item ? item.title : ""}
                      className="h-full w-full"
                    />
                  </div>
                )}
              </motion.div>
            </div>

            <div className="flex items-center gap-1">
              <Check size={12} color="#FFE959" />
              <span
                className="text-[12px] text-white"
                style={{ fontFamily: "var(--pf-font-body, inherit)" }}
              >
                Added to ({members.length}) Collection
                {members.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="flex w-full flex-wrap items-center justify-center gap-2">
              {members.map((c) => (
                <Pill
                  key={c.id}
                  active
                  label={c.name}
                  onClick={() => toggleItemInCollection(item.id, c.id)}
                />
              ))}
              {visibleSuggestions.map((c) => (
                <Pill
                  key={c.id}
                  active={false}
                  label={c.name}
                  onClick={() => toggleItemInCollection(item.id, c.id)}
                />
              ))}
              {hiddenCount > 0 ? (
                <motion.button
                  type="button"
                  onClick={() => setShowAll(true)}
                  whileTap={{ scale: 0.94 }}
                  transition={SPRING}
                  className="flex items-center justify-center rounded-full border border-white/70 bg-white/10 px-[18px] py-3.5"
                  aria-label="Show more collections"
                >
                  <MoreHorizontal size={18} color="white" />
                </motion.button>
              ) : null}
              <motion.button
                type="button"
                onClick={() => pushOverlay({ type: "saveSheet", itemId: item.id })}
                whileTap={{ scale: 0.94 }}
                transition={SPRING}
                className="flex items-center justify-center gap-2 rounded-full bg-white px-[18px] py-3.5"
                aria-label="Open save sheet"
              >
                <Plus size={16} color="black" strokeWidth={2} />
                <span
                  className="text-[16px] tracking-[-0.03em] text-black"
                  style={{
                    fontFamily: "var(--pf-font-display, inherit)",
                    lineHeight: 1.2,
                  }}
                >
                  Save to…
                </span>
              </motion.button>
            </div>

            <div className="flex w-full justify-center border-t border-white/30 pt-5">
              <motion.button
                type="button"
                onClick={() =>
                  pushOverlay({ type: "newCollection", attachItemId: item.id })
                }
                whileTap={{ scale: 0.96 }}
                transition={SPRING}
                className="flex items-center gap-2.5 px-[15px] py-[15px]"
              >
                <Plus size={22} color="white" strokeWidth={1.6} />
                <span
                  className="text-[20px] tracking-[-0.03em] text-white"
                  style={{
                    fontFamily: "var(--pf-font-display, inherit)",
                    lineHeight: 1.2,
                  }}
                >
                  Create a new collection
                </span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ item }: { item: ContentItem }) {
  const type =
    item.kind === "artwork"
      ? item.typeTitle
      : item.kind === "quote"
        ? "Quote"
        : "Publication";
  const title =
    item.kind === "artwork"
      ? item.title
      : item.kind === "quote"
        ? item.text
        : item.title;
  const sub =
    item.kind === "artwork"
      ? item.artist
      : item.kind === "quote"
        ? item.author
        : item.pageCount != null
          ? `${item.pageCount} pages`
          : "";

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="flex w-full flex-col items-center gap-[18px] px-2.5 text-center text-white"
    >
      <p
        className="text-[12px] opacity-50"
        style={{ fontFamily: "var(--pf-font-mono, inherit)" }}
      >
        {type}
      </p>
      <p
        className="text-[30px] tracking-[-0.03em]"
        style={{
          fontFamily: "var(--pf-font-display, inherit)",
          lineHeight: 1.2,
        }}
      >
        {title}
      </p>
      <p className="text-[12px]" style={{ fontFamily: "var(--pf-font-mono, inherit)" }}>
        {sub}
      </p>
    </motion.div>
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={SPRING}
      className={`flex items-center justify-center gap-2 rounded-full py-3.5 pl-[15px] pr-5 ${
        active ? "bg-white" : "border border-white/70 bg-white/10"
      }`}
    >
      {active ? (
        <Check size={18} color="black" strokeWidth={2} />
      ) : (
        <Plus size={18} color="white" strokeWidth={1.6} />
      )}
      <span
        className={`whitespace-nowrap text-[18px] tracking-[-0.03em] ${
          active ? "text-black" : "text-white"
        }`}
        style={{
          fontFamily: "var(--pf-font-display, inherit)",
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
    </motion.button>
  );
}
