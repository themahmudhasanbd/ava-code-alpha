import { AppState } from "react-native";
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
import {
  startAgentForeground,
  updateAgentForeground,
  stopAgentForeground,
} from "@/core/notifications";

export type { ChatStatus, QueuedPromptItem };

function mergeWithLocalMessages(localMsgs: ChatMessage[], serverMsgs: ChatMessage[], limit = 30): ChatMessage[] {
  if (!serverMsgs || serverMsgs.length === 0) return localMsgs;
  if (!localMsgs || localMsgs.length === 0) return serverMsgs.slice(-limit);

  const serverUserTexts = new Set(
    serverMsgs
      .filter((m) => m.role === "user")
      .map((m) => m.parts?.map((p) => p.text?.trim()).filter(Boolean).join(" ") || (m as any).text || "")
  );

  const pendingLocalUserMsgs = localMsgs.filter((lm) => {
    if (lm.role !== "user") return false;
    const localText = lm.parts?.map((p) => p.text?.trim()).filter(Boolean).join(" ") || (lm as any).text || "";
    return !serverUserTexts.has(localText);
  });

  const liveAssistantMsgs = localMsgs.filter((m) => m.role === "assistant" && m.parts?.some((p) => p.status === "running"));

  const combined = [...serverMsgs, ...pendingLocalUserMsgs, ...liveAssistantMsgs];
  return combined.slice(-limit);
}


let idCounter = 0;
export function makeUniqueId(prefix = "id"): string {
  idCounter = (idCounter + 1) % 1000000;
  return `${prefix}_${Date.now()}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

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
  const turnStartedAtRef = useRef<number>(0);
  const isSendingRef = useRef<boolean>(false);
  const lastSentRef = useRef<{ text: string; time: number; threadId: string | null }>({
    text: "",
    time: 0,
    threadId: null,
  });
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

  // Cleanup safety timeout on unmount
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };
  }, []);

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
        void startAgentForeground({ sessionId: threadId });
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

        if (p.kind === "tool" && p.toolName) {
          void updateAgentForeground({
            currentAction: `Executing: ${p.toolName}`,
            toolName: p.toolName,
          });
        } else if (p.kind === "reasoning") {
          void updateAgentForeground({ currentAction: "Thinking..." });
        }

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
                  id: makeUniqueId("n"),
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
      onQuestion: (question, requestId) => {
        chatStore.patchAssistant(threadId, aid, (parts) => {
          const qId = question.id || makeUniqueId("q");
          if (parts.some((p) => p.kind === "question" && p.text === question.title)) return parts;
          return [
            ...parts,
            {
              id: qId,
              kind: "question" as const,
              text: question.title,
              status: "done" as const,
              meta: { questions: [{ ...question, id: qId, requestId }] },
            },
          ];
        });
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

        void stopAgentForeground({ sessionId: threadId, isSuccess: !err });

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
              id: makeUniqueId("end"),
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
        if (rpc && !err && info !== "Stopped") {
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
        chatStore.setState(currentSessionId, (prev) => {
          if (prev.isStreaming) return prev;
          const merged = mergeWithLocalMessages(prev.messages, historyMessages, 30);
          return {
            ...prev,
            messages: merged,
            error: null,
          };
        });
      }

      if (isTurnRunning && rpc && currentSessionId) {
        isStreamingRef.current = true;
        statusRef.current = "streaming";
        setSessionRunning(currentSessionId, true);

        const lastAssMsg = [...historyMessages].reverse().find((m) => m.role === "assistant");
        const aid = serverActiveTurnId
          ? `a_${serverActiveTurnId}`
          : lastAssMsg?.id ?? makeUniqueId("live");
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
      const isRecentlySubmitted = Date.now() - turnStartedAtRef.current < 15000;

      // STUCK-STATE RECOVERY (Only trigger if genuinely idle and not recently started):
      if (!isTurnRunning && currentStore.isStreaming && !isRecentlySubmitted && offRef.current == null) {
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
          : lastAssMsg?.id ?? makeUniqueId("live");
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

      // Regular idle history update: preserve pending user messages
      if (!currentStore.isStreaming && statusRef.current === "ready" && historyMessages.length > 0) {
        allHistoryRef.current = historyMessages;
        chatStore.setState(currentSessionId, (prev) => {
          const merged = mergeWithLocalMessages(prev.messages, historyMessages, visibleCount);
          return {
            ...prev,
            messages: merged,
          };
        });
      }
    }
  }, [history.data, currentSessionId, visibleCount, rpc, createHandlers, setSessionRunning]);

  // Robust Fast Stream Synchronizer: Continuously reconciles server turns and transcript state
  useEffect(() => {
    if (!currentSessionId || (status !== "streaming" && status !== "submitted")) return;
    const interval = setInterval(() => {
      const store = chatStore.getState(currentSessionId);
      // Only reconcile when the live stream has actually stalled and the app is foregrounded.
      if (AppState.currentState !== "active") return;
      if (store.isStreaming && Date.now() - store.lastUpdated > 8000) {
        void history.refetch();
        void refreshQueue(currentSessionId);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [currentSessionId, history, status, refreshQueue]);

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
      const trimmed = text.trim();
      if (!rpc || !trimmed) return null;

      const threadId = overrideThreadId || currentSessionId;
      const now = Date.now();

      // SAFETY GUARD 1: Prevent rapid duplicate prompt submissions (<1.5s identical text for same thread)
      if (
        isSendingRef.current ||
        (lastSentRef.current.text === trimmed &&
          lastSentRef.current.threadId === threadId &&
          now - lastSentRef.current.time < 1500)
      ) {
        console.warn("[useChat.send] Dropping duplicate prompt submission:", trimmed);
        return threadId;
      }

      isSendingRef.current = true;
      lastSentRef.current = { text: trimmed, time: now, threadId };

      try {
        // SAFETY GUARD 2: If turn is currently streaming/submitted, queue prompt on the server
        if (
          threadId &&
          (isStreamingRef.current ||
            statusRef.current === "streaming" ||
            statusRef.current === "submitted")
        ) {
          try {
            const queued = await addPromptToQueue(rpc, threadId, trimmed);
            if (queued) {
              await refreshQueue(threadId);
              chatStore.patchAssistant(
                threadId,
                activeAidRef.current || makeUniqueId("live"),
                (parts) => [
                  ...parts,
                  {
                    id: makeUniqueId("queued"),
                    kind: "notice",
                    text: "Prompt added to queue. It will run automatically when current task finishes.",
                    status: "done",
                    meta: { tone: "info" },
                  },
                ]
              );
              return threadId;
            }
          } catch (e) {
            console.warn("[useChat.send] failed to queue prompt:", e);
          }
        }

        // Clean up any existing listeners for fresh turn
        if (offRef.current) {
          try {
            offRef.current();
          } catch {}
          offRef.current = null;
        }

        setError(null);
        isStreamingRef.current = true;
        statusRef.current = "submitted";
        turnStartedAtRef.current = Date.now();

        const targetCwd = cwd || workingCwd || defaultCwd || APP.defaultCwd;
        let targetThreadId = threadId;

        // Start new session if needed
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
            const errStr = formatCoreError(e);
            setError(errStr);
            return null;
          }
        }

        setSessionRunning(targetThreadId, true);
        if (targetThreadId !== activeSessionId) {
          setActiveSessionId(targetThreadId);
        }

        const aid = makeUniqueId("live");
        activeAidRef.current = aid;

        const userMsgId = makeUniqueId("u");
        const userPartId = makeUniqueId("u_part");

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
              id: userMsgId,
              role: "user",
              parts: [{ id: userPartId, kind: "text", text: trimmed, status: "done" }],
            },
            { id: aid, role: "assistant", parts: [], stats: { startedAt: Date.now() } },
          ],
        }));

        try {
          offRef.current = await runTurn(
            rpc,
            targetThreadId,
            trimmed,
            { ...(modelId ? { model: modelId } : {}), effort },
            createHandlers(aid, targetThreadId)
          );
        } catch (turnErr) {
          const formattedErr = formatCoreError(turnErr);
          isStreamingRef.current = false;
          statusRef.current = "error";
          setError(formattedErr);
          setSessionRunning(targetThreadId, false);

          chatStore.patchAssistant(targetThreadId, aid, (parts) => [
            ...parts,
            {
              id: makeUniqueId("err"),
              kind: "notice",
              text: `Failed to send prompt: ${formattedErr}`,
              status: "error",
              meta: { tone: "error" },
            },
          ]);

          chatStore.setState(targetThreadId, (prev) => ({
            ...prev,
            status: "error",
            error: formattedErr,
            isStreaming: false,
            isStopping: false,
          }));
        }

        return targetThreadId;
      } finally {
        isSendingRef.current = false;
      }
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

    const queued = await refreshQueue(currentSessionId);
    if (queued.length > 0) {
      const nextTurnId = await startQueuedPrompt(rpc, currentSessionId);
      if (nextTurnId) {
        const nextAid = `a_${nextTurnId}`;
        activeAidRef.current = nextAid;
        isStreamingRef.current = true;
        statusRef.current = "streaming";
        turnStartedAtRef.current = Date.now();
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
      // If no queued prompts exist, continue the task/session
      await send("Continue");
    }
  }, [rpc, currentSessionId, refreshQueue, setSessionRunning, createHandlers, send]);

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
