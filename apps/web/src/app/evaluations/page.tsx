import Link from "next/link";

export default function EvaluationsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-alive">Evaluations</p>
      <h1 className="mt-2 font-display text-display-lg">Stars that train</h1>
      <p className="mt-3 text-muted">
        Rate runs inside each agent workspace. Wilson scoring keeps thin samples from faking the
        shelf.
      </p>
      <Link
        href="/yours"
        className="mt-8 inline-flex min-h-tap items-center rounded-full bg-alive px-5 text-sm font-semibold text-on-alive"
      >
        Rate from Yours
      </Link>
    </div>
  );
}
