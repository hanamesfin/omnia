"use client";

import { useSyncExternalStore } from "react";
import {
  AGENT_AVATAR_STORAGE_KEY,
  readAgentAvatarPref,
  type AgentAvatarPref,
} from "@/lib/agent-avatar-prefs";

const DEFAULT_PREF: AgentAvatarPref = { style: "illustrated" };

/** Stable snapshots — useSyncExternalStore requires referential equality when data unchanged. */
const cache = new Map<string, AgentAvatarPref>();

function samePref(a: AgentAvatarPref, b: AgentAvatarPref): boolean {
  return a.style === b.style && a.uploadDataUrl === b.uploadDataUrl;
}

function getCached(agentId: string): AgentAvatarPref {
  const next = readAgentAvatarPref(agentId);
  const prev = cache.get(agentId);
  if (prev && samePref(prev, next)) return prev;
  cache.set(agentId, next);
  return next;
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === AGENT_AVATAR_STORAGE_KEY) {
      cache.clear();
      cb();
    }
  };
  const onLocal = () => {
    cache.clear();
    cb();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("omnia-agent-avatar", onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("omnia-agent-avatar", onLocal);
  };
}

/** Reactively read per-agent avatar prefs (localStorage). */
export function useAgentAvatar(agentId: string | undefined): AgentAvatarPref {
  return useSyncExternalStore(
    subscribe,
    () => (agentId ? getCached(agentId) : DEFAULT_PREF),
    () => DEFAULT_PREF
  );
}
