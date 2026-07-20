/** Official OMNIA spark / Omni star mark — used in hero and badges. */
export function OmniStar({
  className = "",
  size = 48,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="omni-star-grad" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.98" />
          <stop offset="1" stopColor="#c4b5fd" stopOpacity="0.95" />
        </linearGradient>
        <filter id="omni-star-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        fill="url(#omni-star-grad)"
        filter="url(#omni-star-glow)"
        d="M32 10c1.2 7.5 4.5 12.5 10.5 16.5C36.5 30.5 33.2 35.5 32 43c-1.2-7.5-4.5-12.5-10.5-16.5C27.5 22.5 30.8 17.5 32 10zm14 18c.7 4.2 2.5 7 5.8 9.2-3.3 2.2-5.1 5-5.8 9.2-.7-4.2-2.5-7-5.8-9.2 3.3-2.2 5.1-5 5.8-9.2zM18 28c.7 4.2 2.5 7 5.8 9.2-3.3 2.2-5.1 5-5.8 9.2-.7-4.2-2.5-7-5.8-9.2 3.3-2.2 5.1-5 5.8-9.2z"
      />
    </svg>
  );
}
