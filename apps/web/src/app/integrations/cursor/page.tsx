"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Code2, Loader2, Sparkles } from "lucide-react";
import { fetchApi, GENERATE_TIMEOUT_MS } from "@/lib/api";
import { ShellMenuAnchor } from "@/components/ShellMenuDock";

type CursorStatus = {
  configured: boolean;
  api_key_set: boolean;
  sdk_installed: boolean;
  default_model: string;
  default_cwd: string;
  default_runtime: string;
  hint: string | null;
};

export default function CursorIntegrationPage() {
  const [status, setStatus] = useState<CursorStatus | null>(null);
  const [prompt, setPrompt] = useState(
    "Summarize the top-level structure of this repository in 5 bullets."
  );
  const [runtime, setRuntime] = useState<"local" | "cloud">("local");
  const [repoUrl, setRepoUrl] = useState("");
  const [autoPr, setAutoPr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    fetchApi("/integrations/cursor/status")
      .then((res) => setStatus(res as CursorStatus))
      .catch(() =>
        setStatus({
          configured: false,
          api_key_set: false,
          sdk_installed: false,
          default_model: "composer-2.5",
          default_cwd: "",
          default_runtime: "local",
          hint: "Could not reach the API.",
        })
      );
  };

  useEffect(() => {
    reload();
  }, []);

  const runPrompt = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetchApi("/integrations/cursor/prompt", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          runtime,
          repo_url: runtime === "cloud" ? repoUrl : undefined,
          auto_create_pr: runtime === "cloud" ? autoPr : false,
        }),
        timeoutMs: GENERATE_TIMEOUT_MS,
      });
      setResult(
        [
          `status: ${res.status}`,
          res.agent_id ? `agent: ${res.agent_id}` : null,
          res.run_id ? `run: ${res.run_id}` : null,
          res.runtime ? `runtime: ${res.runtime}` : null,
          res.model ? `model: ${res.model}` : null,
          "",
          res.text || res.error || "(empty)",
        ]
          .filter((line) => line !== null)
          .join("\n")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cursor run failed");
    } finally {
      setBusy(false);
      reload();
    }
  };

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
      <ShellMenuAnchor />
      <Link
        href="/account"
        className="interactive inline-flex min-h-tap items-center gap-2 text-sm text-muted"
      >
        <ArrowLeft size={16} /> Account
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-alive/15 text-alive ring-1 ring-alive/25">
          <Code2 size={28} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-alive">
            Integrations
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Cursor AI
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            OMNIA coding agents can call the official Cursor SDK — local workspace edits or
            cloud runs against a GitHub repo (optional PR).
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-[1.35rem] border border-border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="font-display text-lg font-semibold">Connection</h2>
        {!status ? (
          <p className="mt-3 text-sm text-muted">Checking…</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between gap-3">
              <span className="text-muted">Status</span>
              <span className={status.configured ? "text-alive font-medium" : "text-foreground"}>
                {status.configured ? "Ready" : "Not configured"}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">API key</span>
              <span>{status.api_key_set ? "Set" : "Missing"}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">cursor-sdk</span>
              <span>{status.sdk_installed ? "Installed" : "Not installed"}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">Default model</span>
              <span className="font-mono text-xs">{status.default_model}</span>
            </li>
          </ul>
        )}
        {status?.hint ? (
          <p className="mt-4 rounded-xl bg-background/70 px-3 py-2 text-xs leading-relaxed text-muted ring-1 ring-border">
            {status.hint}
          </p>
        ) : null}
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Set <code className="font-mono text-foreground">CURSOR_API_KEY</code> in{" "}
          <code className="font-mono text-foreground">apps/api/.env</code>, then{" "}
          <code className="font-mono text-foreground">pip install cursor-sdk</code>. Keys:{" "}
          <a
            href="https://cursor.com/dashboard/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-alive hover:underline"
          >
            Cursor Dashboard → Integrations
          </a>
          .
        </p>
      </section>

      <section className="mt-6 rounded-[1.35rem] border border-border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="font-display text-lg font-semibold">Try a prompt</h2>
        <p className="mt-1 text-sm text-muted">
          One-shot via <code className="font-mono text-xs">POST /integrations/cursor/prompt</code>.
          Coding agents also get the <code className="font-mono text-xs">cursor_agent</code> tool.
        </p>

        <div className="mt-4 flex gap-2">
          {(["local", "cloud"] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={runtime === r}
              onClick={() => setRuntime(r)}
              className={`min-h-tap rounded-full px-4 text-sm font-medium ${
                runtime === r
                  ? "bg-alive text-on-alive"
                  : "bg-background text-muted ring-1 ring-border"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {runtime === "cloud" ? (
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-muted">
              GitHub repo URL
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                className="field-input mt-1.5"
              />
            </label>
            <label className="flex min-h-tap cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoPr}
                onChange={(e) => setAutoPr(e.target.checked)}
              />
              Auto-create PR
            </label>
          </div>
        ) : null}

        <label className="mt-4 block text-xs font-medium text-muted">
          Prompt
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="field-input mt-1.5 font-mono text-sm"
          />
        </label>

        <button
          type="button"
          disabled={busy || !prompt.trim()}
          onClick={() => void runPrompt()}
          className="mt-4 inline-flex min-h-tap items-center gap-2 rounded-full bg-alive px-6 text-sm font-semibold text-on-alive disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {busy ? "Running…" : "Run with Cursor"}
        </button>

        {error ? (
          <p className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-500/25">
            {error}
          </p>
        ) : null}
        {result ? (
          <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-background/80 p-4 font-mono text-xs leading-relaxed ring-1 ring-border">
            {result}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
