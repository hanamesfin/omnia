/** OM–03 — single session gate helpers (client-only). */

export const TOKEN_KEY = "token";
export const LOGGED_OUT_KEY = "logged_out";
export const RETURN_TO_KEY = "omnia-auth-return-to";
export const SESSION_REASON_KEY = "omnia-session-reason";
export const AUTH_CHANNEL = "omnia-auth";

/** Routes reachable without a session. Everything else requires auth. */
const PUBLIC_EXACT = new Set([
  "/",
  "/sign-in",
  "/sign-up",
  "/auth/callback",
  "/privacy",
  "/terms",
]);

export function isPublicPath(pathname: string): boolean {
  if (!pathname) return false;
  if (PUBLIC_EXACT.has(pathname)) return true;
  // Static / metadata routes never need the gate chrome
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  return false;
}

export function readSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  // Sticky logout latch wins — but only when explicitly set by clearSession.
  if (localStorage.getItem(LOGGED_OUT_KEY) === "1") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  return token && token.trim() ? token : null;
}

export function hasSession(): boolean {
  return Boolean(readSessionToken());
}

/**
 * Codes that mean the JWT itself is dead. Bare 401s, auth.missing (header not
 * received), 403 permission denials, and network/5xx must never clear storage.
 */
export const SESSION_DEAD_CODES = new Set([
  "auth.invalid_token",
  "auth.demo_disallowed",
]);

export function isDefinitiveSessionDeath(code: string | null | undefined): boolean {
  if (!code) return false;
  return SESSION_DEAD_CODES.has(code);
}

/** Drop local chat / avatar caches tied to the signed-in workspace. */
function clearUserCaches() {
  if (typeof window === "undefined") return;
  const doomed: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith("omnia:chat-history:") || key === "omnia-agent-avatars") {
      doomed.push(key);
    }
  }
  for (const key of doomed) localStorage.removeItem(key);
}

function broadcastAuth(message: { type: string; reason?: string }) {
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    /* BroadcastChannel unsupported — storage events still cover other tabs */
  }
}

function broadcastSessionCleared(reason?: "expired" | "logout") {
  broadcastAuth({ type: "session-cleared", reason: reason || "logout" });
}

/**
 * Tear down the client session.
 * Always sets `logged_out` so Back / bfcache cannot revive a prior JWT.
 */
export function clearSession(reason?: "expired" | "logout") {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.setItem(LOGGED_OUT_KEY, "1");

  if (reason === "expired") {
    sessionStorage.setItem(SESSION_REASON_KEY, "expired");
  } else if (reason === "logout") {
    sessionStorage.removeItem(SESSION_REASON_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    clearUserCaches();
  }

  broadcastSessionCleared(reason);
}

/**
 * Persist a fresh JWT and clear the sticky logged-out latch.
 * Order matters: drop `logged_out` before/with the token so `readSessionToken`
 * cannot return null right after a successful sign-in.
 * Pathname changes alone must never clear this — only clearSession / logout.
 */
export function markSessionActive(token: string) {
  if (typeof window === "undefined") return;
  const value = String(token || "").trim();
  if (!value) return;
  localStorage.removeItem(LOGGED_OUT_KEY);
  localStorage.setItem(TOKEN_KEY, value);
  sessionStorage.removeItem(SESSION_REASON_KEY);
  // Verify write stuck (private mode / quota failures must not look "signed in").
  if (localStorage.getItem(TOKEN_KEY) !== value) return;
  broadcastAuth({ type: "session-active" });
}

/** Seed catalog identities must never appear as the signed-in profile. */
const BLOCKED_SESSION_EMAILS = new Set(["admin@demo.com", "viewer@demo.com"]);
const BLOCKED_SESSION_IDS = new Set(["user-demo-admin", "user-demo-viewer"]);

export function isBlockedSessionIdentity(account: {
  email?: string | null;
  id?: string | null;
} | null | undefined): boolean {
  if (!account) return false;
  const email = String(account.email || "").trim().toLowerCase();
  const id = String(account.id || "").trim();
  return BLOCKED_SESSION_EMAILS.has(email) || BLOCKED_SESSION_IDS.has(id);
}

export function rejectBlockedSession(account: {
  email?: string | null;
  id?: string | null;
} | null | undefined): boolean {
  if (!isBlockedSessionIdentity(account)) return false;
  clearSession("expired");
  return true;
}

export function setReturnTo(path: string) {
  if (typeof window === "undefined") return;
  if (!path || path === "/" || isPublicPath(path.split("?")[0] || path)) return;
  sessionStorage.setItem(RETURN_TO_KEY, path);
}

export function peekReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(RETURN_TO_KEY);
}

export function consumeReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(RETURN_TO_KEY);
  sessionStorage.removeItem(RETURN_TO_KEY);
  return value;
}

export function consumeSessionReason(): string | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(SESSION_REASON_KEY);
  sessionStorage.removeItem(SESSION_REASON_KEY);
  return value;
}

/** Build `/sign-in` with optional returnTo + session-expired reason. */
export function signInHref(opts?: {
  returnTo?: string | null;
  reason?: "session" | null;
}): string {
  const params = new URLSearchParams();
  if (opts?.reason === "session") params.set("reason", "session");
  const returnTo = opts?.returnTo?.trim();
  if (returnTo) {
    const pathOnly = returnTo.split("?")[0] || returnTo;
    if (pathOnly && pathOnly !== "/" && !isPublicPath(pathOnly)) {
      params.set("returnTo", returnTo);
    }
  }
  const qs = params.toString();
  return qs ? `/sign-in?${qs}` : "/sign-in";
}

/** After sign-up → Explore. After sign-in → original destination or Yours. */
export function postAuthDestination(mode: "sign-in" | "sign-up"): string {
  if (mode === "sign-up") return "/explore";
  return consumeReturnTo() || "/yours";
}

/**
 * Session expired / forced sign-out — clear JWT and hard-navigate to sign-in.
 * Uses location.replace so Back cannot revive protected pages from bfcache.
 */
export function redirectToGate(returnPath?: string) {
  if (typeof window === "undefined") return;
  if (returnPath) setReturnTo(returnPath);
  clearSession("expired");
  const dest = signInHref({
    returnTo: peekReturnTo() || returnPath,
    reason: "session",
  });
  if (
    window.location.pathname === "/sign-in" &&
    window.location.search.includes("reason=session")
  ) {
    return;
  }
  window.location.replace(dest);
}

/**
 * Voluntary logout — full clear + hard redirect to `/sign-in`.
 * Prefer this over soft router.replace so history/bfcache cannot restore protected UI.
 */
export function logoutAndRedirect() {
  if (typeof window === "undefined") return;
  clearSession("logout");
  window.location.replace("/sign-in");
}
