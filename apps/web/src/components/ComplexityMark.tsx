"use client";

/**
 * Shape-coded complexity — Normal = single node, Enterprise = connected cluster.
 * Complements color so tier is readable without hue alone.
 */

type Props = {
  tier?: string;
  size?: number;
  className?: string;
  title?: string;
};

export function ComplexityMark({
  tier = "normal",
  size = 16,
  className = "",
  title,
}: Props) {
  const enterprise = String(tier).toLowerCase() === "enterprise";
  const label =
    title || (enterprise ? "Enterprise — layered stack" : "Normal — single core");

  if (!enterprise) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        className={className}
        aria-label={label}
        role="img"
      >
        <title>{label}</title>
        <circle cx="8" cy="8" r="4.5" fill="currentColor" opacity={0.85} />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-label={label}
      role="img"
    >
      <title>{label}</title>
      <circle cx="8" cy="3.5" r="2.2" fill="currentColor" />
      <circle cx="3.5" cy="11" r="2.2" fill="currentColor" />
      <circle cx="12.5" cy="11" r="2.2" fill="currentColor" />
      <path
        d="M8 5.5 L4.5 9.2 M8 5.5 L11.5 9.2 M5.5 11 H10.5"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity={0.7}
      />
    </svg>
  );
}
