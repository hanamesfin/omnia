"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { API_BASE } from "@/lib/api";
import {
  logoutAndRedirect,
  readSessionToken,
  redirectToGate,
  rejectBlockedSession,
} from "@/lib/auth-session";

type Account = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  org_id: string;
  auth_provider?: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = readSessionToken();
    if (!token) {
      router.replace("/sign-in?returnTo=%2Faccount");
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Your session ended — log back in to continue.");
        return response.json() as Promise<Account>;
      })
      .then((data) => {
        if (rejectBlockedSession(data)) {
          throw new Error("Demo accounts cannot sign in — use a real account.");
        }
        setAccount(data);
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : "Could not load your account.");
        redirectToGate("/account");
      });
  }, [router]);

  const logOut = () => {
    logoutAndRedirect();
  };

  if (!account) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <p className="text-sm text-muted">{error || "Loading your account…"}</p>
      </div>
    );
  }

  const initials = account.display_name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-alive">Account</p>
      <h1 className="mt-2 font-display text-display-lg">Your profile</h1>
      <p className="mt-3 text-muted">Manage your OMNIA session and account information.</p>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-soft">
        <div className="flex items-center gap-4 border-b border-border p-5 sm:p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-alive text-lg font-bold text-on-alive">
            {initials || <UserRound size={24} />}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-semibold">{account.display_name}</h2>
            <p className="truncate text-sm text-muted">{account.email}</p>
          </div>
        </div>

        <dl className="divide-y divide-border px-5 text-sm sm:px-6">
          <div className="flex justify-between gap-4 py-4">
            <dt className="text-muted">Email</dt>
            <dd className="truncate font-medium">{account.email}</dd>
          </div>
          <div className="flex justify-between gap-4 py-4">
            <dt className="text-muted">Signed in with</dt>
            <dd className="font-medium capitalize">{account.auth_provider || "OMNIA"}</dd>
          </div>
          <div className="flex justify-between gap-4 py-4">
            <dt className="text-muted">Role</dt>
            <dd className="font-medium capitalize">{account.role}</dd>
          </div>
        </dl>
      </section>

      <button
        type="button"
        onClick={logOut}
        className="mt-6 inline-flex min-h-tap items-center justify-center gap-2 rounded-full border border-danger/35 bg-surface px-5 text-sm font-semibold text-danger transition hover:bg-danger/10"
      >
        <LogOut size={17} />
        Log out
      </button>
    </div>
  );
}
