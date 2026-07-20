"use client";

import { Terminal } from "lucide-react";

export type CodeExecutionResult = {
  success?: boolean;
  sandbox?: string;
  stdout?: string;
  stderr?: string;
  images?: string[];
  result_text?: string | null;
  error_name?: string | null;
  error_value?: string | null;
  traceback?: string;
  exit_code?: number;
};

export type ToolCallRecord = {
  tool: string;
  args: Record<string, unknown>;
  result?: string;
  parsed?: CodeExecutionResult;
};

function parseExecution(record: ToolCallRecord): CodeExecutionResult | null {
  if (record.parsed) return record.parsed;
  if (!record.result) return null;
  try {
    const data = JSON.parse(record.result);
    return typeof data === "object" && data ? (data as CodeExecutionResult) : null;
  } catch {
    return null;
  }
}

function isCodeTool(name: string) {
  return name === "code_execute" || name === "run_python_code";
}

export function ToolExecutionBlock({ record }: { record: ToolCallRecord }) {
  if (!isCodeTool(record.tool)) {
    return (
      <div className="rounded-xl bg-background/60 p-3 ring-1 ring-border">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
          Tool · {record.tool}
        </p>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs text-foreground/90">
          {record.result || "(no output)"}
        </pre>
      </div>
    );
  }

  const code = String(record.args?.code || "").trim();
  const execution = parseExecution(record);

  return (
    <div className="space-y-3 rounded-xl bg-background/60 p-3 ring-1 ring-border">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted">
        <Terminal size={12} aria-hidden />
        Python sandbox
        {execution?.sandbox ? (
          <span className="rounded-full bg-surface px-2 py-0.5 font-mono normal-case text-foreground/70">
            {execution.sandbox}
          </span>
        ) : null}
      </div>

      {code ? (
        <pre className="max-h-48 overflow-auto rounded-lg bg-surface/80 p-3 font-mono text-xs leading-relaxed text-foreground/90 ring-1 ring-border">
          {code}
        </pre>
      ) : null}

      {execution ? (
        <div className="space-y-2">
          {!execution.success ? (
            <div className="rounded-lg bg-danger/10 p-3 text-xs text-danger ring-1 ring-danger/20">
              <p className="font-medium">
                {execution.error_name || "Error"}
                {execution.error_value ? `: ${execution.error_value}` : ""}
              </p>
              {execution.traceback ? (
                <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] opacity-90">
                  {execution.traceback}
                </pre>
              ) : null}
            </div>
          ) : null}

          {execution.stdout ? (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted">stdout</p>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-foreground/90">
                {execution.stdout}
              </pre>
            </div>
          ) : null}

          {execution.stderr ? (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted">stderr</p>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-amber-700 dark:text-amber-300">
                {execution.stderr}
              </pre>
            </div>
          ) : null}

          {execution.result_text ? (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted">result</p>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-foreground/90">
                {execution.result_text}
              </pre>
            </div>
          ) : null}

          {execution.images && execution.images.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {execution.images.map((img, index) => (
                <img
                  key={`chart-${index}`}
                  src={`data:image/png;base64,${img}`}
                  alt={`Generated chart ${index + 1}`}
                  className="w-full rounded-lg bg-white ring-1 ring-border"
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <pre className="whitespace-pre-wrap font-mono text-xs text-foreground/90">
          {record.result || "(no output)"}
        </pre>
      )}
    </div>
  );
}

export function ToolExecutionList({ tools }: { tools: ToolCallRecord[] }) {
  if (!tools.length) return null;
  return (
    <div className="space-y-3">
      {tools.map((record, index) => (
        <ToolExecutionBlock key={`${record.tool}-${index}`} record={record} />
      ))}
    </div>
  );
}
