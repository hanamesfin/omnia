import Link from "next/link";
import { Activity } from "lucide-react";
import { ShellMenuAnchor } from "@/components/ShellMenuDock";

export default function ActivityPage() {
  return (
    <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <ShellMenuAnchor />
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-alive">Activity</p>
      <h1 className="mt-2 font-display text-display-lg">Recent motion</h1>
      <p className="mt-3 text-muted">
        Creates, GETs from Discover, runs, ratings — your trail through OMNIA.
      </p>
      <div className="mt-8 space-y-3">
        {[
          { title: "Open Yours", href: "/yours", body: "Agents you created or added" },
          { title: "Browse Discover", href: "/explore", body: "Featured agents and intents" },
          { title: "Start Create", href: "/create", body: "Invent a frontier or specialist agent" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="glass-panel flex items-center gap-4 rounded-2xl p-4 transition hover:border-alive/40"
          >
            <Activity size={18} className="text-alive" aria-hidden />
            <span>
              <span className="block font-medium">{item.title}</span>
              <span className="text-sm text-muted">{item.body}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
