"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { useTheme } from "@/components/ThemeProvider";
import {
  consumeSessionReason,
  markSessionActive,
  postAuthDestination,
  setReturnTo,
} from "@/lib/auth-session";

type Mode = "sign-in" | "sign-up";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.86A6.02 6.02 0 0 1 6.08 12c0-.65.11-1.28.32-1.86V7.52H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.48l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 6.01c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.95 5.52l3.35 2.62C7.19 7.77 9.4 6.01 12 6.01Z" />
    </svg>
  );
}

export function AuthPage({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [googleReady, setGoogleReady] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignUp = mode === "sign-up";
  const isLight = theme === "light" || theme === "frost";

  useEffect(() => {
    fetch(`${API_BASE}/auth/providers`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        setGoogleReady(Boolean(data.google));
      })
      .catch(() => setGoogleReady(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo");
    if (returnTo) setReturnTo(returnTo);

    const reason = params.get("reason") || consumeSessionReason();
    if (reason === "session" || reason === "expired") {
      setError("Your session ended — log back in to continue.");
    }

    const oauthError = params.get("error");
    if (oauthError) {
      setError(oauthError === "missing_token" ? "Sign-in did not complete. Please try again." : oauthError);
    }

    if (oauthError || reason === "session" || reason === "expired") {
      params.delete("error");
      params.delete("reason");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let response: Response;
      if (isSignUp) {
        response = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: displayName,
            email,
            password,
          }),
        });
      } else {
        const body = new URLSearchParams();
        body.set("username", email);
        body.set("password", password);
        response = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const serverMsg =
          data?.detail?.error?.message ||
          data?.error?.message ||
          (typeof data?.detail === "string" ? data.detail : null);
        if (!isSignUp && (response.status === 401 || /password|credential|invalid/i.test(String(serverMsg || "")))) {
          throw new Error("That password doesn't match.");
        }
        throw new Error(
          serverMsg || (isSignUp ? "Could not create your account." : "That password doesn't match.")
        );
      }
      if (!data.access_token) throw new Error("The server did not return a session.");
      markSessionActive(data.access_token as string);
      router.replace(postAuthDestination(isSignUp ? "sign-up" : "sign-in"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const continueWithGoogle = () => {
    if (!googleReady) {
      setError("Google sign-in needs OAuth credentials in the API configuration.");
      return;
    }
    window.location.href = `${API_BASE}/auth/oauth/google/start`;
  };

  return (
    <div className="relative min-h-full overflow-hidden bg-field text-foreground">
      <div className="pointer-events-none absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-alive/15 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-56 -right-32 h-[38rem] w-[38rem] rounded-full bg-accent/20 blur-[120px]" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          OMNIA
        </Link>
        <button
          type="button"
          onClick={() => setTheme(isLight ? "midnight" : "light")}
          className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-full border border-border bg-surface/70 text-muted backdrop-blur-xl transition hover:text-foreground"
          aria-label={isLight ? "Use dark theme" : "Use light theme"}
        >
          {isLight ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-5.25rem)] max-w-7xl items-center gap-10 px-5 pb-12 sm:px-8 xl:grid-cols-[minmax(0,1fr)_30rem] xl:gap-16">
        <section className="hidden min-w-0 max-w-2xl xl:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-alive/20 bg-alive/10 px-3 py-1.5 text-xs font-semibold text-alive">
            <Sparkles size={14} />
            Intelligence, shaped around you
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.04] tracking-[-0.04em] xl:text-6xl">
            Build AI that works
            <span className="block text-alive">the way you do.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Create capable agents, connect knowledge, and turn ideas into focused products—all
            inside one adaptive workspace.
          </p>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              ["01", "Design"],
              ["02", "Personalize"],
              ["03", "Deploy"],
            ].map(([number, label]) => (
              <div
                key={number}
                className="rounded-2xl border border-border bg-surface/55 p-4 backdrop-blur-xl"
              >
                <p className="font-mono text-[10px] text-alive">{number}</p>
                <p className="mt-6 text-sm font-semibold">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 flex items-center gap-2 text-xs text-muted">
            <ShieldCheck size={15} className="text-alive" />
            Your workspace, agents, and credentials remain private.
          </p>
        </section>

        <section className="mx-auto w-full max-w-[30rem]">
          <div className="rounded-[2rem] border border-border bg-surface/85 p-5 shadow-float backdrop-blur-2xl sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-alive">
                {isSignUp ? "Start building" : "Welcome back"}
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                {isSignUp ? "Create your account" : "Sign in to OMNIA"}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {isSignUp
                  ? "One account for your agents, knowledge, and workflows."
                  : "Continue where you left off."}
              </p>
            </div>

            <button
              type="button"
              onClick={continueWithGoogle}
              className="relative inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-xl border border-border bg-canvas text-sm font-semibold transition hover:border-alive/35 hover:bg-navSelected"
              aria-label="Continue with Google"
              title={googleReady ? "Continue with Google" : "Google OAuth setup required"}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
              {!googleReady && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-warning" />
              )}
            </button>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                or use email
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              {isSignUp && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted">Name</span>
                  <input
                    required
                    minLength={2}
                    autoComplete="name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Your name"
                    className="min-h-tap w-full rounded-xl border border-border bg-canvas px-4 text-sm outline-none transition placeholder:text-muted/70 focus:border-alive/50 focus:ring-4 focus:ring-alive/10"
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted">Email</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="min-h-tap w-full rounded-xl border border-border bg-canvas px-4 text-sm outline-none transition placeholder:text-muted/70 focus:border-alive/50 focus:ring-4 focus:ring-alive/10"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-muted">
                  Password
                  {!isSignUp && (
                    <span className="font-normal text-muted/80">At least 8 characters</span>
                  )}
                </span>
                <span className="relative block">
                  <input
                    required
                    minLength={8}
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="min-h-tap w-full rounded-xl border border-border bg-canvas px-4 pr-12 text-sm outline-none transition placeholder:text-muted/70 focus:border-alive/50 focus:ring-4 focus:ring-alive/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              {isSignUp && (
                <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                  <Check size={14} className="mt-0.5 shrink-0 text-alive" />
                  By continuing, you agree to OMNIA&apos;s Terms and Privacy Policy.
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-xl bg-alive px-5 text-sm font-semibold text-on-alive shadow-soft transition hover:brightness-105 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <>
                    {isSignUp ? "Create account" : "Sign in"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              {isSignUp ? "Already have an account?" : "New to OMNIA?"}{" "}
              <Link
                href={isSignUp ? "/sign-in" : "/sign-up"}
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {isSignUp ? "Sign in" : "Create an account"}
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
