"use client";

import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import type { Artwork, ContentItem, Publication, Quote } from "./types";
import { LazyImage } from "./LazyImage";
import { SPRING, SPRING_HERO, T } from "./motion";

export function estimateHeight(item: ContentItem, colWidth: number) {
  if (item.kind === "artwork") {
    const ratio = item.height / item.width || 1.3;
    return colWidth * ratio;
  }
  if (item.kind === "publication") return 210;
  return 90 + Math.min(item.text.length, 160) * 0.55;
}

type CardProps = { onOpen: () => void; onSave?: () => void };

function SaveChip({ onSave }: { onSave?: () => void }) {
  if (!onSave) return null;
  return (
    <motion.button
      type="button"
      aria-label="Save to collection"
      onClick={(e) => {
        e.stopPropagation();
        onSave();
      }}
      whileTap={{ scale: 0.9 }}
      transition={SPRING}
      initial={{ opacity: 0, y: 4 }}
      whileHover={{ scale: 1.04 }}
      animate={{ opacity: 1, y: 0, transition: T.micro }}
      className="product-app-save-chip absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/75 text-white backdrop-blur-md"
    >
      <Bookmark size={13} strokeWidth={2} />
    </motion.button>
  );
}

export function ArtworkCard({ item, onOpen, onSave }: { item: Artwork } & CardProps) {
  const ratio = item.height / item.width || 1.3;
  return (
    <div className="product-app-card-lift group relative block w-full">
      <motion.button
        type="button"
        onClick={onOpen}
        whileTap={{ scale: 0.97 }}
        transition={SPRING}
        className="block w-full"
      >
        <div
          className="product-app-media relative w-full bg-white"
          style={{ aspectRatio: `1 / ${ratio}` }}
        >
          <motion.div
            layoutId={`art-${item.id}`}
            transition={SPRING_HERO}
            className="absolute inset-0 overflow-hidden rounded-[6px]"
          >
            <LazyImage src={item.imageUrl} alt={item.title} className="h-full w-full" />
          </motion.div>
        </div>
      </motion.button>
      <SaveChip onSave={onSave} />
    </div>
  );
}

export function QuoteCard({ item, onOpen, onSave }: { item: Quote } & CardProps) {
  return (
    <div className="product-app-card-lift group relative block w-full">
      <motion.button
        type="button"
        onClick={onOpen}
        whileTap={{ scale: 0.97 }}
        transition={SPRING}
        className="block w-full text-center"
      >
        <motion.div
          layoutId={`art-${item.id}`}
          transition={SPRING_HERO}
          className="flex flex-col items-center gap-[15px] rounded-[6px] bg-white p-[19px]"
        >
          <p
            className="text-[13px] tracking-[-0.03em]"
            style={{
              fontFamily: "var(--pf-font-display, inherit)",
              color: "var(--pf-fg, #000)",
              lineHeight: 1.2,
            }}
          >
            {item.text}
          </p>
          <p
            className="text-[10px] tracking-[-0.02em]"
            style={{
              fontFamily: "var(--pf-font-mono, inherit)",
              color: "rgba(0,0,0,0.4)",
            }}
          >
            {item.author}
          </p>
        </motion.div>
      </motion.button>
      <SaveChip onSave={onSave} />
    </div>
  );
}

export function PublicationCard({
  item,
  onOpen,
  onSave,
}: { item: Publication } & CardProps) {
  return (
    <div className="product-app-card-lift group relative block w-full">
      <motion.button
        type="button"
        onClick={onOpen}
        whileTap={{ scale: 0.97 }}
        transition={SPRING}
        className="block w-full"
      >
        <motion.div
          layoutId={`art-${item.id}`}
          transition={SPRING_HERO}
          className="flex flex-col items-center justify-center gap-5 rounded-[6px] border border-dashed border-[rgba(0,0,0,0.2)] px-5 py-6"
        >
          <div className="h-[110px] w-[85px] shrink-0 overflow-hidden rounded-[4px]">
            <LazyImage src={item.coverUrl} alt={item.title} className="h-full w-full" />
          </div>
          <div
            className="flex flex-col items-center text-center text-[12px] tracking-[-0.02em]"
            style={{
              fontFamily: "var(--pf-font-mono, inherit)",
              color: "var(--pf-fg, #000)",
            }}
          >
            <p style={{ lineHeight: "16.5px" }}>{item.title}</p>
            {item.pageCount != null ? (
              <p className="opacity-50">{item.pageCount} pages</p>
            ) : null}
          </div>
        </motion.div>
      </motion.button>
      <SaveChip onSave={onSave} />
    </div>
  );
}

export function ContentCard({
  item,
  onOpen,
  onSave,
}: {
  item: ContentItem;
  onOpen: () => void;
  onSave?: () => void;
}) {
  if (item.kind === "artwork")
    return <ArtworkCard item={item} onOpen={onOpen} onSave={onSave} />;
  if (item.kind === "quote")
    return <QuoteCard item={item} onOpen={onOpen} onSave={onSave} />;
  return <PublicationCard item={item} onOpen={onOpen} onSave={onSave} />;
}
