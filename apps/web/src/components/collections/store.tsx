"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchArtworks } from "./aic";
import {
  COLLECTION_DEFS,
  PUBLICATION_SEEDS,
  QUOTES,
  buildPublications,
} from "./content";
import type {
  Collection,
  CollectionsTab,
  ContentItem,
  Overlay,
} from "./types";

export type Status = "loading" | "ready" | "error";

type StoreValue = {
  status: Status;
  items: Record<string, ContentItem>;
  feed: ContentItem[];
  collections: Collection[];
  overlayStack: Overlay[];
  pushOverlay: (o: Overlay) => void;
  popOverlay: () => void;
  closeOverlays: () => void;
  navigateTab: (t: CollectionsTab) => void;
  getItem: (id: string) => ContentItem | undefined;
  getCollection: (id: string) => Collection | undefined;
  itemsInCollection: (id: string) => ContentItem[];
  collectionsForItem: (itemId: string) => Collection[];
  toggleItemInCollection: (itemId: string, collectionId: string) => void;
  createCollection: (name: string, attachItemId?: string) => string;
};

const StoreContext = createContext<StoreValue | null>(null);

const RESERVED_COVERS = PUBLICATION_SEEDS.length;

function interleave(
  artworks: ContentItem[],
  quotes: ContentItem[],
  pubs: ContentItem[]
) {
  const out: ContentItem[] = [];
  const max = Math.max(artworks.length, quotes.length, pubs.length);
  for (let i = 0; i < max; i++) {
    if (artworks[i]) out.push(artworks[i]);
    if (quotes[i]) out.push(quotes[i]);
    if (pubs[i]) out.push(pubs[i]);
  }
  return out;
}

function seedCollections(
  artworks: ContentItem[],
  quotes: ContentItem[],
  pubs: ContentItem[]
): Collection[] {
  let aCur = 0;
  let qCur = 0;
  let pCur = 0;
  const pick = <T,>(arr: T[], cur: number, n: number): [T[], number] => {
    const out: T[] = [];
    if (arr.length === 0) return [out, cur];
    for (let i = 0; i < n; i++) out.push(arr[(cur + i) % arr.length]);
    return [out, cur + n];
  };

  return COLLECTION_DEFS.map((def, idx) => {
    const total = 15 + ((idx * 3) % 11);
    const artCount = Math.round(total * (2 / 3));
    const restCount = total - artCount;
    const quoteCount = Math.ceil(restCount / 2);
    const pubCount = restCount - quoteCount;

    let arts: ContentItem[];
    let qs: ContentItem[];
    let ps: ContentItem[];
    [arts, aCur] = pick(artworks, aCur, artCount);
    [qs, qCur] = pick(quotes, qCur, quoteCount);
    [ps, pCur] = pick(pubs, pCur, pubCount);

    const ids = Array.from(
      new Set([...arts, ...qs, ...ps].filter(Boolean).map((i) => i.id))
    );
    return { ...def, itemIds: ids };
  });
}

type ProviderProps = {
  children: ReactNode;
  onNavigateTab?: (tab: CollectionsTab) => void;
  onOverlayChange?: (top: Overlay | null) => void;
};

export function CollectionsStoreProvider({
  children,
  onNavigateTab,
  onOverlayChange,
}: ProviderProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [items, setItems] = useState<Record<string, ContentItem>>({});
  const [feed, setFeed] = useState<ContentItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [overlayStack, setOverlayStack] = useState<Overlay[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const artworks = await fetchArtworks();
      if (cancelled) return;

      const coverSources =
        artworks.length > RESERVED_COVERS
          ? artworks.slice(artworks.length - RESERVED_COVERS)
          : artworks.slice(0, RESERVED_COVERS);
      const artworkContent =
        artworks.length > RESERVED_COVERS
          ? artworks.slice(0, artworks.length - RESERVED_COVERS)
          : artworks;

      const publications = buildPublications(coverSources);
      const quotes: ContentItem[] = QUOTES;
      const all: ContentItem[] = [...artworkContent, ...quotes, ...publications];
      const map: Record<string, ContentItem> = {};
      for (const it of all) map[it.id] = it;

      setItems(map);
      setFeed(interleave(artworkContent, quotes, publications));
      setCollections(seedCollections(artworkContent, quotes, publications));
      setStatus(artworks.length ? "ready" : "error");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onOverlayChange?.(overlayStack[overlayStack.length - 1] || null);
  }, [overlayStack, onOverlayChange]);

  const pushOverlay = useCallback(
    (o: Overlay) => setOverlayStack((s) => [...s, o]),
    []
  );
  const popOverlay = useCallback(
    () => setOverlayStack((s) => s.slice(0, -1)),
    []
  );
  const closeOverlays = useCallback(() => setOverlayStack([]), []);

  const navigateTab = useCallback(
    (t: CollectionsTab) => {
      setOverlayStack([]);
      onNavigateTab?.(t);
    },
    [onNavigateTab]
  );

  const getItem = useCallback((id: string) => items[id], [items]);
  const getCollection = useCallback(
    (id: string) => collections.find((c) => c.id === id),
    [collections]
  );
  const itemsInCollection = useCallback(
    (id: string) => {
      const c = collections.find((col) => col.id === id);
      if (!c) return [];
      return c.itemIds.map((iid) => items[iid]).filter(Boolean) as ContentItem[];
    },
    [collections, items]
  );
  const collectionsForItem = useCallback(
    (itemId: string) => collections.filter((c) => c.itemIds.includes(itemId)),
    [collections]
  );

  const toggleItemInCollection = useCallback(
    (itemId: string, collectionId: string) => {
      setCollections((cols) =>
        cols.map((c) => {
          if (c.id !== collectionId) return c;
          const has = c.itemIds.includes(itemId);
          return {
            ...c,
            itemIds: has
              ? c.itemIds.filter((id) => id !== itemId)
              : [itemId, ...c.itemIds],
          };
        })
      );
    },
    []
  );

  const createCollection = useCallback((name: string, attachItemId?: string) => {
    const id = `c-${Date.now()}`;
    setCollections((cols) => [
      {
        id,
        name: name.trim() || "Untitled",
        itemIds: attachItemId ? [attachItemId] : [],
      },
      ...cols,
    ]);
    return id;
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      status,
      items,
      feed,
      collections,
      overlayStack,
      pushOverlay,
      popOverlay,
      closeOverlays,
      navigateTab,
      getItem,
      getCollection,
      itemsInCollection,
      collectionsForItem,
      toggleItemInCollection,
      createCollection,
    }),
    [
      status,
      items,
      feed,
      collections,
      overlayStack,
      pushOverlay,
      popOverlay,
      closeOverlays,
      navigateTab,
      getItem,
      getCollection,
      itemsInCollection,
      collectionsForItem,
      toggleItemInCollection,
      createCollection,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useCollectionsStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useCollectionsStore must be used within CollectionsStoreProvider");
  return ctx;
}
