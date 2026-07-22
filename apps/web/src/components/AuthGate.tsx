"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AUTH_CHANNEL,
  hasSession,
  isPublicPath,
  peekReturnTo,
  consumeReturnTo,
  LOGGED_OUT_KEY,
  setReturnTo,
  signInHref,
  TOKEN_KEY,
} from "@/lib/auth-session";

/**
 * OM–03 — single root gate.
 * Unauthenticated users only see public routes (landing, auth, legal).
 * Authenticated users never linger on the landing / auth forms.
 * Never flash protected UI before the session check finishes.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    redirectingRef.current = false;

    const applyGate = () => {
      if (cancelled) return;

      const authed = hasSession();
      const publicRoute = isPublicPath(pathname);
      const search = searchParams?.toString();
      const fullPath = search ? `${pathname}?${search}` : pathname;

      // Hard rule: a live token means stay in the app. Never soft-redirect to
      // sign-in just because a background request failed or the effect re-ran.
      if (authed) {
        if (pathname === "/") {
          if (!redirectingRef.current) {
            redirectingRef.current = true;
            router.replace(consumeReturnTo() || "/explore");
          }
          setReady(true);
          return;
        }

        if (pathname === "/sign-in" || pathname === "/sign-up") {
          if (!redirectingRef.current) {
            redirectingRef.current = true;
            // Peek only — AuthPage.consumeReturnTo via postAuthDestination owns
            // clearing returnTo after a successful form submit.
            const dest =
              pathname === "/sign-up"
                ? "/explore"
                : peekReturnTo() || "/yours";
            router.replace(dest);
          }
          setReady(true);
          return;
        }

        setReady(true);
        return;
      }

      if (!publicRoute) {
        setReturnTo(fullPath);
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          // Soft gate only — do NOT clear storage or set session-expired reason.
          router.replace(signInHref({ returnTo: fullPath }));
        }
        setReady(true);
        return;
      }

      setReady(true);
    };

    applyGate();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== TOKEN_KEY && event.key !== LOGGED_OUT_KEY && event.key !== null) {
        return;
      }
      applyGate();
    };

    const onPageShow = () => {
      // bfcache / history restore — re-check only when session is gone.
      // Pathname changes alone never clear storage.
      if (!hasSession()) applyGate();
    };

    // Visibility: only re-gate when the session is gone (another tab logged out).
    // Do NOT re-run soft redirects on every tab focus — that consumed returnTo
    // and bounced healthy signed-in users.
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !hasSession()) applyGate();
    };

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
        // Own-tab markSessionActive: AuthPage owns navigation — don't race it.
        if (event.data?.type === "session-active") {
          if (pathname === "/sign-in" || pathname === "/sign-up") {
            setReady(true);
            return;
          }
          // Already signed in on a protected route — keep the app up.
          if (hasSession()) {
            setReady(true);
            return;
          }
        }
        // session-cleared from another tab / explicit logout — re-check.
        applyGate();
      };
    } catch {
      channel = null;
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      channel?.close();
    };
  }, [pathname, router, searchParams]);

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-field" aria-busy="true">
        <span className="sr-only">Checking session</span>
        <span
          className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground"
          aria-hidden
        />
      </div>
    );
  }

  // Block flash of protected content while redirecting
  if (!hasSession() && !isPublicPath(pathname)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-field" aria-busy="true">
        <span className="sr-only">Redirecting to sign in</span>
      </div>
    );
  }

  return <>{children}</>;
}
