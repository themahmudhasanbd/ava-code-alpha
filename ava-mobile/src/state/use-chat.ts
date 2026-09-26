import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  addPromptToQueue,
  attachToRunningTurn,
  deleteQueuedPrompt,
  interruptTurn,
  listQueuedPrompts,
  runTurn,
  startQueuedPrompt,
  type TurnHandlers,
} from "@/core/api/chat";
import { startSession } from "@/core/api/sessions";
import { formatCoreError } from "@/core/errors";
import type { ChatMessage, MessagePart } from "@/core/types";
import { useAva } from "./ava-provider";
import { keys, useSessionHistory } from "./queries";
import { APP } from "@/config/app";
import { chatStore, type ChatStatus, type QueuedPromptItem } from "./chat-store";
import { backgroundSync } from "@/core/background-sync";

export type { ChatStatus, QueuedPromptItem };

/** Owns the transcript for the active session: history + live streaming turn synced through chatStore. */
export function useChat(explicitSessionId?: string | null) {
  const {
    rpc,
    status: rpcStatus,
    activeSessionId,
    setActiveSessionId,
    setSessionRunning,
    modelId,
    effort,
    sandbox,
    workingCwd,
    defaultCwd,
  } = useAva();

  const currentSessionId =
    (explicitSessionId && explicitSessionId.trim()) || activeSessionId || null;

  const qc = useQueryClient();
  const history = useSessionHistory(currentSessionId);

  // Initialize from central chatStore
  const initialStore = currentSessionId ? chatStore.getState(currentSessionId) : null;
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialStore?.messages ?? []);
  const [status, setStatus] = useState<ChatStatus>(() => initialStore?.status ?? "ready");
  const [error, setError] = useState<string | null>(() => initialStore?.error ?? null);
  const [visibleCount, setVisibleCount] = useState(() => initialStore?.visibleCount ?? 30);
  const [queuedPrompts, setQueuedPrompts] = useState<QueuedPromptItem[]>(() => initialStore?.queuedItems ?? []);

  const allHistoryRef = useRef<ChatMessage[]>([]);
  const offRef = useRef<(() => void) | null>(null);
  const isStreamingRef = useRef(initialStore?.isStreaming ?? false);
  const statusRef = useRef<ChatStatus>(initialStore?.status ?? "ready");
  const activeAidRef = useRef<string | null>(initialStore?.activeAid ?? null);
  const currentSessionRef = useRef(currentSessionId);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to fetch server queue items
  const refreshQueue = useCallback(
    async (threadId: string) => {
      if (!rpc || !threadId) return [];
      try {
        const items = await listQueuedPrompts(rpc, threadId);
        chatStore.setState(threadId, (prev) => ({
          ...prev,
          queuedItems: items,
        }));
        setQueuedPrompts(items);
        return items;
      } catch {
        return [];
      }
    },
    [rpc]
  );

  // Subscribe to central chat store for instant live synchronization across screens
  useEffect(() => {
    if (!currentSessionId) return;

    const unsubscribe = chatStore.subscribe(currentSessionId, (st) => {
      setMessages(st.messages);
      setStatus(st.status);
      setError(st.error);
      setQueuedPrompts(st.queuedItems);
      isStreamingRef.current = st.isStreaming;
      statusRef.current = st.status;
      activeAidRef.current = st.activeAid;
    });

    // Refresh queued prompts initially
    if (rpc && rpcStatus === "online") {
      void refreshQueue(currentSessionId);
    }

    return () => {
      unsubscribe();
    };
  }, [currentSessionId, rpc, rpcStatus, refreshQueue]);

  // Register background sync handler to refresh caches on foreground
  useEffect(() => {
    const unsubSync = backgroundSync.registerSyncListener((sessionIds) => {
      qc.invalidateQueries({ queryKey: keys.sessions });
      sessionIds.forEach((id) => {
        qc.invalidateQueries({ queryKey: keys.session(id) });
      });
      if (currentSessionId && sessionIds.includes(currentSessionId)) {
        void refreshQueue(currentSessionId);
      }
    });
    return unsubSync;
  }, [qc, currentSessionId, refreshQueue]);

  // When RPC status comes back online, immediately refetch
  useEffect(() => {
    if (rpcStatus === "online" && currentSessionId) {
      void history.refetch();
      void refreshQueue(currentSessionId);
    }
  }, [rpcStatus, currentSessionId, history, refreshQueue]);

  const createHandlers = useCallback(
    (aid: string, threadId: string): TurnHandlers => ({
      onTurnStarted: (turnId) => {
        chatStore.setState(threadId, (prev) => ({
          ...prev,
          activeTurnId: turnId,
        }));
      },
      onQueueChanged: () => {
        void refreshQueue(threadId);
      },
      onPart: (p) => {
        isStreamingRef.current = true;
        statusRef.current = "streaming";
        setSessionRunning(threadId, true);

        chatStore.setState(threadId, (prev) => ({
          ...prev,
          status: "streaming",
          isStreaming: true,
          isStopping: false,
          activeAid: aid,
        }));

        chatStore.patchAssistant(threadId, aid, (parts) => {
          const i = parts.findIndex(
            (x) => x.id === p.id || (p.kind === "text" && x.id === "stream_text")
          );
          if (i === -1) return [...parts, p];
          const next = [...parts];
          next[i] = {
            ...p,
            text: p.text || parts[i]!.text,
            output: p.output || parts[i]!.output,
          };
          return next;
        });
      },
      onDelta: (itemId, delta, kind) => {
        isStreamingRef.current = true;
        statusRef.current = "streaming";
        setSessionRunning(threadId, true);

        chatStore.setState(threadId, (prev) => ({
          ...prev,
          status: "streaming",
          isStreaming: true,
          isStopping: false,
          activeAid: aid,
        }));

        chatStore.patchAssistant(threadId, aid, (parts) => {
          const effectiveId =
            itemId || (kind === "output" ? "terminal_out" : "stream_text");
          const i = parts.findIndex((x) => x.id === effectiveId);
          if (kind === "output") {
            if (i === -1) {
              return [
                ...parts,
                {
                  id: effectiveId,
                  kind: "tool",
                  text: "",
                  toolName: "Terminal",
                  input: "",
                  output: delta,
                  status: "running",
                },
              ];
            }
            const next = [...parts];
            next[i] = { ...next[i]!, output: (next[i]!.output ?? "") + delta };
            return next;
          }
          if (i === -1) {
            return [...parts, { id: effectiveId, kind, text: delta, status: "running" }];
          }
          const next = [...parts];
          next[i] = { ...next[i]!, text: (next[i]!.text || "") + delta };
          return next;
        });
      },
      onPlan: (steps, title) => {
        const pid = title === "Goal" ? "goal" : "plan";
        chatStore.patchAssistant(threadId, aid, (parts) => {
          const part: MessagePart = {
            id: pid,
            kind: "plan",
            text: title ?? "Plan",
            status: "running",
            meta: { steps },
          };
          const i = parts.findIndex((x) => x.id === pid);
          if (i === -1) return [...parts, part];
          const next = [...parts];
          next[i] = part;
          return next;
        });
      },
      onNotice: (noticeText, tone) => {
        chatStore.patchAssistant(threadId, aid, (parts) =>
          parts.some((p) => p.kind === "notice" && p.text === noticeText)
            ? parts
            : [
                ...parts,
                {
                  id: `n_${Date.now()}`,
                  kind: "notice",
                  text: noticeText,
                  status: "done",
                  meta: { tone },
                },
              ]
        );
      },
      onStats: (stats) => {
        chatStore.setState(threadId, (prev) => ({
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === aid ? { ...msg, stats: { ...msg.stats, ...stats } } : msg
          ),
        }));
      },
      onDone: (err, info) => {
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current);
          safetyTimeoutRef.current = null;
        }

        isStreamingRef.current = false;
        statusRef.current = err ? "error" : "ready";
        activeAidRef.current = null;
        setSessionRunning(threadId, false);

        chatStore.patchAssistant(threadId, aid, (parts) => {
          const next = parts.map((p) =>
            p.status === "running"
              ? { ...p, status: err ? ("error" as const) : ("done" as const) }
              : p
          );
          const note = err ?? info;
          if (!note) return next;
          return [
            ...next,
            {
              id: `end_${Date.now()}`,
              kind: "notice" as const,
              text: note,
              status: "done" as const,
              meta: { tone: err ? ("error" as const) : ("info" as const) },
            },
          ];
        });

        chatStore.setState(threadId, (prev) => {
          const updatedMessages = prev.messages.map((msg) =>
            msg.id === aid && msg.stats?.startedAt && !msg.stats.durationMs
              ? {
                  ...msg,
                  stats: {
                    ...msg.stats,
                    durationMs: Date.now() - msg.stats.startedAt,
                  },
                }
              : msg
          );

          const lastMsg = updatedMessages.find((m) => m.id === aid);
          const firstText =
            lastMsg?.parts?.find((p) => p.kind === "text")?.text || info || "Task finished.";
          backgroundSync.onTurnDone(threadId, err ? "Turn Failed" : "Turn Complete", firstText);

          return {
            ...prev,
            status: err ? "error" : "ready",
            isStreaming: false,
            isStopping: false,
            activeAid: null,
            activeTurnId: null,
            messages: updatedMessages,
          };
        });

        qc.invalidateQueries({ queryKey: keys.sessions });
        if (threadId) {
          qc.invalidateQueries({ queryKey: keys.session(threadId) });
        }

        // Auto-drain queue: If server has queued items, start next prompt
        if (rpc && !err) {
          setTimeout(async () => {
            const currentQ = await refreshQueue(threadId);
            if (currentQ.length > 0 && !isStreamingRef.current) {
              const nextTurnId = await startQueuedPrompt(rpc, threadId);
              if (nextTurnId) {
                const nextAid = `a_${nextTurnId}`;
                activeAidRef.current = nextAid;
                isStreamingRef.current = true;
                statusRef.current = "streaming";
                setSessionRunning(threadId, true);
                chatStore.setState(threadId, (prev) => ({
                  ...prev,
                  status: "streaming",
                  isStreaming: true,
                  activeAid: nextAid,
                  activeTurnId: nextTurnId,
                }));
                offRef.current = attachToRunningTurn(
                  rpc,
                  threadId,
                  createHandlers(nextAid, threadId)
                );
              }
            }
          }, 300);
        }
      },
    }),
    [qc, setSessionRunning, rpc, refreshQueue]
  );

  // Handle session change, background history synchronization, and attaching to running turns
  useEffect(() => {
    const sessionChanged = currentSessionRef.current !== currentSessionId;
    const historyData = history.data;
    const historyMessages = historyData?.messages ?? [];
    const isTurnRunning = !!historyData?.isTurnRunning;
    const serverActiveTurnId = historyData?.activeTurnId;

    if (sessionChanged) {
      currentSessionRef.current = currentSessionId;

      if (offRef.current) {
        try {
          offRef.current();
        } catch {}
        offRef.current = null;
      }

      setError(null);
      setVisibleCount(30);
      allHistoryRef.current = historyMessages;

      if (currentSessionId) {
        const existingStore = chatStore.getState(currentSessionId);
        if (!existingStore.isStreaming) {
          chatStore.setState(currentSessionId, (prev) => ({
            ...prev,
            messages: historyMessages.slice(-30),
            error: null,
          }));
        }
      }

      if (isTurnRunning && rpc && currentSessionId) {
        isStreamingRef.current = true;
        statusRef.current = "streaming";
        setSessionRunning(currentSessionId, true);

        const lastAssMsg = [...historyMessages].reverse().find((m) => m.role === "assistant");
        const aid = serverActiveTurnId
          ? `a_${serverActiveTurnId}`
          : lastAssMsg?.id ?? `live_${Date.now()}`;
        activeAidRef.current = aid;
        offRef.current = attachToRunningTurn(
          rpc,
          currentSessionId,
          createHandlers(aid, currentSessionId)
        );
      } else {
        isStreamingRef.current = false;
        statusRef.current = "ready";
        activeAidRef.current = null;
        if (currentSessionId) {
          setSessionRunning(currentSessionId, false);
          chatStore.setState(currentSessionId, (prev) => ({
            ...prev,
            status: "ready",
            isStreaming: false,
            isStopping: false,
          }));
        }
      }
      return;
    }

    // When session hasn't changed:
    if (currentSessionId) {
      const currentStore = chatStore.getState(currentSessionId);

      // CRITICAL STUCK-STATE RECOVERY:
      // If server history says isTurnRunning is FALSE, but client store thinks it isStreaming:
      if (!isTurnRunning && currentStore.isStreaming) {
        if (offRef.current) {
          try {
            offRef.current();
          } catch {}
          offRef.current = null;
        }
        isStreamingRef.current = false;
        statusRef.current = "ready";
        activeAidRef.current = null;
        setSessionRunning(currentSessionId, false);

        allHistoryRef.current = historyMessages;
        chatStore.setState(currentSessionId, (prev) => ({
          ...prev,
          messages: historyMessages.length > 0 ? historyMessages.slice(-visibleCount) : prev.messages,
          status: "ready",
          isStreaming: false,
          isStopping: false,
          activeAid: null,
          activeTurnId: null,
        }));
        return;
      }

      // If server history says turn IS running, but client is NOT streaming:
      if (isTurnRunning && !currentStore.isStreaming && rpc) {
        isStreamingRef.current = true;
        statusRef.current = "streaming";
        setSessionRunning(currentSessionId, true);

        const lastAssMsg = [...historyMessages].reverse().find((m) => m.role === "assistant");
        const aid = serverActiveTurnId
          ? `a_${serverActiveTurnId}`
          : lastAssMsg?.id ?? `live_${Date.now()}`;
        activeAidRef.current = aid;
        allHistoryRef.current = historyMessages;

        chatStore.setState(currentSessionId, (prev) => ({
          ...prev,
          messages: historyMessages.slice(-visibleCount),
          status: "streaming",
          isStreaming: true,
          activeAid: aid,
          activeTurnId: serverActiveTurnId || null,
        }));

        offRef.current = attachToRunningTurn(
          rpc,
          currentSessionId,
          createHandlers(aid, currentSessionId)
        );
        return;
      }

      // Regular idle history update
      if (!currentStore.isStreaming && statusRef.current === "ready" && historyMessages.length > 0) {
        allHistoryRef.current = historyMessages;
        chatStore.setState(currentSessionId, (prev) => ({
          ...prev,
          messages: historyMessages.slice(-visibleCount),
        }));
      }
    }
  }, [history.data, currentSessionId, visibleCount, rpc, createHandlers, setSessionRunning]);

  // Periodic Watchdog: If streaming state has had no updates for > 15s, poll history to prevent stuck state
  useEffect(() => {
    if (!currentSessionId || !isStreamingRef.current) return;
    const interval = setInterval(() => {
      const store = chatStore.getState(currentSessionId);
      if (store.isStreaming && Date.now() - store.lastUpdated > 12000) {
        void history.refetch();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentSessionId, history]);

  const loadOlder = useCallback(() => {
    if (!currentSessionId) return;
    setVisibleCount((current) => {
      const next = Math.min(allHistoryRef.current.length, current + 30);
      chatStore.setState(currentSessionId, (prev) => ({
        ...prev,
        visibleCount: next,
        messages: allHistoryRef.current.slice(-next),
      }));
      return next;
    });
  }, [currentSessionId]);

  const send = useCallback(
    async (text: string, cwd?: string, overrideThreadId?: string) => {
      if (!rpc || !text.trim()) return null;

      const threadId = overrideThreadId || currentSessionId;

      // QUEUE CHECK: If turn is currently streaming/submitted, queue the prompt rather than breaking turn
      if (threadId && (isStreamingRef.current || statusRef.current === "streaming" || statusRef.current === "submitted")) {
        try {
          const queued = await addPromptToQueue(rpc, threadId, text);
          if (queued) {
            await refreshQueue(threadId);
            // Append temporary notice
            chatStore.patchAssistant(threadId, activeAidRef.current || `live_${Date.now()}`, (parts) => [
              ...parts,
              {
                id: `queued_${Date.now()}`,
                kind: "notice",
                text: "Prompt added to queue. It will run automatically when current task finishes.",
                status: "done",
                meta: { tone: "info" },
              },
            ]);
            return threadId;
          }
        } catch (e) {
          console.warn("[useChat.send] failed to queue prompt:", e);
        }
      }

      // 1. Clean up any existing listeners if starting a fresh turn
      if (offRef.current) {
        try {
          offRef.current();
        } catch {}
        offRef.current = null;
      }

      setError(null);
      isStreamingRef.current = true;
      statusRef.current = "submitted";

      const targetCwd = cwd || workingCwd || defaultCwd || APP.defaultCwd;
      let targetThreadId = threadId;

      if (!targetThreadId) {
        try {
          targetThreadId = await startSession(rpc, {
            cwd: targetCwd,
            sandbox,
            ...(modelId ? { model: modelId } : {}),
          });
          setActiveSessionId(targetThreadId);
        } catch (e) {
          isStreamingRef.current = false;
          statusRef.current = "error";
          setError(formatCoreError(e));
          return null;
        }
      }

      setSessionRunning(targetThreadId, true);
      if (targetThreadId !== activeSessionId) {
        setActiveSessionId(targetThreadId);
      }

      const aid = `live_${Date.now()}`;
      activeAidRef.current = aid;

      chatStore.setState(targetThreadId, (prev) => ({
        ...prev,
        status: "submitted",
        isStreaming: true,
        isStopping: false,
        activeAid: aid,
        error: null,
        messages: [
          ...prev.messages,
          {
            id: `u_${Date.now()}`,
            role: "user",
            parts: [{ id: `u_part_${Date.now()}`, kind: "text", text, status: "done" }],
          },
          { id: aid, role: "assistant", parts: [], stats: { startedAt: Date.now() } },
        ],
      }));

      offRef.current = await runTurn(
        rpc,
        targetThreadId,
        text,
        { ...(modelId ? { model: modelId } : {}), effort },
        createHandlers(aid, targetThreadId)
      );
      return targetThreadId;
    },
    [
      rpc,
      currentSessionId,
      modelId,
      effort,
      sandbox,
      workingCwd,
      defaultCwd,
      activeSessionId,
      setActiveSessionId,
      setSessionRunning,
      createHandlers,
      refreshQueue,
    ]
  );

  const stop = useCallback(async () => {
    if (!rpc || !currentSessionId) return;

    const currentStore = chatStore.getState(currentSessionId);
    const turnId = currentStore.activeTurnId || history.data?.activeTurnId;

    // Immediately mark stopping in UI so user gets instant visual feedback
    chatStore.setState(currentSessionId, (prev) => ({
      ...prev,
      status: "stopping",
      isStopping: true,
    }));
    statusRef.current = "stopping";

    try {
      await interruptTurn(rpc, currentSessionId, turnId);
    } catch (e) {
      console.warn("[stop] interrupt failed:", e);
    }

    // Safety timeout: If server event does not arrive within 3.5s, force sync
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(async () => {
      if (offRef.current) {
        try {
          offRef.current();
        } catch {}
        offRef.current = null;
      }
      isStreamingRef.current = false;
      statusRef.current = "ready";
      activeAidRef.current = null;
      setSessionRunning(currentSessionId, false);

      chatStore.setState(currentSessionId, (prev) => ({
        ...prev,
        status: "ready",
        isStreaming: false,
        isStopping: false,
        activeAid: null,
        activeTurnId: null,
      }));
      void history.refetch();
    }, 3500);
  }, [rpc, currentSessionId, history, setSessionRunning]);

  const resume = useCallback(async () => {
    if (!rpc || !currentSessionId) return;

    try {
      await rpc.call("thread/resume", { threadId: currentSessionId });
    } catch {}

    // Check if there are queued prompts waiting to run
    const queued = await refreshQueue(currentSessionId);
    if (queued.length > 0) {
      const nextTurnId = await startQueuedPrompt(rpc, currentSessionId);
      if (nextTurnId) {
        const nextAid = `a_${nextTurnId}`;
        activeAidRef.current = nextAid;
        isStreamingRef.current = true;
        statusRef.current = "streaming";
        setSessionRunning(currentSessionId, true);
        chatStore.setState(currentSessionId, (prev) => ({
          ...prev,
          status: "streaming",
          isStreaming: true,
          activeAid: nextAid,
          activeTurnId: nextTurnId,
        }));
        offRef.current = attachToRunningTurn(
          rpc,
          currentSessionId,
          createHandlers(nextAid, currentSessionId)
        );
      }
    } else {
      void history.refetch();
    }
  }, [rpc, currentSessionId, refreshQueue, setSessionRunning, createHandlers, history]);

  const removeQueued = useCallback(
    async (queuedId: string) => {
      if (!rpc || !currentSessionId) return false;
      const ok = await deleteQueuedPrompt(rpc, currentSessionId, queuedId);
      if (ok) {
        await refreshQueue(currentSessionId);
      }
      return ok;
    },
    [rpc, currentSessionId, refreshQueue]
  );

  const clear = useCallback(() => {
    if (currentSessionId) {
      chatStore.setState(currentSessionId, (prev) => ({
        ...prev,
        messages: [],
      }));
    }
  }, [currentSessionId]);

  return {
    messages,
    status,
    error,
    activeTurnId: initialStore?.activeTurnId ?? null,
    isStreaming: isStreamingRef.current,
    isStopping: status === "stopping",
    queuedPrompts,
    send,
    stop,
    resume,
    removeQueued,
    refreshQueue: () => (currentSessionId ? refreshQueue(currentSessionId) : Promise.resolve([])),
    clear,
    loadingHistory: history.isLoading,
    hasOlder: allHistoryRef.current.length > visibleCount,
    loadOlder,
  };
}
