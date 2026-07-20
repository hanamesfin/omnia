"use client";

import { useRef, useState } from "react";
import {
  AVATAR_STYLE_OPTIONS,
  fileToAvatarDataUrl,
  readAgentAvatarPref,
  writeAgentAvatarPref,
  type AgentAvatarPref,
  type AgentAvatarStyleId,
} from "@/lib/agent-avatar-prefs";
import { AgentIcon } from "@/components/AgentIcon";
import type { AgentLogo } from "@/lib/agent-logos";

type Props = {
  agentId: string;
  name: string;
  kind?: unknown;
  domain?: string;
  purpose?: string;
  logo?: AgentLogo | null;
  onChange?: (pref: AgentAvatarPref) => void;
};

export function AgentAvatarControls({
  agentId,
  name,
  kind,
  domain,
  purpose,
  logo,
  onChange,
}: Props) {
  const [pref, setPref] = useState<AgentAvatarPref>(() => readAgentAvatarPref(agentId));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (next: AgentAvatarPref) => {
    setPref(next);
    writeAgentAvatarPref(agentId, next);
    onChange?.(next);
  };

  const setStyle = (style: AgentAvatarStyleId) => {
    commit({ ...pref, style });
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    try {
      const uploadDataUrl = await fileToAvatarDataUrl(file);
      commit({ style: "upload", uploadDataUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Agent avatar</h3>
        <p className="mt-1 text-xs text-muted">
          Illustrated character, abstract orb, monogram, or your own image — for this agent only.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <AgentIcon
          name={name}
          kind={kind}
          domain={domain}
          purpose={purpose}
          logo={logo}
          avatarStyle={pref.style}
          uploadUrl={pref.uploadDataUrl}
          size="lg"
        />
        <div className="min-w-0 text-xs text-muted">
          Preview updates instantly. Upload stays on this device unless you sync logos elsewhere.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {AVATAR_STYLE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            aria-pressed={pref.style === opt.id}
            onClick={() => {
              if (opt.id === "upload" && !pref.uploadDataUrl) {
                inputRef.current?.click();
                return;
              }
              setStyle(opt.id);
            }}
            className={`flex min-h-tap flex-col rounded-xl border px-3 py-2.5 text-start transition ${
              pref.style === opt.id
                ? "border-alive/40 bg-alive/10"
                : "border-border bg-background/60 hover:bg-surface"
            }`}
          >
            <span className="text-sm font-medium text-foreground">{opt.label}</span>
            <span className="text-[11px] text-muted">{opt.hint}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            void onFile(e.target.files?.[0] || null);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="min-h-tap rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-navSelected"
        >
          {pref.uploadDataUrl ? "Replace image" : "Upload image"}
        </button>
        {pref.uploadDataUrl && (
          <button
            type="button"
            onClick={() => commit({ style: "illustrated", uploadDataUrl: undefined })}
            className="min-h-tap rounded-full px-3 text-sm text-muted hover:text-foreground"
          >
            Clear upload
          </button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
