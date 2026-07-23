"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { LazyImage } from "../LazyImage";
import { SPRING, T } from "../motion";
import { useCollectionsStore } from "../store";

function nameFontSize(len: number) {
  if (len <= 14) return 40;
  if (len <= 22) return 32;
  if (len <= 34) return 26;
  return 22;
}

export function NewCollectionScreen({ attachItemId }: { attachItemId?: string }) {
  const { getItem, createCollection, popOverlay, pushOverlay } = useCollectionsStore();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const fontSize = nameFontSize(name.length);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [name, fontSize]);

  const item = attachItemId ? getItem(attachItemId) : undefined;
  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const id = createCollection(name, attachItemId);
    if (attachItemId) {
      popOverlay();
      pushOverlay({ type: "newCollectionMade", collectionId: id });
    } else {
      popOverlay();
    }
  };

  const previewImg =
    item?.kind === "artwork"
      ? item.imageUrl
      : item?.kind === "publication"
        ? item.coverUrl
        : "";
  const previewTitle =
    item?.kind === "quote" ? item.text : item && "title" in item ? item.title : "";
  const previewSub =
    item?.kind === "artwork"
      ? item.artist
      : item?.kind === "quote"
        ? item.author
        : "";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-t-[24px] bg-[#f4f4f4]">
      <div className="flex shrink-0 justify-center pt-2.5">
        <div className="h-1 w-10 rounded-full bg-black/15" />
      </div>

      <div className="flex shrink-0 items-center px-5 pt-2">
        <button
          type="button"
          onClick={popOverlay}
          className="flex size-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div className="product-app-scroll flex flex-1 flex-col items-center overflow-y-auto">
        <div className="flex min-h-[200px] w-full flex-1 flex-col items-center justify-center gap-5 px-10 py-10">
          <p
            className="text-center text-[12px]"
            style={{
              fontFamily: "var(--pf-font-mono, inherit)",
              color: "var(--pf-muted, #999)",
            }}
          >
            New collection
          </p>
          <textarea
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value.replace(/\n/g, ""))}
            rows={1}
            placeholder="Collection name"
            className="w-full resize-none overflow-hidden bg-transparent text-center text-black caret-black outline-none placeholder:text-black/30"
            style={{
              fontFamily: "var(--pf-font-display, inherit)",
              fontSize,
              lineHeight: 1.25,
              letterSpacing: "-0.03em",
              paddingBottom: 4,
            }}
            aria-label="Collection name"
          />
        </div>

        {item ? (
          <div className="flex w-full flex-col items-center gap-[30px] px-5 py-5">
            <div className="relative flex h-px w-[156px] items-center justify-center bg-black/10">
              <span className="absolute bg-[#f4f4f4] px-2.5">
                <span className="block size-[18px] rotate-45 border-b border-r border-black opacity-30" />
              </span>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING}
              className="flex flex-col items-center gap-[15px]"
            >
              {item.kind === "quote" ? (
                <div className="flex min-h-[132px] w-[104px] flex-col items-center justify-center gap-2 rounded-[20px] bg-white p-3 text-center">
                  <p
                    className="text-[11px] text-black"
                    style={{
                      fontFamily: "var(--pf-font-display, inherit)",
                      lineHeight: 1.2,
                    }}
                  >
                    {item.text.slice(0, 60)}
                  </p>
                </div>
              ) : (
                <div className="h-[132px] w-[104px] overflow-hidden rounded-[20px]">
                  <LazyImage
                    src={previewImg}
                    alt={previewTitle}
                    className="h-full w-full"
                  />
                </div>
              )}
              <div
                className="flex flex-col items-center gap-0.5 text-center text-[12px] text-black opacity-50"
                style={{ fontFamily: "var(--pf-font-mono, inherit)", lineHeight: 1.3 }}
              >
                <p>{previewTitle.slice(0, 40)}</p>
                {previewSub ? <p>{previewSub}</p> : null}
              </div>
            </motion.div>
          </div>
        ) : null}

        <div className="flex w-full justify-center px-5 py-[30px]">
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            whileTap={canSave ? { scale: 0.96 } : undefined}
            animate={{
              backgroundColor: canSave ? "#000000" : "rgba(0,0,0,0.15)",
              color: canSave ? "#ffffff" : "rgba(0,0,0,0.4)",
            }}
            transition={T.base}
            className="flex items-center justify-center rounded-[30px] px-6 py-[18px]"
          >
            <span
              className="text-[16px] tracking-[-0.03em]"
              style={{
                fontFamily: "var(--pf-font-display, inherit)",
                lineHeight: 1.2,
              }}
            >
              {item ? "Save to new collection" : "Save"}
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
