import type { Artwork } from "./types";

const API = "https://api.artic.edu/api/v1/artworks";
const FIELDS =
  "id,title,artist_title,image_id,artwork_type_title,department_title,thumbnail";
const CACHE_KEY = "trove-aic-v1";

export function iiifUrl(imageId: string, width = 843) {
  return `https://www.artic.edu/iiif/2/${imageId}/full/${width},/0/default.jpg`;
}

/** Curated AIC IDs (all typically have images) spanning paintings, sculpture, photos, drawings. */
export const ARTWORK_IDS: string[] = [
  "28560", "27992", "111628", "20684", "64818", "16568", "80607", "111436",
  "20567", "14598", "151358", "16488", "59787", "16767", "81512", "100829",
  "21023", "109275", "117266", "8624", "4788", "4884", "61603", "14655",
  "11723", "9512", "100472", "70202", "105203", "31694", "144272", "229351",
  "129884", "20810", "18757", "65818", "63554", "56905", "8961", "186047",
  "184372", "146701", "5357", "111060", "151424", "23972", "144985", "75644",
  "109819", "120154", "49702", "76571", "152223", "189595", "44742", "9211",
  "118746", "143904", "190726", "144938", "180666", "65924", "188538", "157007",
  "133553", "147516", "50149", "104031", "126256", "232193", "191406", "53001",
  "160222", "186387", "20356", "23700", "118661", "44856", "186386", "11320",
  "151352", "90304", "100935", "16231", "151375", "131385", "157003", "10982",
];

type ApiItem = {
  id: number;
  title: string | null;
  artist_title: string | null;
  image_id: string | null;
  artwork_type_title: string | null;
  department_title: string | null;
  thumbnail: { width: number; height: number } | null;
};

function normalize(item: ApiItem): Artwork | null {
  if (!item.image_id) return null;
  const w = item.thumbnail?.width || 800;
  const h = item.thumbnail?.height || 1000;
  return {
    id: String(item.id),
    kind: "artwork",
    title: item.title || "Untitled",
    artist: item.artist_title || "Unknown artist",
    imageUrl: iiifUrl(item.image_id),
    typeTitle: item.artwork_type_title || "Artwork",
    departmentTitle: item.department_title || "",
    width: w,
    height: h,
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`status ${res.status}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 400 * Math.pow(3, i)));
    }
  }
  throw lastErr;
}

function readCache(): Artwork[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Artwork[];
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(items: Artwork[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

/** Fallback artworks when AIC is unreachable (still render a usable product). */
function fallbackArtworks(): Artwork[] {
  const hues = [28, 210, 340, 160, 45, 260];
  return ARTWORK_IDS.slice(0, 24).map((id, i) => {
    const h = hues[i % hues.length];
    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${1000 + (i % 5) * 80}"><rect fill="hsl(${h} 28% 72%)" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" fill="rgba(0,0,0,0.35)" font-family="Georgia,serif" font-size="42">Study ${i + 1}</text></svg>`
    );
    return {
      id: `local-${id}`,
      kind: "artwork" as const,
      title: `Study ${i + 1}`,
      artist: "Trove Archive",
      imageUrl: `data:image/svg+xml,${svg}`,
      typeTitle: "Artwork",
      departmentTitle: "",
      width: 800,
      height: 1000 + (i % 5) * 80,
    };
  });
}

export async function fetchArtworks(): Promise<Artwork[]> {
  if (typeof window !== "undefined") {
    const cached = readCache();
    if (cached) return cached;
  }

  const batches = chunk(ARTWORK_IDS, 40);
  const results: Artwork[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < batches.length) {
      const myBatch = batches[cursor++];
      const url = `${API}?ids=${myBatch.join(",")}&fields=${FIELDS}&limit=100`;
      try {
        const res = await fetchWithRetry(url);
        const json = (await res.json()) as { data: ApiItem[] };
        for (const it of json.data || []) {
          const n = normalize(it);
          if (n) results.push(n);
        }
      } catch {
        /* skip failed batch */
      }
    }
  }

  try {
    await Promise.all([worker(), worker()]);
  } catch {
    return fallbackArtworks();
  }

  const byId = new Map(results.map((a) => [a.id, a]));
  const ordered = ARTWORK_IDS.map((id) => byId.get(id)).filter(
    (a): a is Artwork => Boolean(a)
  );

  if (ordered.length) {
    if (typeof window !== "undefined") writeCache(ordered);
    return ordered;
  }
  return fallbackArtworks();
}
