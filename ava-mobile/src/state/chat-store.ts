import type { ChatMessage, MessagePart } from "@/core/types";

export type ChatStatus = "ready" | "submitted" | "streaming" | "stopping" | "error";

export interface QueuedPromptItem {
  id: string;
  text: string;
  clientUserMessageId?: string;
  createdAt?: number;
}

export interface SessionChatState {
  messages: ChatMessage[];
  status: ChatStatus;
  error: string | null;
  activeAid: string | null;
  activeTurnId: string | null;
  isStreaming: boolean;
  isStopping: boolean;
  visibleCount: number;
  lastUpdated: number;
  queuedItems: QueuedPromptItem[];
}

type Listener = (state: SessionChatState) => void;

class ChatStore {
  private sessions = new Map<string, SessionChatState>();
  private listeners = new Map<string, Set<Listener>>();
  private offHandles = new Map<string, () => void>();

  getState(sessionId: string): SessionChatState {
    let state = this.sessions.get(sessionId);
    if (!state) {
      state = {
        messages: [],
        status: "ready",
        error: null,
        activeAid: null,
        activeTurnId: null,
        isStreaming: false,
        isStopping: false,
        visibleCount: 30,
        lastUpdated: Date.now(),
        queuedItems: [],
      };
      this.sessions.set(sessionId, state);
    }
    return state;
  }

  setState(sessionId: string, updater: (prev: SessionChatState) => SessionChatState) {
    if (!sessionId) return;
    const prev = this.getState(sessionId);
    const next = updater(prev);
    this.sessions.set(sessionId, next);
    this.notify(sessionId, next);
  }

  subscribe(sessionId: string, listener: Listener): () => void {
    if (!sessionId) return () => {};
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    this.listeners.get(sessionId)!.add(listener);
    // Notify listener immediately with current state
    listener(this.getState(sessionId));
    return () => {
      this.listeners.get(sessionId)?.delete(listener);
    };
  }

  private notify(sessionId: string, state: SessionChatState) {
    const set = this.listeners.get(sessionId);
    if (set) {
      set.forEach((fn) => {
        try {
          fn(state);
        } catch (e) {
          console.warn("[ChatStore] error in subscriber:", e);
        }
      });
    }
  }

  setOffHandle(sessionId: string, off: (() => void) | null) {
    if (!sessionId) return;
    const existing = this.offHandles.get(sessionId);
    if (existing && existing !== off) {
      try {
        existing();
      } catch {}
    }
    if (off) {
      this.offHandles.set(sessionId, off);
    } else {
      this.offHandles.delete(sessionId);
    }
  }

  getOffHandle(sessionId: string) {
    return this.offHandles.get(sessionId);
  }

  cleanup(sessionId: string) {
    const off = this.offHandles.get(sessionId);
    if (off) {
      try {
        off();
      } catch {}
      this.offHandles.delete(sessionId);
    }
  }

  /**
   * Directly updates or appends parts to the assistant message with id `aid`.
   */
  patchAssistant(
    sessionId: string,
    aid: string,
    fn: (parts: MessagePart[]) => MessagePart[]
  ) {
    this.setState(sessionId, (prev) => {
      const idx = prev.messages.findIndex((m) => m.id === aid);
      if (idx !== -1) {
        const nextMessages = [...prev.messages];
        nextMessages[idx] = {
          ...nextMessages[idx]!,
          parts: fn(nextMessages[idx]!.parts),
        };
        return {
          ...prev,
          messages: nextMessages,
          lastUpdated: Date.now(),
        };
      }

      // If no assistant message exists yet for this live id, append one
      return {
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: aid,
            role: "assistant",
            parts: fn([]),
            stats: { startedAt: Date.now() },
          },
        ],
        lastUpdated: Date.now(),
      };
    });
  }
}

export const chatStore = new ChatStore();
