import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for the OMNIA capstone demonstration platform.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-display-lg text-foreground">Terms</h1>
      <p className="mt-4 text-muted leading-relaxed">
        OMNIA is provided as an academic demonstration. Outputs are not professional advice.
        You are responsible for how you use generated agents and for not submitting sensitive
        personal data you are not authorized to process.
      </p>
      <p className="mt-4 text-muted leading-relaxed">
        Published marketplace agents may be added by other users of this demo. Do not publish
        content you do not have rights to share. The operators may reset demo data at any time.
      </p>
      <Link href="/" className="mt-10 inline-block text-alive hover:underline">
        ← Back home
      </Link>
    </article>
  );
}
