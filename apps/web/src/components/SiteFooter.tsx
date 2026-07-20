"use client";

import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto border-t border-border/80 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-display text-sm font-semibold tracking-tight text-foreground/90">OMNIA</p>
        <p className="max-w-md text-sm text-muted">{t("footer.tagline")}</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <Link href="/explore" className="transition-colors hover:text-alive">
            {t("footer.explore")}
          </Link>
          <Link href="/create" className="transition-colors hover:text-alive">
            {t("footer.create")}
          </Link>
          <Link href="/language" className="transition-colors hover:text-alive">
            {t("footer.language")}
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-alive">
            {t("footer.privacy")}
          </Link>
          <Link href="/terms" className="transition-colors hover:text-alive">
            {t("footer.terms")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
