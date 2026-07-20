import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center px-4 py-20 sm:px-6">
      <p className="font-mono text-sm text-alive">404</p>
      <h1 className="mt-3 font-display text-display-lg text-foreground">This page isn&apos;t on the network</h1>
      <p className="mt-3 text-muted">The link may be outdated, or the agent was never published.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/explore"
          className="inline-flex min-h-tap items-center rounded-xl bg-alive px-5 text-sm font-semibold text-on-alive"
        >
          Back to Discover
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-tap items-center rounded-xl border border-border bg-surface px-5 text-sm font-medium"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
