/** OM–03 — single session gate helpers (client-only). */

export const TOKEN_KEY = "token";
export const LOGGED_OUT_KEY = "logged_out";
export const RETURN_TO_KEY = "omnia-auth-return-to";
export const SESSION_REASON_KEY = "omnia-session-reason";
export const AUTH_CHANNEL = "omnia-auth";
/** Opt-in: `localStorage.setItem("omnia_auth_debug","1")` → console traces. */
export const AUTH_DEBUG_KEY = "omnia_auth_debug";

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

export function authDebug(...args: unknown[]) {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(AUTH_DEBUG_KEY) !== "1") return;
  } catch {
    return;
  }
  console.info("[omnia-auth]", ...args);
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

type SessionClaims = {
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
};

/** Best-effort JWT payload decode (no signature check — client gate only). */
export function decodeSessionClaims(token?: string | null): SessionClaims | null {
  const raw = (token ?? readSessionToken() ?? "").trim();
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(b64 + pad);
    const payload = JSON.parse(json) as SessionClaims;
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Codes that mean the JWT itself is dead. Bare 401s, auth.missing (header not
 * received), auth.session_unavailable (hydration miss), 403s, and network/5xx
 * must never clear storage.
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
  authDebug("clearSession", reason);
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
 * Clear only when `failedToken` is still the live session token.
 * Prevents an in-flight 401 from an *old* JWT wiping a freshly signed-in session.
 */
export function clearSessionIfCurrentToken(
  failedToken: string | null | undefined,
  reason: "expired" | "logout" = "expired"
): boolean {
  if (typeof window === "undefined") return false;
  const current = readSessionToken();
  const failed = String(failedToken || "").trim();
  if (!failed || !current || failed !== current) {
    authDebug("skip clear — token no longer current", {
      hadCurrent: Boolean(current),
      matched: failed === current,
    });
    return false;
  }
  clearSession(reason);
  return true;
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
  if (localStorage.getItem(TOKEN_KEY) !== value) {
    authDebug("markSessionActive write failed");
    return;
  }
  authDebug("markSessionActive", { claims: decodeSessionClaims(value) });
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

/** True only when the *JWT itself* is a blocked seed identity. */
export function sessionTokenLooksBlocked(token?: string | null): boolean {
  const claims = decodeSessionClaims(token);
  if (!claims) return false;
  return isBlockedSessionIdentity({
    email: claims.email,
    id: claims.sub,
  });
}

/**
 * Tear down the session when `/auth/me` (or similar) returns a seed/demo
 * identity — but ONLY if our JWT also looks blocked.
 *
 * Live bug (pre-fix API): cold instances without Upstash hydration could
 * return `admin@demo.com` for a *real* user's token. Clearing on that response
 * forced sign-in on every navigation. Real JWTs must survive that lie.
 */
export function rejectBlockedSession(account: {
  email?: string | null;
  id?: string | null;
} | null | undefined): boolean {
  if (!isBlockedSessionIdentity(account)) return false;
  if (!sessionTokenLooksBlocked()) {
    authDebug("ignore blocked /auth/me — JWT is not a seed identity", account);
    return false;
  }
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
 * Returns true when the session was cleared (and navigation will happen).
 */
export function redirectToGate(
  returnPath?: string,
  opts?: { failedToken?: string | null }
): boolean {
  if (typeof window === "undefined") return false;
  if (returnPath) setReturnTo(returnPath);
  // If a failedToken was provided, only clear when it is still current.
  if (opts && "failedToken" in (opts || {})) {
    if (!clearSessionIfCurrentToken(opts?.failedToken, "expired")) {
      authDebug("redirectToGate aborted — session still live");
      return false;
    }
  } else {
    clearSession("expired");
  }
  const dest = signInHref({
    returnTo: peekReturnTo() || returnPath,
    reason: "session",
  });
  if (
    window.location.pathname === "/sign-in" &&
    window.location.search.includes("reason=session")
  ) {
    return true;
  }
  window.location.replace(dest);
  return true;
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
