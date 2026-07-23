export type Artwork = {
  id: string;
  kind: "artwork";
  title: string;
  artist: string;
  imageUrl: string;
  typeTitle: string;
  departmentTitle: string;
  width: number;
  height: number;
};

export type Quote = {
  id: string;
  kind: "quote";
  text: string;
  author: string;
};

export type Publication = {
  id: string;
  kind: "publication";
  title: string;
  pageCount?: number;
  coverUrl: string;
};

export type ContentItem = Artwork | Quote | Publication;

export type CollectionDef = { id: string; name: string };

export type Collection = CollectionDef & {
  itemIds: string[];
};

export type CollectionsTab = "home" | "collections" | "search";

export type Overlay =
  | { type: "collectionDetail"; collectionId: string }
  | { type: "itemDetail"; itemId: string }
  | { type: "saveSheet"; itemId: string }
  | { type: "newCollection"; attachItemId?: string }
  | { type: "newCollectionMade"; collectionId: string };
