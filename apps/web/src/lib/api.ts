import { readSessionToken, redirectToGate } from "@/lib/auth-session";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/** Default ceiling for most API calls. */
export const API_TIMEOUT_MS = 12000;

/**
 * Match Vercel Hobby function maxDuration (300s). Full Product Factory can still
 * time out on slow free models — API uses a serverless-fast invent path on Vercel.
 */
export const GENERATE_TIMEOUT_MS = 280_000;

type ApiErrorBody = {
  detail?: { error?: { message?: string; code?: string } } | string;
  error?: { message?: string; code?: string };
};

function errorMessage(status: number, body: ApiErrorBody): string {
  if (typeof body.detail === "object" && body.detail?.error?.message) {
    return body.detail.error.message;
  }
  if (typeof body.detail === "string") return body.detail;
  if (body.error?.message) return body.error.message;
  return `API Error: ${status}`;
}

function authErrorCode(body: ApiErrorBody): string | null {
  if (typeof body.detail === "object" && body.detail?.error?.code) {
    return body.detail.error.code;
  }
  if (body.error?.code) return body.error.code;
  return null;
}

function withTimeout(ms: number, external?: AbortSignal | null): AbortSignal {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  if (external) {
    if (external.aborted) {
      clearTimeout(timer);
      ctrl.abort();
    } else {
      external.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          ctrl.abort();
        },
        { once: true }
      );
    }
  }
  (ctrl.signal as AbortSignal & { __clear?: () => void }).__clear = () => clearTimeout(timer);
  return ctrl.signal;
}

async function timedFetch(input: string, init: RequestInit = {}, timeoutMs = API_TIMEOUT_MS) {
  const signal = withTimeout(timeoutMs, init.signal ?? undefined);
  try {
    return await fetch(input, { ...init, signal });
  } finally {
    (signal as AbortSignal & { __clear?: () => void }).__clear?.();
  }
}

/**
 * Return the current session JWT only. There is no demo/guest account — users
 * must sign up or sign in with a real account (OM–03).
 */
export async function ensureAuth(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return readSessionToken();
}

let signOutInFlight = false;

/** Auth error codes that mean the local JWT must be discarded. */
const SESSION_DEAD_CODES = new Set([
  "auth.missing",
  "auth.invalid_token",
  "auth.demo_disallowed",
]);

/**
 * A definitive session-death 401 means the JWT is gone/invalid. Only tear it
 * down when we actually had a token, and never fire twice for parallel calls.
 * Catalog/enrichment calls must pass `silentAuth` so a flaky models/marketplace
 * response cannot bounce a healthy signed-in user to /sign-in.
 */
function handleUnauthorized() {
  if (typeof window === "undefined") return;
  if (!readSessionToken()) return; // nothing to sign out of — let the gate decide
  if (signOutInFlight) return;
  signOutInFlight = true;
  const path = `${window.location.pathname}${window.location.search || ""}`;
  // redirectToGate clears the session — do not clear twice beforehand
  redirectToGate(path);
}

function shouldForceReauth(
  status: number,
  body: ApiErrorBody,
  silentAuth: boolean
): boolean {
  if (silentAuth) return false;
  if (typeof window === "undefined") return false;
  if (status === 403) {
    // Role-denied while signed in stays an error; only force re-auth if we
    // somehow have no usable token left.
    return !readSessionToken();
  }
  if (status !== 401) return false;
  if (!readSessionToken()) return false;
  const code = authErrorCode(body);
  // Credential-form failures must never clear a live session.
  if (code === "auth.bad_credentials" || code === "auth.email_exists") {
    return false;
  }
  if (code && !SESSION_DEAD_CODES.has(code) && !code.startsWith("auth.")) {
    return false;
  }
  return true;
}

export type FetchApiOptions = RequestInit & {
  timeoutMs?: number;
  /**
   * Background/enrichment call — a 401 should surface as an error but must NOT
   * sign the user out (e.g. models catalog, marketplace shelf, similar agents).
   */
  silentAuth?: boolean;
};

export async function fetchApi(endpoint: string, options: FetchApiOptions = {}) {
  const { timeoutMs = API_TIMEOUT_MS, silentAuth = false, ...init } = options;
  const token = await ensureAuth();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  let res: Response;
  try {
    res = await timedFetch(`${API_BASE}${endpoint}`, {
      ...init,
      headers,
    }, timeoutMs);
  } catch {
    throw new Error(
      timeoutMs > API_TIMEOUT_MS
        ? "Generation timed out — Product Factory can take a few minutes. Try again or pick a faster model."
        : "API timeout — check the local server"
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    if (
      (res.status === 401 || res.status === 403) &&
      shouldForceReauth(res.status, body, silentAuth)
    ) {
      handleUnauthorized();
      throw new Error("Your session ended — log back in to continue.");
    }
    throw new Error(errorMessage(res.status, body));
  }

  return res.json();
}

export type UploadedAttachment = {
  id: string;
  filename: string;
  content_type: string;
  media: "text" | "table" | "image" | "pdf" | "binary" | string;
  size_bytes: number;
  preview?: string;
  created_at?: string;
};

/** Multipart file upload — do not set Content-Type (browser sets boundary). */
export async function uploadFile(file: File): Promise<UploadedAttachment> {
  const token = await ensureAuth();
  const form = new FormData();
  form.append("file", file, file.name);

  let res: Response;
  try {
    res = await timedFetch(
      `${API_BASE}/uploads`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      },
      8000
    );
  } catch {
    throw new Error("Upload timed out");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    if (shouldForceReauth(res.status, body, false)) {
      handleUnauthorized();
      throw new Error("Your session ended — log back in to continue.");
    }
    throw new Error(errorMessage(res.status, body));
  }

  return res.json();
}

/** Speech-to-text via API (Whisper when a real OpenAI key is configured). */
export async function transcribeAudio(
  file: File,
  language?: string
): Promise<{ text: string; demo?: boolean }> {
  const token = await ensureAuth();
  const form = new FormData();
  form.append("file", file, file.name);
  if (language) form.append("language", language);

  let res: Response;
  try {
    res = await timedFetch(
      `${API_BASE}/speech/transcribe`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      },
      30000
    );
  } catch {
    throw new Error("Transcription timed out — try a shorter clip");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    if (shouldForceReauth(res.status, body, false)) {
      handleUnauthorized();
      throw new Error("Your session ended — log back in to continue.");
    }
    throw new Error(errorMessage(res.status, body));
  }

  return res.json();
}
