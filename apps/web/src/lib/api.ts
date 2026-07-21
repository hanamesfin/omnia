export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/** Default ceiling for most API calls. */
export const API_TIMEOUT_MS = 12000;

/**
 * Match Vercel Hobby function maxDuration (300s). Full Product Factory can still
 * time out on slow free models — API uses a serverless-fast invent path on Vercel.
 */
export const GENERATE_TIMEOUT_MS = 280_000;

type ApiErrorBody = {
  detail?: { error?: { message?: string } } | string;
  error?: { message?: string };
};

function errorMessage(status: number, body: ApiErrorBody): string {
  if (typeof body.detail === "object" && body.detail?.error?.message) {
    return body.detail.error.message;
  }
  if (typeof body.detail === "string") return body.detail;
  if (body.error?.message) return body.error.message;
  return `API Error: ${status}`;
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

/** Ensure a demo JWT exists for local standalone API. */
export async function ensureAuth(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const existing = localStorage.getItem("token");
  if (existing) return existing;
  if (localStorage.getItem("logged_out") === "1") return null;

  try {
    const res = await timedFetch(`${API_BASE}/auth/demo-login`, { method: "POST" }, 2000);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
      return data.access_token as string;
    }
  } catch {
    return null;
  }
  return null;
}

export type FetchApiOptions = RequestInit & { timeoutMs?: number };

export async function fetchApi(endpoint: string, options: FetchApiOptions = {}) {
  const { timeoutMs = API_TIMEOUT_MS, ...init } = options;
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
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      const retryToken = await ensureAuth();
      if (retryToken) {
        try {
          const retry = await timedFetch(`${API_BASE}${endpoint}`, {
            ...init,
            headers: {
              ...headers,
              Authorization: `Bearer ${retryToken}`,
            },
          }, timeoutMs);
          if (retry.ok) return retry.json();
          const retryBody = (await retry.json().catch(() => ({}))) as ApiErrorBody;
          throw new Error(errorMessage(retry.status, retryBody));
        } catch (err) {
          if (err instanceof Error && !err.message.startsWith("API timeout") && !err.message.startsWith("Generation timed out")) throw err;
          throw new Error(
            timeoutMs > API_TIMEOUT_MS
              ? "Generation timed out — free models can take up to a minute. Try again."
              : "API timeout — check the local server"
          );
        }
      }
    }
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
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
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      const retryToken = await ensureAuth();
      if (retryToken) {
        const retry = await timedFetch(
          `${API_BASE}/uploads`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${retryToken}` },
            body: form,
          },
          8000
        );
        if (retry.ok) return retry.json();
        const retryBody = (await retry.json().catch(() => ({}))) as ApiErrorBody;
        throw new Error(errorMessage(retry.status, retryBody));
      }
    }
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
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
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      const retryToken = await ensureAuth();
      if (retryToken) {
        const retry = await timedFetch(
          `${API_BASE}/speech/transcribe`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${retryToken}` },
            body: form,
          },
          30000
        );
        if (retry.ok) return retry.json();
        const retryBody = (await retry.json().catch(() => ({}))) as ApiErrorBody;
        throw new Error(errorMessage(retry.status, retryBody));
      }
    }
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(errorMessage(res.status, body));
  }

  return res.json();
}
