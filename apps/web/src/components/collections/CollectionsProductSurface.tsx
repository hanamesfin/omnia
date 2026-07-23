"use client";

import { useCallback, useEffect } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  CollectionsStoreProvider,
  useCollectionsStore,
} from "./store";
import { collectionsTabFromPageId } from "./is-collections-product";
import type { CollectionsTab, Overlay } from "./types";
import { expandIn, settleIn, slideUp, scrim } from "./motion";
import { HomeScreen } from "./screens/HomeScreen";
import { CollectionsScreen } from "./screens/CollectionsScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { CollectionDetailScreen } from "./screens/CollectionDetailScreen";
import { ItemDetailScreen } from "./screens/ItemDetailScreen";
import { NewCollectionScreen } from "./screens/NewCollectionScreen";
import { NewCollectionMadeScreen } from "./screens/NewCollectionMadeScreen";
import { SaveSheetScreen } from "./screens/SaveSheetScreen";

function overlayKey(o: Overlay) {
  if (o.type === "collectionDetail") return `cd-${o.collectionId}`;
  if (o.type === "itemDetail") return `id-${o.itemId}`;
  if (o.type === "saveSheet") return `ss-${o.itemId}`;
  if (o.type === "newCollectionMade") return `ncm-${o.collectionId}`;
  return `nc-${o.attachItemId ?? "root"}`;
}

function renderOverlay(o: Overlay) {
  switch (o.type) {
    case "collectionDetail":
      return <CollectionDetailScreen collectionId={o.collectionId} />;
    case "itemDetail":
      return <ItemDetailScreen itemId={o.itemId} />;
    case "saveSheet":
      return <SaveSheetScreen itemId={o.itemId} />;
    case "newCollection":
      return <NewCollectionScreen attachItemId={o.attachItemId} />;
    case "newCollectionMade":
      return <NewCollectionMadeScreen collectionId={o.collectionId} />;
  }
}

function variantsFor(o: Overlay) {
  if (o.type === "newCollection" || o.type === "saveSheet") return slideUp;
  if (o.type === "newCollectionMade") return settleIn;
  return expandIn;
}

function CollectionsInner({ pageId }: { pageId: string }) {
  const tab = collectionsTabFromPageId(pageId) || "home";
  const { overlayStack, closeOverlays, popOverlay } = useCollectionsStore();

  useEffect(() => {
    closeOverlays();
  }, [pageId, closeOverlays]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="absolute inset-0 flex flex-col">
        {tab === "home" && <HomeScreen />}
        {tab === "collections" && <CollectionsScreen />}
        {tab === "search" && <SearchScreen />}
      </div>

      <AnimatePresence>
        {overlayStack.map((o, i) => {
          if (o.type === "itemDetail") {
            return (
              <motion.div
                key={overlayKey(o) + "-" + i}
                className="absolute inset-0 z-20"
              >
                {renderOverlay(o)}
              </motion.div>
            );
          }
          if (o.type === "saveSheet") {
            return (
              <motion.div
                key={overlayKey(o) + "-" + i}
                variants={scrim}
                initial="hidden"
                animate="show"
                exit="exit"
                className="absolute inset-0 z-30 bg-black/35"
                onClick={popOverlay}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  {renderOverlay(o)}
                </div>
              </motion.div>
            );
          }
          const isSheet = o.type === "newCollection";
          return (
            <motion.div
              key={overlayKey(o) + "-" + i}
              variants={scrim}
              initial="hidden"
              animate="show"
              exit="exit"
              className="absolute inset-0 z-20 bg-black/30"
            >
              <motion.div
                variants={variantsFor(o)}
                initial="hidden"
                animate="show"
                exit="exit"
                className={`absolute inset-0 ${isSheet ? "top-2" : ""}`}
              >
                {renderOverlay(o)}
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export type CollectionsProductSurfaceProps = {
  agentId: string;
  pageId: string;
  onNavVisibilityChange?: (visible: boolean) => void;
};

export function CollectionsProductSurface({
  agentId,
  pageId,
  onNavVisibilityChange,
}: CollectionsProductSurfaceProps) {
  const router = useRouter();

  const onNavigateTab = useCallback(
    (t: CollectionsTab) => {
      const map: Record<CollectionsTab, string> = {
        home: "home",
        collections: "collections",
        search: "search",
      };
      router.push(`/app/${encodeURIComponent(agentId)}/${map[t]}`);
    },
    [agentId, router]
  );

  const onOverlayChange = useCallback(
    (top: Overlay | null) => {
      onNavVisibilityChange?.(
        top?.type !== "itemDetail" && top?.type !== "saveSheet"
      );
    },
    [onNavVisibilityChange]
  );

  return (
    <MotionConfig reducedMotion="user">
      <CollectionsStoreProvider
        onNavigateTab={onNavigateTab}
        onOverlayChange={onOverlayChange}
      >
        <CollectionsInner pageId={pageId} />
      </CollectionsStoreProvider>
    </MotionConfig>
  );
}
