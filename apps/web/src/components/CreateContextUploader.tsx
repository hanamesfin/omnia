"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import {
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";
import { uploadFile, type UploadedAttachment } from "@/lib/api";

export type LocalAttachment = UploadedAttachment & {
  localPreviewUrl?: string;
  knowledgeId?: string;
  knowledgeStatus?: "pending" | "processing" | "ready" | "failed";
  knowledgeError?: string;
};

type Props = {
  sessionId: string | null;
  enterprise?: boolean;
  onChange?: (files: LocalAttachment[]) => void;
  onKnowledgeReadyChange?: (ready: boolean) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

const ACCEPT =
  ".txt,.md,.csv,.tsv,.json,.jsonl,.py,.js,.jsx,.ts,.tsx,.java,.go,.rs,.yaml,.yml,.log,.sql,.diff,.pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.html,.css,.xml,.docx";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaIcon({ media }: { media: string }) {
  if (media === "image") return <ImageIcon size={14} aria-hidden />;
  if (media === "table") return <FileSpreadsheet size={14} aria-hidden />;
  return <FileText size={14} aria-hidden />;
}

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-alive">
        <CheckCircle2 size={12} /> ready
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-danger">
        <AlertCircle size={12} /> failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted">
      <Loader2 size={12} className="animate-spin" /> {status}
    </span>
  );
}

/** Multi-file knowledge dropzone for Create — brand docs, SOPs, samples, datasets. */
export function CreateContextUploader({
  sessionId,
  enterprise = false,
  onChange,
  onKnowledgeReadyChange,
  onError,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<LocalAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [tryDocId, setTryDocId] = useState<string | null>(null);
  const [tryQuery, setTryQuery] = useState("");
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [trying, setTrying] = useState(false);

  useEffect(() => {
    onChange?.(files);
  }, [files, onChange]);

  useEffect(() => {
    return () => {
      files.forEach((a) => {
        if (a.localPreviewUrl) URL.revokeObjectURL(a.localPreviewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncSession = useCallback(
    async (next: LocalAttachment[]) => {
      if (!sessionId) return;
      setSyncing(true);
      try {
        const { fetchApi } = await import("@/lib/api");
        const res = await fetchApi("/interview/context", {
          method: "POST",
          body: JSON.stringify({
            session_id: sessionId,
            attachment_ids: next.map((f) => f.id),
          }),
        });
        const ctxFiles = (res.context_files || []) as Array<{
          id: string;
          upload_id?: string;
          filename: string;
          status?: string;
        }>;
        if (enterprise && ctxFiles.length) {
          setFiles((prev) =>
            prev.map((f) => {
              const match =
                ctxFiles.find((c) => c.upload_id === f.id) ||
                ctxFiles.find((c) => c.id === f.id);
              if (!match) return f;
              return {
                ...f,
                knowledgeId: match.id,
                knowledgeStatus: (match.status as LocalAttachment["knowledgeStatus"]) || "pending",
              };
            })
          );
        }
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Couldn't attach files to Create");
      } finally {
        setSyncing(false);
      }
    },
    [sessionId, onError, enterprise]
  );

  // Poll knowledge status for Enterprise — stop once docs are terminal
  useEffect(() => {
    if (!enterprise || !sessionId) return;
    let cancelled = false;
    let id: number | undefined;
    const tick = async () => {
      try {
        const { fetchApi } = await import("@/lib/api");
        const res = await fetchApi(
          `/interview/knowledge?session_id=${encodeURIComponent(sessionId)}`
        );
        const docs = (res.documents || []) as Array<{
          id: string;
          upload_id: string;
          status: string;
          error?: string;
        }>;
        if (cancelled) return;
        setFiles((prev) =>
          prev.map((f) => {
            const doc = docs.find((d) => d.upload_id === f.id || d.id === f.knowledgeId);
            if (!doc) return f;
            return {
              ...f,
              knowledgeId: doc.id,
              knowledgeStatus: doc.status as LocalAttachment["knowledgeStatus"],
              knowledgeError: doc.error || "",
            };
          })
        );
        const ready = docs.some((d) => d.status === "ready");
        onKnowledgeReadyChange?.(ready);
        const stillPending = docs.some(
          (d) => d.status === "pending" || d.status === "indexing" || d.status === "processing"
        );
        if (docs.length > 0 && !stillPending && id != null) {
          window.clearInterval(id);
          id = undefined;
        }
      } catch {
        /* ignore poll errors */
      }
    };
    void tick();
    id = window.setInterval(tick, files.length ? 2000 : 8000);
    return () => {
      cancelled = true;
      if (id != null) window.clearInterval(id);
    };
  }, [enterprise, sessionId, onKnowledgeReadyChange, files.length]);

  const addFiles = async (list: FileList | File[]) => {
    const incoming = Array.from(list);
    if (!incoming.length) return;
    if (files.length + incoming.length > 12) {
      onError?.("Up to 12 context files per Create session");
      return;
    }
    setUploading(true);
    const added: LocalAttachment[] = [];
    try {
      for (const file of incoming) {
        if (file.size > 8 * 1024 * 1024) {
          onError?.(`${file.name} is over 8 MB`);
          continue;
        }
        const uploaded = await uploadFile(file);
        const localPreviewUrl = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;
        added.push({
          ...uploaded,
          localPreviewUrl,
          knowledgeStatus: enterprise ? "pending" : "ready",
        });
      }
      const next = [...files, ...added];
      setFiles(next);
      await syncSession(next);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (id: string) => {
    const next = files.filter((f) => {
      if (f.id === id && f.localPreviewUrl) URL.revokeObjectURL(f.localPreviewUrl);
      return f.id !== id;
    });
    setFiles(next);
    if (tryDocId && files.find((f) => f.id === id)?.knowledgeId === tryDocId) {
      setTryDocId(null);
      setTryResult(null);
    }
    await syncSession(next);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
  };

  const onPaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pasted: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) pasted.push(f);
      }
    }
    if (pasted.length) {
      e.preventDefault();
      void addFiles(pasted);
    }
  };

  const readyFile = files.find((f) => f.knowledgeStatus === "ready" && f.knowledgeId);

  const runTry = async (documentId?: string) => {
    const docId = documentId || tryDocId || readyFile?.knowledgeId;
    if (!sessionId || !tryQuery.trim() || !docId) return;
    setTryDocId(docId);
    setTrying(true);
    setTryResult(null);
    try {
      const { fetchApi } = await import("@/lib/api");
      const res = await fetchApi("/interview/knowledge/try", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          document_id: docId,
          query: tryQuery.trim(),
        }),
      });
      setTryResult(res.text || "No hits.");
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Knowledge try failed");
    } finally {
      setTrying(false);
    }
  };

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      tabIndex={0}
      className={`rounded-[1.25rem] border border-dashed p-4 outline-none transition focus-visible:ring-2 focus-visible:ring-alive/40 ${
        dragging ? "border-alive/60 bg-alive/8" : "border-border bg-background/40"
      }`}
      aria-label="Upload context files for this agent"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-alive/10 text-alive ring-1 ring-alive/25">
          <Upload size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold text-foreground">
            {enterprise ? "Knowledge library" : "Context library"}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {enterprise
              ? "Upload docs to chunk and embed. Generate waits until at least one file is ready — then the agent queries them live."
              : "Drop brand guides, SOPs, sample chats, CSVs, code, or screenshots. Folded into the agent constitution — up to 12 files."}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
        }}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || uploading || !sessionId}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-tap items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium ring-1 ring-border transition hover:text-alive disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          {uploading ? "Uploading…" : "Add files"}
        </button>
        {(syncing || uploading) && (
          <span className="self-center text-[11px] text-muted">Syncing to Create session…</span>
        )}
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-2xl bg-surface py-2 pl-2 pr-1 ring-1 ring-border"
            >
              {f.localPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.localPreviewUrl}
                  alt=""
                  className="h-9 w-9 rounded-lg object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-muted">
                  <MediaIcon media={f.media} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{f.filename}</span>
                <span className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted">
                  {f.media} · {formatBytes(f.size_bytes)}
                  {enterprise && <StatusBadge status={f.knowledgeStatus} />}
                </span>
                {f.knowledgeError && (
                  <span className="mt-0.5 block text-[10px] text-danger">{f.knowledgeError}</span>
                )}
              </span>
              {enterprise && f.knowledgeStatus === "ready" && f.knowledgeId && (
                <button
                  type="button"
                  onClick={() => {
                    setTryDocId(f.knowledgeId || null);
                    setTryResult(null);
                  }}
                  className="rounded-full px-2 py-1 text-[10px] font-medium text-alive ring-1 ring-alive/25 hover:bg-alive/10"
                >
                  Try
                </button>
              )}
              <button
                type="button"
                aria-label={`Remove ${f.filename}`}
                onClick={() => void remove(f.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-background hover:text-foreground"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {enterprise && (tryDocId || readyFile) && (
        <div className="mt-4 rounded-2xl bg-background/60 p-3 ring-1 ring-border">
          <p className="text-xs font-medium text-foreground">Try a question against knowledge</p>
          <div className="mt-2 flex gap-2">
            <input
              value={tryQuery}
              onChange={(e) => setTryQuery(e.target.value)}
              placeholder="Ask something only this file would know…"
              className="min-h-10 flex-1 rounded-xl border border-border bg-surface px-3 text-sm focus:border-alive/50 focus:outline-none"
            />
            <button
              type="button"
              disabled={trying || !tryQuery.trim()}
              onClick={() => void runTry()}
              className="inline-flex min-h-10 items-center rounded-xl bg-alive px-3 text-xs font-semibold text-on-alive disabled:opacity-50"
            >
              {trying ? <Loader2 size={14} className="animate-spin" /> : "Search"}
            </button>
          </div>
          {tryResult && (
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-surface p-3 font-mono text-[11px] leading-relaxed text-foreground/85">
              {tryResult}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
