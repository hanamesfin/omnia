"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { uploadFile, type UploadedAttachment } from "@/lib/api";
import { VoiceInput } from "@/components/VoiceInput";
import { ComposerPlusMenu } from "@/components/ComposerPlusMenu";
import { detectInputLanguage } from "@/lib/detect-input-language";
import { isAutoDetectInputLanguage } from "@/lib/input-language-prefs";
import { modelDisplayName } from "@/lib/models";

export type LocalAttachment = UploadedAttachment & {
  localPreviewUrl?: string;
};

type Props = {
  placeholder?: string;
  submitLabel?: string;
  disabled?: boolean;
  busy?: boolean;
  /** Multi-line composer (tools / transformers). Default single-line chat height. */
  multiline?: boolean;
  hints?: string[];
  /** Current foundation model for this agent / session. */
  selectedModelId?: string | null;
  onModelChange?: (modelId: string) => void;
  onClearModel?: () => void;
  recommendPrompt?: string;
  recommendDomain?: string;
  onSubmit: (payload: {
    message: string;
    attachments: LocalAttachment[];
    inputLanguage?: string;
  }) => void | Promise<void>;
  onError?: (message: string) => void;
};

const ACCEPT =
  ".txt,.md,.csv,.tsv,.json,.jsonl,.py,.js,.jsx,.ts,.tsx,.java,.go,.rs,.yaml,.yml,.log,.sql,.diff,.pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.html,.css,.xml";

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

export function Composer({
  placeholder = "Message, drop a file, or paste an image…",
  submitLabel = "Send",
  disabled,
  busy,
  multiline,
  hints,
  selectedModelId,
  onModelChange,
  onClearModel,
  recommendPrompt,
  recommendDomain,
  onSubmit,
  onError,
}: Props) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      attachments.forEach((a) => {
        if (a.localPreviewUrl) URL.revokeObjectURL(a.localPreviewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke on unmount only
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      if (attachments.length + list.length > 6) {
        onError?.("Up to 6 files per message");
        return;
      }
      setUploading(true);
      try {
        for (const file of list) {
          if (file.size > 8 * 1024 * 1024) {
            onError?.(`${file.name} is over 8 MB`);
            continue;
          }
          const uploaded = await uploadFile(file);
          const localPreviewUrl = file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined;
          setAttachments((prev) => [...prev, { ...uploaded, localPreviewUrl }]);
        }
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [attachments.length, onError]
  );

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const hit = prev.find((a) => a.id === id);
      if (hit?.localPreviewUrl) URL.revokeObjectURL(hit.localPreviewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !busy && !uploading && !disabled;

  useEffect(() => {
    if (!isAutoDetectInputLanguage()) {
      setDetectedLang(null);
      return;
    }
    const t = window.setTimeout(() => {
      const hit = detectInputLanguage(text);
      setDetectedLang(hit && hit.confidence >= 0.4 ? hit.native : null);
    }, 180);
    return () => window.clearTimeout(t);
  }, [text]);

  const submit = async () => {
    if (!canSend) return;
    const message = text.trim();
    const files = [...attachments];
    const detected = detectInputLanguage(message);
    setText("");
    setAttachments([]);
    setDetectedLang(null);
    await onSubmit({
      message,
      attachments: files,
      inputLanguage: detected?.speechCode,
    });
  };

  const onForm = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !multiline) {
      e.preventDefault();
      void submit();
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && multiline) {
      e.preventDefault();
      void submit();
    }
  };

  const onPaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      void addFiles(files);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
  };

  return (
    <form
      onSubmit={onForm}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`relative space-y-3 border-t border-border bg-background/50 p-3 sm:p-4 ${
        dragging ? "ring-2 ring-inset ring-alive/50" : ""
      }`}
    >
      {hints && hints.length > 0 && attachments.length === 0 && !text && (
        <div className="flex flex-wrap gap-2">
          {hints.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setText(h)}
              className="rounded-full bg-surface px-3 py-1.5 text-xs text-muted ring-1 ring-border transition hover:text-foreground"
            >
              {h}
            </button>
          ))}
        </div>
      )}

      {selectedModelId && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-alive/10 px-2.5 py-1 text-[11px] font-medium text-alive ring-1 ring-alive/20">
            {modelDisplayName(selectedModelId)}
            {onClearModel && (
              <button
                type="button"
                aria-label="Clear model override"
                onClick={onClearModel}
                className="rounded-full p-0.5 hover:bg-alive/15"
              >
                <X size={12} />
              </button>
            )}
          </span>
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex max-w-full items-center gap-2 rounded-2xl bg-surface py-1.5 pl-2 pr-1 ring-1 ring-border"
            >
              {a.localPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.localPreviewUrl}
                  alt=""
                  className="h-9 w-9 rounded-lg object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-muted">
                  <MediaIcon media={a.media} />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">{a.filename}</span>
                <span className="text-[10px] text-muted">{formatBytes(a.size_bytes)}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${a.filename}`}
                onClick={() => removeAttachment(a.id)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-background hover:text-foreground"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {dragging && (
        <p className="pointer-events-none absolute inset-x-4 top-4 z-10 rounded-2xl border border-dashed border-alive/50 bg-alive/10 px-4 py-8 text-center text-sm font-medium text-alive">
          Drop files to attach
        </p>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
          }}
        />
        <ComposerPlusMenu
          disabled={disabled || busy}
          uploading={uploading}
          selectedModelId={selectedModelId}
          recommendPrompt={recommendPrompt}
          recommendDomain={recommendDomain}
          onAttach={() => fileInputRef.current?.click()}
          onSelectModel={(id) => onModelChange?.(id)}
          onClearModel={onClearModel}
        />
        <VoiceInput
          value={text}
          onChange={setText}
          disabled={disabled || busy}
          onError={onError}
          onLanguageDetected={(_code, label) => setDetectedLang(label)}
        />
        <label htmlFor={inputId} className="sr-only">
          Message
        </label>
        <textarea
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={multiline ? 5 : 1}
          placeholder={placeholder}
          disabled={disabled || busy}
          className={`min-h-tap max-h-48 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed focus:border-alive/50 focus:outline-none disabled:opacity-60 ${
            multiline ? "font-mono text-[13px]" : ""
          }`}
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={submitLabel}
          className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-2xl bg-primary text-white disabled:opacity-50"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
      <p className="px-1 text-[11px] text-muted">
        {detectedLang ? (
          <>
            Detected: <span className="font-medium text-foreground">{detectedLang}</span>
            {" · "}
          </>
        ) : null}
        + model · mic · {multiline ? "run with files" : "chat"} in 70+ languages · attach code, CSV, images, PDF ·{" "}
        {multiline ? "⌘/Ctrl+Enter to run" : "Enter to send"}
      </p>
    </form>
  );
}
