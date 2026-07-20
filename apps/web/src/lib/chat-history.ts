export type StoredChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StoredChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: StoredChatMessage[];
};

export const CHAT_HISTORY_EVENT = "omnia:chat-history-updated";

function storageKey(agentId: string) {
  return `omnia:chat-history:${agentId}`;
}

export function loadChatThreads(agentId: string): StoredChatThread[] {
  if (typeof window === "undefined" || !agentId) return [];
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(agentId)) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter((thread): thread is StoredChatThread => {
        return Boolean(
          thread &&
            typeof thread.id === "string" &&
            typeof thread.title === "string" &&
            Array.isArray(thread.messages)
        );
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 30);
  } catch {
    return [];
  }
}

export function loadChatThread(agentId: string, threadId: string): StoredChatThread | null {
  return loadChatThreads(agentId).find((thread) => thread.id === threadId) || null;
}

export function saveChatThread(agentId: string, thread: StoredChatThread) {
  if (typeof window === "undefined" || !agentId) return;
  const threads = loadChatThreads(agentId).filter((item) => item.id !== thread.id);
  localStorage.setItem(storageKey(agentId), JSON.stringify([thread, ...threads].slice(0, 30)));
  window.dispatchEvent(new CustomEvent(CHAT_HISTORY_EVENT, { detail: { agentId } }));
}

export function newChatThreadId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
