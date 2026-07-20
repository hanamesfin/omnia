import Link from "next/link";
import { FolderOpen } from "lucide-react";

export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-alive">Knowledge</p>
      <h1 className="mt-2 font-display text-display-lg">Context vault</h1>
      <p className="mt-3 text-muted">
        Upload brand guides, SOPs, datasets, and sample chats while you Create — they become part of
        the agent&apos;s constitution.
      </p>
      <div className="mt-8 flex items-start gap-4 rounded-[1.35rem] border border-dashed border-border bg-surface/50 p-6">
        <FolderOpen className="mt-1 text-alive" size={22} aria-hidden />
        <div>
          <p className="font-display text-lg font-semibold">Start from Create</p>
          <p className="mt-2 text-sm text-muted">
            Open Create and use the Context library panel — drag files, paste screenshots, or attach
            up to 12 documents per agent.
          </p>
          <Link
            href="/create"
            className="mt-5 inline-flex min-h-tap items-center rounded-full bg-alive px-5 text-sm font-semibold text-on-alive"
          >
            Go to Create
          </Link>
        </div>
      </div>
    </div>
  );
}
