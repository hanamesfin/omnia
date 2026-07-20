import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What OMNIA collects and why — privacy overview for the capstone demo.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 prose-invert">
      <h1 className="font-display text-display-lg text-foreground">Privacy</h1>
      <p className="mt-4 text-muted leading-relaxed">
        OMNIA stores account details you provide, interview answers, generated agent specs,
        chat transcripts for agents you run, and evaluation signals (latency, ratings, costs).
        Memory retrieval stays within your library unless you enable shared context on agents
        you created. Marketplace listings are public by design when you publish.
      </p>
      <p className="mt-4 text-muted leading-relaxed">
        Secrets (API keys) live in environment variables on the server — never in the browser.
        LLM providers receive prompts and messages required to run generation and chat.
      </p>
      <p className="mt-4 text-muted leading-relaxed">
        This is a university capstone build. Treat it as a demonstration environment, not a
        production privacy program. Questions: use your course contact channel or open an issue
        in the project repository.
      </p>
      <Link href="/" className="mt-10 inline-block text-alive hover:underline">
        ← Back home
      </Link>
    </article>
  );
}
