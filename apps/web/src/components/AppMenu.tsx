"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  Activity,
  Blocks,
  BookOpen,
  Code2,
  Compass,
  FolderOpen,
  HelpCircle,
  Home,
  Languages,
  LayoutDashboard,
  Menu,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,
  Palette,
  PanelLeftClose,
  PlusCircle,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Star,
  User,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { AppearanceControls } from "@/components/AppearanceControls";
import { useI18n } from "@/components/I18nProvider";
import { THEMES, type ThemeId } from "@/lib/themes";
import { API_BASE, fetchApi } from "@/lib/api";
import { hasSession, readSessionToken, rejectBlockedSession, redirectToGate } from "@/lib/auth-session";
import {
  CHAT_HISTORY_EVENT,
  loadChatThreads,
  newChatThreadId,
  type StoredChatThread,
} from "@/lib/chat-history";

type SidebarAccount = {
  id?: string;
  display_name: string;
  email: string;
};

type MenuDef = {
  id: string;
  href: string | null;
  labelKey: string;
  icon: LucideIcon;
};

const ICON_STROKE = 1.5;

const MENU_ITEMS: MenuDef[] = [
  { id: "explore", href: "/explore", labelKey: "menu.explore", icon: Compass },
  { id: "create", href: "/create", labelKey: "menu.create", icon: PlusCircle },
  { id: "yours", href: "/yours", labelKey: "menu.yours", icon: Star },
  { id: "appearance", href: null, labelKey: "menu.appearance", icon: Palette },
  { id: "language", href: "/language", labelKey: "menu.language", icon: Languages },
  { id: "knowledge", href: "/knowledge", labelKey: "menu.knowledge", icon: FolderOpen },
  { id: "activity", href: "/activity", labelKey: "menu.activity", icon: Activity },
  { id: "evaluations", href: "/evaluations", labelKey: "menu.evaluations", icon: BookOpen },
  { id: "account", href: "/account", labelKey: "menu.account", icon: User },
  { id: "cursor", href: "/integrations/cursor", labelKey: "menu.cursor", icon: Code2 },
  { id: "help", href: "/help", labelKey: "menu.help", icon: HelpCircle },
  { id: "privacy", href: "/privacy", labelKey: "menu.privacy", icon: Shield },
];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Desktop: always-visible App Store rail */
  persistent?: boolean;
  /** Icon-only rail */
  collapsed?: boolean;
  /** Explicit width for expanded desktop rail */
  widthPx?: number;
  /** Desktop: hide the sidebar rail */
  onHide?: () => void;
};

export function AppSidebar({
  open,
  onClose,
  persistent = false,
  collapsed = false,
  widthPx,
  onHide,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [panel, setPanel] = useState<"main" | "appearance">("main");
  const [search, setSearch] = useState("");
  const [agentBrand, setAgentBrand] = useState("");
  const [productPages, setProductPages] = useState<Array<{ id: string; label: string }>>([]);
  const [isChatProduct, setIsChatProduct] = useState(false);
  const [chatThreads, setChatThreads] = useState<StoredChatThread[]>([]);
  const [account, setAccount] = useState<SidebarAccount | null>(null);
  const navId = useId();
  const agentRoute = pathname.match(/^\/(?:app|yours)\/([^/]+)/);
  const agentId = agentRoute?.[1] ? decodeURIComponent(agentRoute[1]) : "";
  const productRoute = pathname.match(/^\/app\/([^/]+)/);
  const productAgentId = productRoute?.[1] ? decodeURIComponent(productRoute[1]) : "";
  const isAgentPage = Boolean(agentId);
  const coreMenuItems = isAgentPage
    ? MENU_ITEMS.filter((item) => !["explore", "create", "yours"].includes(item.id))
    : MENU_ITEMS;
  const agentItems = agentId
    ? [
        {
          id: "personalize",
          href: `/yours/${encodeURIComponent(agentId)}?tab=personalize`,
          label: "Personalize",
          icon: Wand2,
        },
        {
          id: "advance",
          href: `/yours/${encodeURIComponent(agentId)}?tab=advance`,
          label: "Advance",
          icon: Sparkles,
        },
        {
          id: "update",
          href: `/yours/${encodeURIComponent(agentId)}?tab=update`,
          label: "Update",
          icon: Settings2,
        },
      ]
    : [];

  useEffect(() => {
    let cancelled = false;
    const token = typeof window !== "undefined" ? readSessionToken() : null;
    if (!token) {
      setAccount(null);
      return;
    }
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          // Do not clear a live session on transient /auth/me failures — only
          // rejectBlockedSession / explicit logout / definitive API 401s do.
          throw new Error("session unavailable");
        }
        return response.json() as Promise<SidebarAccount>;
      })
      .then((data) => {
        if (cancelled) return;
        if (rejectBlockedSession(data)) {
          setAccount(null);
          redirectToGate();
          return;
        }
        setAccount({
          id: String(data.id || "").trim() || undefined,
          display_name: String(data.display_name || "").trim() || String(data.email || "").trim(),
          email: String(data.email || "").trim(),
        });
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    if (!productAgentId) {
      setAgentBrand("");
      setProductPages([]);
      setIsChatProduct(false);
      return;
    }
    fetchApi(`/agents/${encodeURIComponent(productAgentId)}`, { silentAuth: true })
      .then((agent) => {
        if (cancelled) return;
        setAgentBrand(String(agent?.name || "AI Agent"));
        setIsChatProduct(String(agent?.interface_schema?.mode || "").toLowerCase() === "chat");
        const ia = agent?.product_blueprint?.information_architecture || {};
        const source =
          Array.isArray(ia.nav) && ia.nav.length > 0
            ? ia.nav
            : Array.isArray(ia.pages)
              ? ia.pages
              : [];
        setProductPages(
          source
            .map((page: { id?: unknown; label?: unknown }) => ({
              id: String(page?.id || ""),
              label: String(page?.label || page?.id || ""),
            }))
            .filter((page: { id: string }) => page.id)
        );
      })
      .catch(() => {
        if (!cancelled) {
          setAgentBrand("AI Agent");
          setProductPages([]);
          setIsChatProduct(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [productAgentId]);

  useEffect(() => {
    if (!productAgentId || !isChatProduct) {
      setChatThreads([]);
      return;
    }
    const refresh = () => setChatThreads(loadChatThreads(productAgentId));
    const onHistory = (event: Event) => {
      const detail = (event as CustomEvent<{ agentId?: string }>).detail;
      if (!detail?.agentId || detail.agentId === productAgentId) refresh();
    };
    refresh();
    window.addEventListener(CHAT_HISTORY_EVENT, onHistory);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHAT_HISTORY_EVENT, onHistory);
      window.removeEventListener("storage", refresh);
    };
  }, [isChatProduct, productAgentId]);

  useEffect(() => {
    setPanel("main");
    if (!persistent) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open && !persistent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (panel === "appearance") setPanel("main");
        else if (!persistent) onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    if (!persistent && open) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (!persistent) document.body.style.overflow = "";
    };
  }, [open, panel, onClose, persistent]);

  const core = THEMES.filter((th) => th.group === "core");
  const atmospheres = THEMES.filter((th) => th.group === "atmospheres");

  const visible = persistent || open;
  const iconsOnly = persistent && collapsed && panel === "main";
  const appearanceWide = panel === "appearance";

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (q) router.push(`/explore?q=${encodeURIComponent(q)}`);
    else router.push("/explore");
    onClose();
  };

  const startNewChat = () => {
    if (!productAgentId) return;
    const firstPage = productPages[0]?.id || "workspace";
    router.push(
      `/app/${encodeURIComponent(productAgentId)}/${encodeURIComponent(firstPage)}?thread=${encodeURIComponent(newChatThreadId())}`
    );
    onClose();
  };

  return (
    <>
      {!persistent && (
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label={t("shell.closeMenu")}
          aria-hidden={!open}
          className={`fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px] transition-opacity duration-300 ease-soft ${
            open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={onClose}
        />
      )}

      <aside
        id={navId}
        aria-label="OMNIA menu"
        aria-hidden={!visible}
        data-collapsed={iconsOnly ? "true" : "false"}
        className={`app-store-sidebar z-[80] flex h-dvh min-h-0 shrink-0 flex-col ${
          persistent && appearanceWide
            ? "fixed inset-y-0 left-0 shadow-float"
            : persistent
              ? "relative h-full max-h-dvh"
              : `fixed inset-y-0 left-0 h-dvh w-[min(18rem,92vw)] max-w-[100vw] shadow-float transition-[transform,opacity] duration-300 ease-spring ${
                  open
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-full opacity-0 pointer-events-none"
                }`
        }`}
        style={
          persistent
            ? { width: appearanceWide ? Math.max(widthPx ?? 280, 280) : widthPx ?? "var(--sidebar-width, 17rem)" }
            : undefined
        }
      >
        <div
          className={`flex h-full min-h-0 w-full flex-col overflow-hidden ${
            persistent
              ? ""
              : "pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]"
          }`}
        >
          <div
            className={`flex h-14 shrink-0 items-center border-b border-border sm:h-[3.75rem] ${
              iconsOnly
                ? onHide
                  ? "justify-between gap-1 px-2"
                  : "justify-center px-2"
                : "justify-between gap-2 px-4"
            }`}
          >
            <Link
              href={productAgentId ? `/app/${encodeURIComponent(productAgentId)}` : "/"}
              className={`font-display font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80 ${
                iconsOnly ? "text-base" : "text-lg"
              }`}
              onClick={onClose}
              title={agentBrand || "OMNIA"}
            >
              {iconsOnly
                ? (agentBrand || "OMNIA").slice(0, 1).toUpperCase()
                : agentBrand || "OMNIA"}
            </Link>
            {!persistent && (
              <button
                type="button"
                className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-full text-muted hover:bg-navSelected hover:text-foreground lg:hidden"
                aria-label={t("shell.closeMenu")}
                onClick={onClose}
              >
                <X size={18} strokeWidth={ICON_STROKE} />
              </button>
            )}
            {persistent && onHide && (
              <button
                type="button"
                className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-full text-muted hover:bg-navSelected hover:text-foreground"
                aria-label={t("shell.hideSidebar")}
                title={t("shell.hideSidebar")}
                onClick={onHide}
              >
                <PanelLeftClose size={18} strokeWidth={ICON_STROKE} />
              </button>
            )}
          </div>

          {panel === "main" ? (
            <>
              {!iconsOnly && (
                <form onSubmit={onSearchSubmit} className="shrink-0 px-3 pt-4">
                  <label htmlFor="sidebar-search" className="sr-only">
                    Search
                  </label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                      aria-hidden
                    />
                    <input
                      id="sidebar-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search"
                      className="app-store-sidebar-search w-full rounded-xl py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/35"
                    />
                  </div>
                </form>
              )}

              {iconsOnly && (
                <div className="flex justify-center px-2 pt-3">
                  <Link
                    href={isAgentPage ? "/" : "/explore"}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-navSelected hover:text-foreground"
                    aria-label={isAgentPage ? "OMNIA" : "Search"}
                    onClick={onClose}
                  >
                    {isAgentPage ? (
                      <Home size={17} strokeWidth={ICON_STROKE} />
                    ) : (
                      <Search size={17} strokeWidth={ICON_STROKE} />
                    )}
                  </Link>
                </div>
              )}

              <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3" aria-label="Primary">
                <ul className={`flex flex-col ${iconsOnly ? "items-center gap-1" : "gap-0.5"}`}>
                  {isChatProduct && productAgentId ? (
                    <ChatProductNavigation
                      agentId={productAgentId}
                      pathname={pathname}
                      activeThreadId={searchParams.get("thread") || ""}
                      threads={chatThreads}
                      iconsOnly={iconsOnly}
                      onNewChat={startNewChat}
                      onNavigate={onClose}
                    />
                  ) : (
                    <>
                  {agentItems.length > 0 && (
                    <>
                      <li
                        aria-hidden
                        className={
                          iconsOnly
                            ? "my-1 h-px w-7 bg-border"
                            : "px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted"
                        }
                      >
                        {!iconsOnly ? "Agent" : null}
                      </li>
                      {agentItems.map((item) => {
                        const Icon = item.icon;
                        const active =
                          pathname.startsWith(`/yours/${agentId}`) &&
                          searchParams.get("tab") === item.id;
                        const className = iconsOnly
                          ? `inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                              active
                                ? "bg-navSelected text-foreground"
                                : "text-muted hover:bg-navSelected hover:text-foreground"
                            }`
                          : `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors ${
                              active
                                ? "bg-navSelected text-foreground"
                                : "text-muted hover:bg-navSelected hover:text-foreground"
                            }`;
                        return (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              className={className}
                              onClick={onClose}
                              title={item.label}
                              aria-label={iconsOnly ? item.label : undefined}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                                <Icon size={17} strokeWidth={ICON_STROKE} aria-hidden />
                              </span>
                              {!iconsOnly && (
                                <span className="min-w-0 flex-1 truncate text-[14px] font-medium tracking-tight">
                                  {item.label}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                      <li aria-hidden className={iconsOnly ? "my-1 h-px w-7 bg-border" : "my-1 border-t border-border"} />
                    </>
                  )}
                  {isAgentPage && (
                    <li>
                      <Link
                        href="/"
                        className={
                          iconsOnly
                            ? "inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-navSelected hover:text-foreground"
                            : "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-muted transition-colors hover:bg-navSelected hover:text-foreground"
                        }
                        onClick={onClose}
                        title="OMNIA"
                        aria-label={iconsOnly ? "OMNIA" : undefined}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                          <Home size={17} strokeWidth={ICON_STROKE} aria-hidden />
                        </span>
                        {!iconsOnly && (
                          <span className="min-w-0 flex-1 truncate text-[14px] font-medium tracking-tight">
                            OMNIA
                          </span>
                        )}
                      </Link>
                    </li>
                  )}
                  {coreMenuItems.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.href != null &&
                      (pathname === item.href || pathname.startsWith(`${item.href}/`));
                    const className = iconsOnly
                      ? `inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                          active
                            ? "bg-navSelected text-foreground"
                            : "text-muted hover:bg-navSelected hover:text-foreground"
                        }`
                      : `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors ${
                          active
                            ? "bg-navSelected text-foreground"
                            : "text-muted hover:bg-navSelected hover:text-foreground"
                        }`;
                    const body = (
                      <>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                          <Icon size={17} strokeWidth={ICON_STROKE} aria-hidden />
                        </span>
                        {!iconsOnly && (
                          <span className="min-w-0 flex-1 truncate text-[14px] font-medium tracking-tight">
                            {t(item.labelKey)}
                          </span>
                        )}
                      </>
                    );
                    if (item.id === "appearance") {
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (iconsOnly) {
                                /* expand appearance in a floating sense: temporarily use expanded panel */
                                setPanel("appearance");
                              } else {
                                setPanel("appearance");
                              }
                            }}
                            className={className}
                            title={t(item.labelKey)}
                            aria-label={t(item.labelKey)}
                          >
                            {body}
                          </button>
                        </li>
                      );
                    }
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href!}
                          className={className}
                          onClick={onClose}
                          title={t(item.labelKey)}
                          aria-label={iconsOnly ? t(item.labelKey) : undefined}
                        >
                          {body}
                        </Link>
                      </li>
                    );
                  })}
                  {productAgentId && productPages.length > 0 && (
                    <>
                      <li
                        aria-hidden
                        className={
                          iconsOnly
                            ? "my-1 h-px w-7 bg-border"
                            : "my-1 border-t border-border"
                        }
                      />
                      {productPages.map((page) => {
                        const href = `/app/${encodeURIComponent(productAgentId)}/${encodeURIComponent(page.id)}`;
                        const active = pathname === href;
                        const className = iconsOnly
                          ? `inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                              active
                                ? "bg-navSelected text-foreground"
                                : "text-muted hover:bg-navSelected hover:text-foreground"
                            }`
                          : `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors ${
                              active
                                ? "bg-navSelected text-foreground"
                                : "text-muted hover:bg-navSelected hover:text-foreground"
                            }`;
                        return (
                          <li key={page.id}>
                            <Link
                              href={href}
                              className={className}
                              onClick={onClose}
                              title={page.label}
                              aria-label={iconsOnly ? page.label : undefined}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                                <LayoutDashboard size={17} strokeWidth={ICON_STROKE} aria-hidden />
                              </span>
                              {!iconsOnly && (
                                <span className="min-w-0 flex-1 truncate text-[14px] font-medium tracking-tight">
                                  {page.label}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </>
                  )}
                    </>
                  )}
                </ul>
              </nav>

              <div className={`shrink-0 border-t border-border p-3 ${iconsOnly ? "flex justify-center" : ""}`}>
                {(() => {
                  const sessionLive = hasSession();
                  const signedIn = Boolean(account?.display_name || account?.email) || sessionLive;
                  const label = account?.display_name || account?.email || (sessionLive ? "Account" : "Sign in");
                  const initials = account?.display_name || account?.email
                    ? (account!.display_name || account!.email)
                        .split(/[\s@.]+/)
                        .filter(Boolean)
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : sessionLive
                      ? "…"
                      : "?";
                  const href = signedIn ? "/account" : "/sign-in";
                  const subtitle = account?.email || (sessionLive ? "Open account" : "Open account");
                  return (
                    <Link
                      href={href}
                      onClick={onClose}
                      className={`flex w-full items-center rounded-xl transition hover:bg-navSelected ${
                        iconsOnly ? "justify-center p-1.5" : "gap-3 px-2 py-2"
                      }`}
                      title={signedIn ? `${label} — Account` : "Sign in"}
                      aria-label={signedIn ? `Account for ${label}` : "Sign in"}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-alive text-xs font-bold text-on-alive">
                        {initials}
                      </span>
                      {!iconsOnly && (
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {label}
                          </span>
                          <span className="block truncate text-[11px] text-muted">
                            {subtitle}
                          </span>
                        </span>
                      )}
                    </Link>
                  );
                })()}
              </div>
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-4 text-foreground">
              <div className="mb-4 flex items-center justify-between gap-2 px-1">
                <button
                  type="button"
                  onClick={() => setPanel("main")}
                  className="text-sm text-muted hover:text-foreground"
                >
                  {t("menu.back")}
                </button>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                  {t("menu.appearance")}
                </p>
              </div>
              <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted">Core</p>
              <div className="grid grid-cols-1 gap-2">
                {core.map((th) => (
                  <ThemeChip
                    key={th.id}
                    id={th.id}
                    label={th.label}
                    swatches={th.swatches}
                    selected={theme === th.id}
                    onSelect={setTheme}
                  />
                ))}
              </div>
              <p className="mt-5 px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted">
                Atmospheres
              </p>
              <div className="grid grid-cols-1 gap-2">
                {atmospheres.map((th) => (
                  <ThemeChip
                    key={th.id}
                    id={th.id}
                    label={th.label}
                    swatches={th.swatches}
                    selected={theme === th.id}
                    onSelect={setTheme}
                  />
                ))}
              </div>
              <div className="my-5 border-t border-border" />
              <AppearanceControls />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function ChatProductNavigation({
  agentId,
  pathname,
  activeThreadId,
  threads,
  iconsOnly,
  onNewChat,
  onNavigate,
}: {
  agentId: string;
  pathname: string;
  activeThreadId: string;
  threads: StoredChatThread[];
  iconsOnly: boolean;
  onNewChat: () => void;
  onNavigate: () => void;
}) {
  const itemClass = (active = false) =>
    iconsOnly
      ? `inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
          active ? "bg-navSelected text-foreground" : "text-muted hover:bg-navSelected hover:text-foreground"
        }`
      : `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors ${
          active ? "bg-navSelected text-foreground" : "text-muted hover:bg-navSelected hover:text-foreground"
        }`;

  const primary = [
    { label: "Discover", href: "/explore", icon: Compass },
    { label: "Library", href: "/knowledge", icon: BookOpen },
    {
      label: "Plugins",
      href: `/yours/${encodeURIComponent(agentId)}?tab=advance`,
      icon: Blocks,
    },
    {
      label: "Code",
      href: activeThreadId
        ? `${pathname}?thread=${encodeURIComponent(activeThreadId)}`
        : pathname,
      icon: Code2,
    },
    { label: "More", href: "/", icon: MoreHorizontal },
  ];

  return (
    <>
      <li>
        <button type="button" onClick={onNewChat} className={itemClass()} title="New chat">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center">
            <MessageSquarePlus size={17} strokeWidth={ICON_STROKE} aria-hidden />
          </span>
          {!iconsOnly && <span className="text-[14px] font-medium">New chat</span>}
        </button>
      </li>
      {primary.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.label}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={itemClass(false)}
              title={item.label}
              aria-label={iconsOnly ? item.label : undefined}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                <Icon size={17} strokeWidth={ICON_STROKE} aria-hidden />
              </span>
              {!iconsOnly && <span className="truncate text-[14px] font-medium">{item.label}</span>}
            </Link>
          </li>
        );
      })}

      {threads.length > 0 && (
        <>
          <li
            aria-hidden
            className={
              iconsOnly
                ? "my-1 h-px w-7 bg-border"
                : "px-3 pb-1 pt-5 text-[11px] font-semibold text-muted"
            }
          >
            {!iconsOnly ? "Chats" : null}
          </li>
          {threads.map((thread) => {
            const href = `${pathname}?thread=${encodeURIComponent(thread.id)}`;
            return (
              <li key={thread.id}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={itemClass(activeThreadId === thread.id)}
                  title={thread.title}
                  aria-label={iconsOnly ? thread.title : undefined}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                    <MessageSquare size={16} strokeWidth={ICON_STROKE} aria-hidden />
                  </span>
                  {!iconsOnly && (
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {thread.title}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </>
      )}
    </>
  );
}

export function SidebarToggle({
  open,
  onToggle,
  controlsId,
}: {
  open: boolean;
  onToggle: () => void;
  controlsId?: string;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controlsId}
      onClick={onToggle}
      className="app-store-menu-toggle inline-flex min-h-tap min-w-tap items-center justify-center rounded-xl text-foreground shadow-soft lg:hidden"
      aria-label={open ? t("shell.closeMenu") : t("shell.openMenu")}
    >
      {open ? <X size={20} strokeWidth={ICON_STROKE} /> : <Menu size={20} strokeWidth={ICON_STROKE} />}
    </button>
  );
}

function ThemeChip({
  id,
  label,
  swatches,
  selected,
  onSelect,
}: {
  id: ThemeId;
  label: string;
  swatches: [string, string, string];
  selected: boolean;
  onSelect: (id: ThemeId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      className={`flex min-h-tap items-center gap-3 rounded-xl border px-3 py-2.5 text-start ${
        selected
          ? "border-accent/35 bg-navSelected"
          : "border-border bg-canvas hover:bg-navSelected"
      }`}
    >
      <span className="flex gap-1" aria-hidden>
        {swatches.map((c) => (
          <span
            key={c}
            className="h-3.5 w-3.5 rounded-full border border-black/20"
            style={{ background: c }}
          />
        ))}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}

/** @deprecated — use AppSidebar */
export const AppMenu = AppSidebar;
