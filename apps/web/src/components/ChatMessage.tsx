"use client";

import { useState } from "react";
import { Bot, FileText, Languages, Loader2, User } from "lucide-react";
import { useAppearance } from "@/components/AppearanceProvider";
import { useI18n } from "@/components/I18nProvider";
import { ToolExecutionList, type ToolCallRecord } from "@/components/ToolExecutionBlock";
import { fetchApi } from "@/lib/api";

export type ChatMessageFile = { name: string; media?: string };

type Props = {
  role: "user" | "assistant";
  content: string;
  files?: ChatMessageFile[];
  tools?: ToolCallRecord[];
};

export function ChatMessage({ role, content, files, tools }: Props) {
  const { messageStyle } = useAppearance();
  const { locale } = useI18n();
  const isUser = role === "user";
  const flat = messageStyle === "flat";
  const [translated, setTranslated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const runTranslate = async () => {
    if (!content.trim() || busy) return;
    if (translated) {
      setTranslated(null);
      setErr(null);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetchApi("/translate", {
        method: "POST",
        body: JSON.stringify({ text: content, target: locale }),
      });
      setTranslated(String(res.translated_text || ""));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Translate failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`chat-row flex ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`chat-avatar flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary text-white" : "bg-border"
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div
        className={`chat-bubble max-w-[85%] space-y-2 text-sm leading-relaxed sm:max-w-[75%] ${
          flat
            ? "border-b border-border/70"
            : `rounded-2xl ${
                isUser
                  ? "rounded-tr-md bg-primary text-white"
                  : "rounded-tl-md bg-background/80 ring-1 ring-border"
              }`
        }`}
      >
        {files && files.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {files.map((f) => (
              <li
                key={f.name}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                  isUser && !flat ? "bg-white/15" : "bg-surface text-muted ring-1 ring-border"
                }`}
              >
                <FileText size={11} aria-hidden />
                {f.name}
              </li>
            ))}
          </ul>
        )}
        {tools && tools.length > 0 ? <ToolExecutionList tools={tools} /> : null}
        {content ? <div className="chat-body whitespace-pre-wrap">{content}</div> : null}
        {translated ? (
          <div
            className={`whitespace-pre-wrap border-t pt-2 text-sm ${
              isUser && !flat ? "border-white/20 text-white/90" : "border-border text-muted"
            }`}
          >
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide opacity-80">
              Google Translate → {locale}
            </p>
            {translated}
          </div>
        ) : null}
        {err ? (
          <p className={`text-xs ${isUser && !flat ? "text-white/80" : "text-red-500"}`}>{err}</p>
        ) : null}
        {!isUser && content.trim() ? (
          <button
            type="button"
            onClick={() => void runTranslate()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-alive disabled:opacity-50"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
            {translated ? "Hide translation" : "Translate"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
