"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronRight,
  Cpu,
  Loader2,
  Paperclip,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import {
  filterModels,
  groupModelsByProvider,
  loadModels,
  modelDisplayName,
  recommendModels,
  type AiModel,
  type ModelRecommendation,
} from "@/lib/models";

type Props = {
  disabled?: boolean;
  uploading?: boolean;
  /** Hide attach action (Create interview has a separate context uploader). */
  showAttach?: boolean;
  selectedModelId?: string | null;
  /** Optional prompt/domain so Suggested ranks by task */
  recommendPrompt?: string;
  recommendDomain?: string;
  onAttach?: () => void;
  onSelectModel: (modelId: string) => void;
  onClearModel?: () => void;
};

type Panel = "root" | "models";

export function ComposerPlusMenu({
  disabled,
  uploading,
  showAttach = true,
  selectedModelId,
  recommendPrompt = "",
  recommendDomain = "general",
  onAttach,
  onSelectModel,
  onClearModel,
}: Props) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("root");
  const [slideDir, setSlideDir] = useState<"forward" | "back">("forward");
  const [models, setModels] = useState<AiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [query, setQuery] = useState("");
  const [suggested, setSuggested] = useState<ModelRecommendation[]>([]);
  const [taskType, setTaskType] = useState<string>("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(
    null
  );

  const close = () => {
    setOpen(false);
    setPanel("root");
    setQuery("");
  };

  const goModels = () => {
    setSlideDir("forward");
    setPanel("models");
  };

  const goRoot = () => {
    setSlideDir("back");
    setPanel("root");
  };

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(352, window.innerWidth - 16);
    let left = r.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    // Prefer opening upward; if not enough room, open below
    const menuHeight = 420;
    const spaceAbove = r.top;
    const openUp = spaceAbove > Math.min(menuHeight, window.innerHeight * 0.45);
    const top = openUp ? r.top - 8 : r.bottom + 8;
    setCoords({
      top,
      left,
      width,
    });
    // Store open direction on the element via data attribute for transform-origin
    if (menuRef.current) {
      menuRef.current.dataset.openDir = openUp ? "up" : "down";
    }
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, panel]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onReposition = () => updatePosition();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || panel !== "models") return;
    setLoadingModels(true);
    Promise.all([
      loadModels({ force: true }),
      recommendModels({
        domain: recommendDomain,
        prompt: recommendPrompt,
        limit: 5,
      }),
    ])
      .then(([catalog, rec]) => {
        setModels(catalog);
        setSuggested(rec.recommendations || []);
        setTaskType(rec.task_type || "");
      })
      .finally(() => setLoadingModels(false));
  }, [open, panel, recommendDomain, recommendPrompt]);

  const selectedLabel = selectedModelId
    ? modelDisplayName(selectedModelId, models.length ? models : undefined)
    : null;

  const filtered = useMemo(() => filterModels(models, query), [models, query]);
  const groups = groupModelsByProvider(filtered);

  const openUp = coords
    ? coords.top < (triggerRef.current?.getBoundingClientRect().top ?? 0)
    : true;

  const menu =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            data-open-dir={openUp ? "up" : "down"}
            style={{
              position: "fixed",
              left: coords.left,
              width: coords.width,
              zIndex: 80,
              ...(openUp
                ? { bottom: window.innerHeight - coords.top, top: "auto" }
                : { top: coords.top, bottom: "auto" }),
            }}
            className="overflow-hidden rounded-2xl bg-surface-elevated shadow-[var(--shadow-float)] ring-1 ring-border backdrop-blur-xl"
          >
            <div
              className="flex w-[200%] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                transform: panel === "models" ? "translateX(-50%)" : "translateX(0%)",
              }}
              data-slide={slideDir}
            >
              {/* Root panel */}
              <div className="w-1/2 shrink-0">
                <ul className="p-1.5">
                  {showAttach && (
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          close();
                          onAttach?.();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-background"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background text-muted ring-1 ring-border">
                          <Paperclip size={16} />
                        </span>
                        <span>
                          <span className="block font-medium">Attach files</span>
                          <span className="block text-xs text-muted">
                            Code, CSV, PDF, images
                          </span>
                        </span>
                      </button>
                    </li>
                  )}
                  <li>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={goModels}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-background"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background text-muted ring-1 ring-border">
                        <Cpu size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">AI model</span>
                        <span className="block truncate text-xs text-muted">
                          {selectedLabel
                            ? `Selected: ${selectedLabel}`
                            : "100+ models · auto-recommend by task"}
                        </span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-muted" />
                    </button>
                  </li>
                  {selectedModelId && onClearModel && (
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onClearModel();
                          close();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted transition hover:bg-background hover:text-foreground"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background ring-1 ring-border">
                          <X size={16} />
                        </span>
                        <span>Use auto-selected model</span>
                      </button>
                    </li>
                  )}
                </ul>
              </div>

              {/* Models panel */}
              <div className="flex w-1/2 shrink-0 max-h-[min(26rem,60vh)] flex-col">
                <div className="flex items-center gap-2 border-b border-border px-2 py-2">
                  <button
                    type="button"
                    onClick={goRoot}
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-background hover:text-foreground"
                  >
                    Back
                  </button>
                  <p className="flex-1 text-xs font-medium uppercase tracking-[0.12em] text-muted">
                    AI models
                  </p>
                  <span className="rounded-md bg-alive/10 px-1.5 py-0.5 text-[10px] font-semibold text-alive">
                    {models.length || "…"}
                  </span>
                </div>
                <div className="border-b border-border px-2 py-2">
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search providers, coding, vision…"
                    className="w-full rounded-xl bg-background px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-alive/40"
                    autoFocus={panel === "models"}
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-1.5">
                  {loadingModels ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
                      <Loader2 size={16} className="animate-spin" />
                      Loading models…
                    </div>
                  ) : (
                    <>
                      {!query && suggested.length > 0 && (
                        <div className="mb-3">
                          <p className="mb-1 flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                            <Sparkles size={11} aria-hidden />
                            Suggested
                            {taskType ? ` · ${taskType.replaceAll("_", " ")}` : ""}
                          </p>
                          <ul>
                            {suggested.map((m) => {
                              const active = m.name === selectedModelId;
                              return (
                                <li key={`sug-${m.name}`}>
                                  <button
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={active}
                                    onClick={() => {
                                      onSelectModel(m.name);
                                      close();
                                    }}
                                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                                      active
                                        ? "bg-alive/10 text-alive"
                                        : "hover:bg-background"
                                    }`}
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block font-medium">
                                        {m.display_name}
                                      </span>
                                      <span className="block truncate text-[10px] text-muted">
                                        {m.reason || m.provider}
                                      </span>
                                    </span>
                                    {active && <Check size={16} className="shrink-0" />}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      {groups.map((group) => (
                        <div key={group.provider} className="mb-2">
                          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                            {group.label}
                          </p>
                          <ul>
                            {group.models.map((m) => {
                              const active = m.name === selectedModelId;
                              const unavailable = m.configured === false;
                              return (
                                <li key={m.name}>
                                  <button
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={active}
                                    disabled={unavailable}
                                    title={m.configuration_hint || undefined}
                                    onClick={() => {
                                      onSelectModel(m.name);
                                      close();
                                    }}
                                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                                      active
                                        ? "bg-alive/10 text-alive"
                                        : unavailable
                                          ? "cursor-not-allowed opacity-45"
                                          : "hover:bg-background"
                                    }`}
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block font-medium">
                                        {m.display_name}
                                      </span>
                                      <span className="block truncate font-mono text-[10px] text-muted">
                                        {unavailable
                                          ? m.free
                                            ? "Free · OpenRouter key required"
                                            : "API key required"
                                          : m.free
                                            ? "Free · rate limits apply"
                                            : m.capabilities?.slice(0, 2).join(" · ") ||
                                              m.name}
                                      </span>
                                    </span>
                                    {active && <Check size={16} className="shrink-0" />}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                      {groups.length === 0 && !loadingModels && (
                        <p className="px-3 py-8 text-center text-sm text-muted">
                          No models match.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Add"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled || uploading}
        onClick={() => {
          if (open) {
            close();
          } else {
            setPanel("root");
            setOpen(true);
          }
        }}
        className={`inline-flex min-h-tap min-w-tap items-center justify-center rounded-2xl transition disabled:opacity-50 ${
          open || selectedModelId
            ? "bg-alive/10 text-alive"
            : "text-muted hover:bg-surface hover:text-alive"
        }`}
      >
        {uploading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Plus size={18} strokeWidth={2.25} />
        )}
      </button>
      {menu}
    </div>
  );
}
