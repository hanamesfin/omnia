"use client";

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from "react";

export type DesignTokens = {
  colors?: Record<string, string>;
  typography?: Record<string, string>;
  space?: Record<string, string>;
  radius?: Record<string, string> | string;
  motion?: Record<string, string>;
};

export type DesignSystem = {
  personality?: string;
  tokens?: DesignTokens;
};

type Ctx = {
  personality: string;
  tokens: DesignTokens;
};

const DesignTokenContext = createContext<Ctx>({
  personality: "",
  tokens: {},
});

export function useDesignTokens() {
  return useContext(DesignTokenContext);
}

function cssVars(tokens: DesignTokens): CSSProperties {
  const vars: Record<string, string> = {};
  const colors = tokens.colors || {};
  for (const [k, v] of Object.entries(colors)) {
    if (v) vars[`--pf-${k.replace(/_/g, "-")}`] = String(v);
  }
  const typo = tokens.typography || {};
  const display =
    typo.font_display || typo.display || typo.family || typo.font_sans || typo.sans || "";
  const body = typo.font_sans || typo.sans || typo.body || display;
  if (display) vars["--pf-font-display"] = String(display);
  if (body) vars["--pf-font-body"] = String(body);

  const space = tokens.space || {};
  for (const [k, v] of Object.entries(space)) {
    if (v) vars[`--pf-space-${k.replace(/_/g, "-")}`] = String(v);
  }

  const radius = tokens.radius;
  if (typeof radius === "string" && radius) {
    vars["--pf-radius"] = radius;
  } else if (radius && typeof radius === "object") {
    for (const [k, v] of Object.entries(radius)) {
      if (v) vars[`--pf-radius-${k.replace(/_/g, "-")}`] = String(v);
    }
  }

  const motion = tokens.motion || {};
  for (const [k, v] of Object.entries(motion)) {
    if (v) vars[`--pf-motion-${k.replace(/_/g, "-")}`] = String(v);
  }

  // Map common aliases used by ProductShell
  if (colors.bg || colors.background) {
    vars["--pf-bg"] = String(colors.bg || colors.background);
  }
  if (colors.surface) vars["--pf-surface"] = String(colors.surface);
  if (colors.fg || colors.foreground || colors.text) {
    vars["--pf-fg"] = String(colors.fg || colors.foreground || colors.text);
  }
  if (colors.muted || colors.muted_fg) {
    vars["--pf-muted"] = String(colors.muted || colors.muted_fg);
  }
  if (colors.accent || colors.primary || colors.alive) {
    vars["--pf-accent"] = String(colors.accent || colors.primary || colors.alive);
  }
  if (colors.border) vars["--pf-border"] = String(colors.border);

  return vars as CSSProperties;
}

export function DesignTokenProvider({
  designSystem,
  children,
  className = "",
}: {
  designSystem?: DesignSystem | null;
  children: ReactNode;
  className?: string;
}) {
  const personality = String(designSystem?.personality || "");
  const tokens = designSystem?.tokens || {};
  const style = useMemo(() => cssVars(tokens), [tokens]);
  const value = useMemo(() => ({ personality, tokens }), [personality, tokens]);

  return (
    <DesignTokenContext.Provider value={value}>
      <div
        className={className}
        style={{
          ...style,
          background: "var(--pf-bg, transparent)",
          color: "var(--pf-fg, inherit)",
          fontFamily: "var(--pf-font-body, inherit)",
        }}
        data-personality={personality || undefined}
      >
        {children}
      </div>
    </DesignTokenContext.Provider>
  );
}
