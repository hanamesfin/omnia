"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import type { ContentItem } from "../types";
import { FilterBar } from "../FilterBar";
import { MasonryGrid } from "../MasonryGrid";
import { useCollectionsStore } from "../store";

type SearchFilter = "all" | "artwork" | "quote" | "publication";

const OPTIONS: { id: SearchFilter; label: string }[] = [
  { id: "all", label: "All saves" },
  { id: "artwork", label: "Artworks" },
  { id: "quote", label: "Quotes" },
  { id: "publication", label: "Publications" },
];

function matches(item: ContentItem, q: string) {
  const s = q.toLowerCase();
  if (item.kind === "artwork") {
    return (
      item.title.toLowerCase().includes(s) ||
      item.artist.toLowerCase().includes(s) ||
      item.typeTitle.toLowerCase().includes(s)
    );
  }
  if (item.kind === "quote") {
    return item.text.toLowerCase().includes(s) || item.author.toLowerCase().includes(s);
  }
  return item.title.toLowerCase().includes(s);
}

export function SearchScreen() {
  const { collections, items } = useCollectionsStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const saved = useMemo(() => {
    const ids = new Set<string>();
    collections.forEach((c) => c.itemIds.forEach((id) => ids.add(id)));
    return Array.from(ids)
      .map((id) => items[id])
      .filter(Boolean) as ContentItem[];
  }, [collections, items]);

  const results = useMemo(() => {
    let r = saved;
    if (filter !== "all") r = r.filter((i) => i.kind === filter);
    if (query.trim()) r = r.filter((i) => matches(i, query.trim()));
    return r;
  }, [saved, filter, query]);

  return (
    <div className="product-app-scroll flex h-full min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="px-5 pb-5 pt-2.5">
        <div className="flex items-center gap-2.5 rounded-[14px] bg-white px-4 py-3.5">
          <SearchIcon size={18} color="rgba(0,0,0,0.4)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-black/30"
            style={{
              fontFamily: "var(--pf-font-mono, inherit)",
              color: query ? "var(--pf-fg, #000)" : "rgba(0,0,0,0.3)",
              caretColor: "#000",
            }}
            aria-label="Search saves"
          />
        </div>
      </div>

      <div className="px-5 pb-6">
        <FilterBar
          options={OPTIONS}
          value={filter}
          onChange={setFilter}
          layoutId="searchFilterInk"
        />
      </div>

      <div className="flex items-baseline gap-2 px-5 pb-3.5">
        <span
          className="text-[20px] tracking-[-0.03em]"
          style={{
            fontFamily: "var(--pf-font-display, inherit)",
            color: "var(--pf-fg, #000)",
            lineHeight: 1.1,
          }}
        >
          Saves
        </span>
        <span
          className="text-[12px]"
          style={{
            fontFamily: "var(--pf-font-mono, inherit)",
            color: "var(--pf-muted, #999)",
          }}
        >
          [{results.length}]
        </span>
      </div>

      {results.length > 0 ? (
        <MasonryGrid items={results} />
      ) : (
        <p
          className="px-5 py-10 text-center text-[12px]"
          style={{
            fontFamily: "var(--pf-font-mono, inherit)",
            color: "var(--pf-muted, #999)",
          }}
        >
          {query.trim()
            ? "No matching saves — try another word or filter."
            : "Save items from My Trove to search them here."}
        </p>
      )}
    </div>
  );
}
