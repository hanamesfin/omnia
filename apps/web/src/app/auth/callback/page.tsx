"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { markSessionActive, postAuthDestination } from "@/lib/auth-session";

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");
    if (error) {
      setMessage("Sign-in failed. Redirecting…");
      const timer = setTimeout(
        () => router.replace(`/sign-in?error=${encodeURIComponent(error)}`),
        600
      );
      return () => clearTimeout(timer);
    }
    if (token) {
      markSessionActive(token);
      // OAuth returns to intended destination, else Yours (same as email sign-in)
      router.replace(postAuthDestination("sign-in"));
      return;
    }
    setMessage("No session returned. Redirecting…");
    const timer = setTimeout(() => router.replace("/sign-in?error=missing_token"), 600);
    return () => clearTimeout(timer);
  }, [params, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-field text-ink">
      <div className="flex flex-col items-center gap-3">
        <span
          className="h-6 w-6 animate-spin rounded-full border-2 border-ink/20 border-t-ink"
          aria-hidden
        />
        <p className="text-sm text-ink/70">{message}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-field" />}>
      <AuthCallbackInner />
    </Suspense>
  );
}
