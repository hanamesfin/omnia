"use client";

/** Signature constellation — CSS pulse only (no framer-motion on critical path). */
const NODES = [
  { id: "a", cx: 18, cy: 42, r: 3.2, delay: "0s" },
  { id: "b", cx: 38, cy: 22, r: 2.4, delay: "0.3s" },
  { id: "c", cx: 52, cy: 48, r: 4.0, delay: "0.15s" },
  { id: "d", cx: 68, cy: 28, r: 2.8, delay: "0.45s" },
  { id: "e", cx: 82, cy: 52, r: 3.5, delay: "0.2s" },
  { id: "f", cx: 58, cy: 72, r: 2.2, delay: "0.55s" },
  { id: "g", cx: 32, cy: 68, r: 2.6, delay: "0.35s" },
];

const EDGES: [string, string][] = [
  ["a", "b"],
  ["b", "c"],
  ["c", "d"],
  ["c", "e"],
  ["c", "f"],
  ["a", "g"],
  ["g", "f"],
  ["d", "e"],
];

function node(id: string) {
  return NODES.find((n) => n.id === id)!;
}

type Props = {
  className?: string;
};

export function Constellation({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`text-[var(--constellation)] ${className}`}
      aria-hidden
    >
      {EDGES.map(([a, b]) => {
        const na = node(a);
        const nb = node(b);
        return (
          <line
            key={`${a}-${b}`}
            x1={na.cx}
            y1={na.cy}
            x2={nb.cx}
            y2={nb.cy}
            stroke="currentColor"
            strokeOpacity={0.28}
            strokeWidth={0.35}
          />
        );
      })}
      {NODES.map((n) => (
        <circle
          key={n.id}
          cx={n.cx}
          cy={n.cy}
          r={n.r}
          fill="currentColor"
          className="origin-center animate-omni-pulse"
          style={{ animationDelay: n.delay }}
          opacity={0.85}
        />
      ))}
    </svg>
  );
}
