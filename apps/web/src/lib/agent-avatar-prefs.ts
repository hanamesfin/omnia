/** Per-agent avatar presentation — local preference overlay on logo data. */

export type AgentAvatarStyleId = "illustrated" | "orb" | "monogram" | "upload";

export type AgentAvatarPref = {
  style: AgentAvatarStyleId;
  /** data: URL from user upload (capped client-side) */
  uploadDataUrl?: string;
};

export const AGENT_AVATAR_STORAGE_KEY = "omnia-agent-avatars";

export const AVATAR_STYLE_OPTIONS: {
  id: AgentAvatarStyleId;
  label: string;
  hint: string;
}[] = [
  { id: "illustrated", label: "Illustrated", hint: "Motif on soft gradient" },
  { id: "orb", label: "Gradient orb", hint: "Abstract color only" },
  { id: "monogram", label: "Monogram", hint: "Initials on gradient" },
  { id: "upload", label: "Upload", hint: "Your image for this agent" },
];

const STYLE_IDS: AgentAvatarStyleId[] = ["illustrated", "orb", "monogram", "upload"];

export function isAgentAvatarStyleId(v: string): v is AgentAvatarStyleId {
  return STYLE_IDS.includes(v as AgentAvatarStyleId);
}

function readAll(): Record<string, AgentAvatarPref> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(AGENT_AVATAR_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<AgentAvatarPref>>;
    const out: Record<string, AgentAvatarPref> = {};
    for (const [id, pref] of Object.entries(parsed)) {
      if (!pref || !isAgentAvatarStyleId(pref.style || "")) continue;
      out[id] = {
        style: pref.style!,
        uploadDataUrl: typeof pref.uploadDataUrl === "string" ? pref.uploadDataUrl : undefined,
      };
    }
    return out;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, AgentAvatarPref>) {
  try {
    localStorage.setItem(AGENT_AVATAR_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

const DEFAULT_AVATAR_PREF: AgentAvatarPref = { style: "illustrated" };

export function readAgentAvatarPref(agentId: string): AgentAvatarPref {
  return readAll()[agentId] || DEFAULT_AVATAR_PREF;
}

export function writeAgentAvatarPref(agentId: string, pref: AgentAvatarPref) {
  const map = readAll();
  map[agentId] = pref;
  writeAll(map);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("omnia-agent-avatar", { detail: { agentId } }));
  }
}

/** Compress image to a modest data URL for localStorage (~agent avatar). */
export function fileToAvatarDataUrl(file: File, maxEdge = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function monogramFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
