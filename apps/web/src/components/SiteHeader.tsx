"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const AppMenu = dynamic(
  () => import("@/components/AppMenu").then((m) => m.AppMenu),
  {
    ssr: false,
    loading: () => (
      <span
        className="inline-flex min-h-tap min-w-[4.5rem] items-center justify-center rounded-full bg-surface/80"
        aria-hidden
      />
    ),
  }
);

const NAV = [
  { href: "/explore", label: "Discover" },
  { href: "/create", label: "Create" },
  { href: "/yours", label: "Yours" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-alive focus:px-3 focus:py-2 focus:text-on-alive focus:outline-none"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          prefetch
          className="font-display text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-alive"
        >
          OMNIA
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-tap items-center justify-center rounded-full px-4 text-sm font-medium transition-colors ${
                  active
                    ? "bg-alive/12 text-alive"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <AppMenu open={false} onClose={() => {}} />
      </div>
    </header>
  );
}
