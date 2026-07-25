"use client";

/**
 * AgentIsolatedShell.tsx
 *
 * Full-screen, single-agent workspace. When an agent is opened, this shell
 * takes over the entire viewport. No OMNIA sidebar, no other agents, no
 * competing chrome — just this agent and a minimal exit path.
 *
 * Visual identity comes from the agent's resolved kind theme (+ any
 * creator-defined design_system overrides).
 */

import { useEffect, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { AgentKind } from "@/lib/agent-kinds";
import {
  resolveAgentKindTheme,
  kindThemeCssVars,
} from "@/lib/agent-kind-themes";
import type { DesignSystem } from "@/components/DesignTokenProvider";

type Props = {
  /** Agent kind — drives the base visual identity. */
  kind: AgentKind;
  /** Agent's own design_system (from creator). Merged on top of kind palette. */
  agentDesignSystem?: DesignSystem | null;
  /** Agent display name — used for the page title. */
  agentName: string;
  /** Back navigation target. Defaults to /yours. */
  backHref?: string;
  /** Back link label shown next to the ← icon. */
  backLabel?: string;
  children: ReactNode;
};

export function AgentIsolatedShell({
  kind,
  agentDesignSystem,
  agentName,
  backHref = "/yours",
  backLabel = "Yours",
  children,
}: Props) {
  const ds = resolveAgentKindTheme(kind, agentDesignSystem);
  const cssVars = kindThemeCssVars(ds);
  const personality = ds.personality || kind;

  /* Force page title to agent name while mounted. */
  useEffect(() => {
    const prev = document.title;
    document.title = agentName;
    return () => {
      document.title = prev;
    };
  }, [agentName]);

  return (
    <div
      className="agent-isolated-shell"
      data-agent-kind={kind}
      data-personality={personality}
      style={cssVars as CSSProperties}
    >
      {/* ── Minimal exit chrome — top-left, floating ── */}
      <div className="agent-isolated-exit">
        <Link
          href={backHref}
          aria-label={`Back to ${backLabel}`}
          className="agent-isolated-back-btn"
        >
          <ArrowLeft size={15} strokeWidth={2} aria-hidden />
          <span>{backLabel}</span>
        </Link>
      </div>

      {/* ── Agent content fills the rest ── */}
      <div className="agent-isolated-body">{children}</div>
    </div>
  );
}

/**
 * Lightweight font preloader — inserts a <link> for the kind's Google Fonts
 * so they render immediately. Safe to call multiple times (deduped by href).
 */
export function preloadKindFonts(kind: AgentKind): void {
  if (typeof document === "undefined") return;

  const fontFamilies: Record<AgentKind, string[]> = {
    chat: ["Lora:ital,wght@0,400;0,600;1,400", "Inter:wght@400;500;600"],
    tool: ["IBM+Plex+Mono:wght@400;500", "IBM+Plex+Sans:wght@400;500;600"],
    transformer: [
      "Playfair+Display:ital,wght@0,400;0,700;1,400",
      "DM+Sans:wght@400;500;600",
    ],
    analyzer: [
      "Source+Serif+4:ital,wght@0,400;0,600;1,400",
      "Nunito+Sans:wght@400;600",
    ],
    automation: ["Barlow:wght@400;500;600;700", "Roboto+Mono:wght@400;500"],
  };

  const families = fontFamilies[kind] || fontFamilies.tool;
  const href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;

  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}
