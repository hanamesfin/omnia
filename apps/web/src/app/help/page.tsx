import Link from "next/link";
import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import { ShellMenuAnchor } from "@/components/ShellMenuDock";

const STEPS = [
  "Menu → Appearance for themes; Discover / Create / Yours stay one tap away.",
  "Create interviews you, attaches knowledge files, and generates a linted constitution.",
  "GET agents from Discover; open Chat/Run with files + multilingual voice.",
  "Rate turns → Evaluation + Advance (continuous improvement).",
  "An agent is a system of 20 building blocks — see the stack below.",
];

export default function HelpPage() {
  return (
    <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <ShellMenuAnchor />
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-alive">Help</p>
      <h1 className="mt-2 font-display text-display-lg">How OMNIA works</h1>
      <p className="mt-3 text-muted">
        Beyond a chatbot: a platform that designs agents as full systems — brain, prompt, memory,
        knowledge, tools, eval — then publishes them to Discover.
      </p>
      <ol className="mt-8 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s} className="flex gap-4 text-sm leading-relaxed text-muted">
            <span className="font-mono text-alive">{i + 1}</span>
            <span className="text-foreground/90">{s}</span>
          </li>
        ))}
      </ol>

      <div className="glass-panel mt-10 rounded-[1.35rem] p-5">
        <ArchitecturePanel showPlatform />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/create"
          className="inline-flex min-h-tap items-center rounded-full bg-alive px-5 text-sm font-semibold text-on-alive"
        >
          Create
        </Link>
        <Link
          href="/privacy"
          className="inline-flex min-h-tap items-center rounded-full px-5 text-sm ring-1 ring-border"
        >
          Privacy
        </Link>
      </div>
    </div>
  );
}
