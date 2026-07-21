/** OM–03 — single session gate helpers (client-only). */

export const TOKEN_KEY = "token";
export const LOGGED_OUT_KEY = "logged_out";
export const RETURN_TO_KEY = "omnia-auth-return-to";
export const SESSION_REASON_KEY = "omnia-session-reason";

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
  if (localStorage.getItem(LOGGED_OUT_KEY) === "1") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function hasSession(): boolean {
  return Boolean(readSessionToken());
}

export function clearSession(reason?: "expired" | "logout") {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.setItem(LOGGED_OUT_KEY, "1");
  if (reason === "expired") {
    sessionStorage.setItem(SESSION_REASON_KEY, "expired");
  }
}

export function markSessionActive(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(LOGGED_OUT_KEY);
  sessionStorage.removeItem(SESSION_REASON_KEY);
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

/** After sign-up → Explore. After sign-in → original destination or Yours. */
export function postAuthDestination(mode: "sign-in" | "sign-up"): string {
  if (mode === "sign-up") return "/explore";
  return consumeReturnTo() || "/yours";
}

export function redirectToGate(returnPath?: string) {
  if (typeof window === "undefined") return;
  if (returnPath) setReturnTo(returnPath);
  clearSession("expired");
  const qs = "?reason=session";
  if (window.location.pathname === "/" && window.location.search.includes("reason=session")) {
    return;
  }
  window.location.replace(`/${qs}`);
}
