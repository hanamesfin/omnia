"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  hasSession,
  isPublicPath,
  consumeReturnTo,
  postAuthDestination,
  setReturnTo,
} from "@/lib/auth-session";

/**
 * OM–03 — single root gate.
 * Unauthenticated users only see public routes (landing, auth, legal).
 * Authenticated users never linger on the landing / auth forms.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const authed = hasSession();
    const publicRoute = isPublicPath(pathname);
    const search = searchParams?.toString();
    const fullPath = search ? `${pathname}?${search}` : pathname;

    if (!authed && !publicRoute) {
      setReturnTo(fullPath);
      router.replace("/");
      setReady(true);
      return;
    }

    if (authed && pathname === "/") {
      router.replace(consumeReturnTo() || "/explore");
      setReady(true);
      return;
    }

    if (authed && (pathname === "/sign-in" || pathname === "/sign-up")) {
      const dest =
        pathname === "/sign-up" ? "/explore" : postAuthDestination("sign-in");
      router.replace(dest);
      setReady(true);
      return;
    }

    setReady(true);
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
