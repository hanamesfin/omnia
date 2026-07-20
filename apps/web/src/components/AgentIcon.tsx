"use client";

import { logoForAgent, getPalette, type AgentLogo, type LogoMotif } from "@/lib/agent-logos";
import { monogramFromName, type AgentAvatarStyleId } from "@/lib/agent-avatar-prefs";
import { useAgentAvatar } from "@/hooks/useAgentAvatar";

type Props = {
  name: string;
  kind?: unknown;
  domain?: string;
  purpose?: string;
  logo?: AgentLogo | null;
  /** Loads per-agent avatar style from localStorage when set */
  agentId?: string;
  /** Explicit style override (wins over stored pref) */
  avatarStyle?: AgentAvatarStyleId;
  uploadUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  selected?: boolean;
};

const SIZE = {
  sm: "h-11 w-11",
  md: "h-14 w-14",
  lg: "h-[4.5rem] w-[4.5rem]",
  xl: "h-28 w-28",
} as const;

const MONO_SIZE = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
} as const;

/** Soft squircle + layered SVG motif — App Store product look. */
export function AgentIcon({
  name,
  kind,
  domain,
  purpose,
  logo,
  agentId,
  avatarStyle,
  uploadUrl,
  size = "md",
  className = "",
  selected,
}: Props) {
  const stored = useAgentAvatar(agentId);
  const style: AgentAvatarStyleId = avatarStyle || stored.style || "illustrated";
  const upload = uploadUrl || stored.uploadDataUrl;

  const resolved = logoForAgent({
    name,
    kind: typeof kind === "string" ? kind : undefined,
    domain,
    purpose,
    logo,
  });
  const palette = getPalette(resolved.palette_id);
  const gradId = `g-${resolved.motif}-${resolved.palette_id}-${size}`;
  const ring = selected ? "ring-2 ring-alive ring-offset-2 ring-offset-background" : "";
  const shell = `relative inline-flex shrink-0 overflow-hidden shadow-soft ${SIZE[size]} rounded-[22%] ${className} ${ring}`;

  if (style === "upload" && upload) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={upload}
        alt=""
        className={`inline-block shrink-0 object-cover shadow-soft ${SIZE[size]} rounded-[22%] ${className} ${ring}`}
      />
    );
  }

  // Illustrated with remote / DALL·E image still wins when style is illustrated
  if (style === "illustrated" && resolved.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved.image_url}
        alt=""
        className={`inline-block shrink-0 object-cover shadow-soft ${SIZE[size]} rounded-[22%] ${className} ${ring}`}
      />
    );
  }

  const gradientBg = {
    background: `linear-gradient(160deg, ${palette.from} 0%, ${palette.mid || palette.to} 48%, ${palette.to} 100%)`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px color-mix(in srgb, ${palette.to} 35%, transparent)`,
  };

  if (style === "orb") {
    return (
      <div className={shell} style={gradientBg} aria-hidden>
        <div
          className="pointer-events-none absolute inset-[12%] rounded-full opacity-90"
          style={{
            background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0%, transparent 55%), radial-gradient(circle at 70% 75%, ${palette.from} 0%, transparent 50%)`,
          }}
        />
        <div
          className="pointer-events-none absolute -right-[10%] -bottom-[15%] h-[65%] w-[65%] rounded-full opacity-50"
          style={{ background: `radial-gradient(circle, ${palette.mid || palette.to} 0%, transparent 70%)` }}
        />
      </div>
    );
  }

  if (style === "monogram") {
    return (
      <div
        className={`${shell} items-center justify-center font-display font-semibold tracking-tight text-white`}
        style={gradientBg}
        aria-hidden
      >
        <span className={`relative z-[1] drop-shadow-sm ${MONO_SIZE[size]}`}>
          {monogramFromName(name)}
        </span>
        <div
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            background:
              "linear-gradient(165deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 40%, transparent 58%)",
          }}
        />
      </div>
    );
  }

  // illustrated (motif) — default
  return (
    <div className={shell} style={gradientBg} aria-hidden>
      <div
        className="pointer-events-none absolute -right-[18%] -bottom-[22%] h-[70%] w-[70%] rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 68%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-55"
        style={{
          background:
            "linear-gradient(165deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 38%, transparent 55%)",
        }}
      />
      <svg
        viewBox="0 0 64 64"
        className="relative z-[1] h-full w-full p-[18%] drop-shadow-[0_2px_6px_rgba(0,0,0,0.18)]"
        fill="none"
      >
        <defs>
          <linearGradient id={gradId} x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" stopOpacity="0.98" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.82" />
          </linearGradient>
        </defs>
        <MotifPath motif={resolved.motif} fill={`url(#${gradId})`} />
      </svg>
    </div>
  );
}

function MotifPath({ motif, fill }: { motif: LogoMotif; fill: string }) {
  switch (motif) {
    case "chat":
      return (
        <path
          fill={fill}
          d="M12 18c0-4.4 4.9-8 14-8s14 3.6 14 8-4.9 8-14 8c-1.4 0-2.7-.1-4-.3L14 30l1.2-5.2C12.8 23.3 12 20.7 12 18zm26 6c7.2 0 12 2.7 12 6.5 0 1.9-.8 3.6-2.3 4.9L49 42l-4.2-2.6c-.9.1-1.8.2-2.8.2-1.6 0-3.1-.2-4.5-.5 1.7-1.4 2.8-3.2 2.8-5.2 0-1.2-.4-2.3-1.1-3.3.9-.1 1.9-.1 2.8-.1z"
        />
      );
    case "code":
      return (
        <path
          fill={fill}
          fillRule="evenodd"
          d="M22 18 12 32l10 14 3.2-2.3L17.3 32 25.2 20.3 22 18zm20 0-3.2 2.3L46.7 32l-7.9 11.7L42 46l10-14-10-14zM35.2 16l-3.1 1 .9 31.2 3.1-.1L35.2 16z"
        />
      );
    case "bug":
      return (
        <path
          fill={fill}
          d="M32 14c-5.5 0-9 3.8-9 9v2H16v3h6.1c.2 1.5.7 2.9 1.4 4.1L18 38.2l2.4 1.8 5.2-5.9c1.5 1.4 3.4 2.3 5.4 2.6V48h3V36.7c2-.3 3.9-1.2 5.4-2.6l5.2 5.9 2.4-1.8-5.5-6.1c.7-1.2 1.2-2.6 1.4-4.1H48v-3h-7v-2c0-5.2-3.5-9-9-9zm0 3c3.6 0 6 2.4 6 6v2H26v-2c0-3.6 2.4-6 6-6z"
        />
      );
    case "pen":
      return (
        <path
          fill={fill}
          d="M40.5 12.5 16 37l-2 11 11-2 24.5-24.5-9-9zM38.8 17 43 21.2 46.7 17.5 42.5 13.3 38.8 17zM19.2 39.3 36.6 21.9 40.1 25.4 22.7 42.8l-4.2.8.7-4.3z"
        />
      );
    case "book":
      return (
        <path
          fill={fill}
          d="M14 16c0-2 1.5-3.5 4-3.5h10c2 0 3.5 1 4.5 2.2 1-1.2 2.5-2.2 4.5-2.2h9c2.5 0 4 1.5 4 3.5v30c0 1.8-1.3 3-3.2 3H35c-1.5 0-2.6.5-3 1.2-.4-.7-1.5-1.2-3-1.2H17.2C15.3 49 14 47.8 14 46V16zm16 3.2c-.6-.7-1.6-1.2-3-1.2H19c-.8 0-1.5.4-1.5 1.3v25.3c0 .3.2.5.5.5H27c1.4 0 2.5.3 3 .8V19.2zm3 26.7c.5-.5 1.6-.8 3-.8h8.9c.3 0 .6-.2.6-.5V19.3c0-.9-.7-1.3-1.5-1.3H37c-1.4 0-2.4.5-3 1.2v26.7z"
        />
      );
    case "chart":
      return (
        <path
          fill={fill}
          d="M14 46V18h4v28h-4zm10 0V28h4v18h-4zm10 0V22h4v24h-4zm10 0V30h4v16h-4zM12 50h40v3H12v-3z"
        />
      );
    case "shield":
      return (
        <path
          fill={fill}
          d="M32 10 14 17v14c0 11.2 7.4 21.6 18 25 10.6-3.4 18-13.8 18-25V17L32 10zm0 5.2 12 4.6V31c0 8.5-5.3 16.5-12 19.6-6.7-3.1-12-11.1-12-19.6V19.8l12-4.6zm-1.5 9.3v12.5l9.5-5.5-1.5-2.6-6.5 3.8V24.5h-1.5z"
        />
      );
    case "inbox":
      return (
        <path
          fill={fill}
          d="M12 20h40v8.5l-6.5 9.5H38c0 3.3-2.7 6-6 6s-6-2.7-6-6h-7.5L12 28.5V20zm4 4v3.2L20.8 34H25c.9-2.9 3.6-5 6.8-5s5.9 2.1 6.8 5h4.2L48 27.2V24H16z"
        />
      );
    case "waves":
      return (
        <path
          fill={fill}
          d="M10 26c4-4 8-4 12 0s8 4 12 0 8-4 12 0 4 4 8 0v5c-4 4-8 4-12 0s-8-4-12 0-8 4-12 0-8-4-12 0v-5zm0 12c4-4 8-4 12 0s8 4 12 0 8-4 12 0 4 4 8 0v5c-4 4-8 4-12 0s-8-4-12 0-8 4-12 0-8-4-12 0v-5z"
        />
      );
    case "leaf":
      return (
        <path
          fill={fill}
          d="M44 12c-12 2-22 12-24 24-1 6 1 11 5 15 4-4 6-9 5-15 6 2 12 0 18-6 4-4 6-10 5-16-3-.8-6-1.4-9-2zm-14.5 41c1.5-3 2-6.5 1.7-10-3.8 3.5-6 7.5-6.7 12.2.7.2 1.3.4 2 .5 1.1-1 2.1-1.9 3-2.7z"
        />
      );
    case "bolt":
      return <path fill={fill} d="M36 10 18 34h11l-3 20 20-28H35l1-16z" />;
    case "target":
      return (
        <path
          fill={fill}
          fillRule="evenodd"
          d="M32 14a18 18 0 1 0 0 36 18 18 0 0 0 0-36zm0 5a13 13 0 1 1 0 26 13 13 0 0 1 0-26zm0 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z"
        />
      );
    case "gear":
      return (
        <path
          fill={fill}
          d="M28.2 12h7.6l1 6.2 5.4 2.2 5.2-3.6 5.4 5.4-3.6 5.2 2.2 5.4 6.2 1v7.6l-6.2 1-2.2 5.4 3.6 5.2-5.4 5.4-5.2-3.6-5.4 2.2-1 6.2h-7.6l-1-6.2-5.4-2.2-5.2 3.6-5.4-5.4 3.6-5.2-2.2-5.4L8 35.8v-7.6l6.2-1 2.2-5.4-3.6-5.2 5.4-5.4 5.2 3.6 5.4-2.2L28.2 12zM32 24a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"
        />
      );
    case "heart":
      return (
        <path
          fill={fill}
          d="M32 46.5 16.8 32.2C12.5 28 12 21.5 16.2 17.5c3.5-3.4 9-3.2 12.3.4L32 21.2l3.5-3.3c3.3-3.6 8.8-3.8 12.3-.4 4.2 4 3.7 10.5-.6 14.7L32 46.5z"
        />
      );
    case "globe":
      return (
        <path
          fill={fill}
          fillRule="evenodd"
          d="M32 12a20 20 0 1 0 0 40 20 20 0 0 0 0-40zm0 3.2c2.8 2.4 4.7 6.8 5.2 12.3H26.8c.5-5.5 2.4-9.9 5.2-12.3zm-8.4 15.3h16.8c-.2 2.6-.8 5-1.7 7H25.3c-.9-2-1.5-4.4-1.7-7zm1.2 10h14.4c-1.7 4.3-4.3 7.3-7.2 8.6-2.9-1.3-5.5-4.3-7.2-8.6zm14.4-22.6c1.7 4.3 2.4 9.2 2.6 12.3H22.2c.2-3.1.9-8 2.6-12.3C27.2 15.2 30.2 13.8 32 13.8c1.8 0 4.8 1.4 7.2 4.1z"
        />
      );
    case "spark":
    default:
      return (
        <path
          fill={fill}
          d="M32 10c1.2 7.5 4.5 12.5 10.5 16.5C36.5 30.5 33.2 35.5 32 43c-1.2-7.5-4.5-12.5-10.5-16.5C27.5 22.5 30.8 17.5 32 10zm14 18c.7 4.2 2.5 7 5.8 9.2-3.3 2.2-5.1 5-5.8 9.2-.7-4.2-2.5-7-5.8-9.2 3.3-2.2 5.1-5 5.8-9.2zM18 28c.7 4.2 2.5 7 5.8 9.2-3.3 2.2-5.1 5-5.8 9.2-.7-4.2-2.5-7-5.8-9.2 3.3-2.2 5.1-5 5.8-9.2z"
        />
      );
  }
}
