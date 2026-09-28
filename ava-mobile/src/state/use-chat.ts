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

let idCounter = 0;
export function makeUniqueId(prefix = "id"): string {
  idCounter = (idCounter + 1) % 1000000;
  return `${prefix}_${Date.now()}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

function getPendingLocalUserMessages(
  localMsgs: ChatMessage[],
  serverMsgs: ChatMessage[],
  _isTurnRunning = false
): ChatMessage[] {
  if (!localMsgs || localMsgs.length === 0) return [];
  const localUserMsgs = localMsgs.filter((m) => m.role === "user");
  if (localUserMsgs.length === 0) return [];
  if (!serverMsgs || serverMsgs.length === 0) return localUserMsgs;

  const serverUserMsgs = serverMsgs.filter((m) => m.role === "user");

  // If local user messages count exceeds server user messages count, return only the pending tail
  if (localUserMsgs.length > serverUserMsgs.length) {
    return localUserMsgs.slice(serverUserMsgs.length);
  }

  return [];
}

function mergeWithLocalMessages(
  localMsgs: ChatMessage[],
  serverMsgs: ChatMessage[],
  isTurnRunning = false,
  visibleLimit?: number,
  activeAid?: string | null
): ChatMessage[] {
  if (!serverMsgs || serverMsgs.length === 0) {
    if (!localMsgs) return [];
    return visibleLimit ? localMsgs.slice(-visibleLimit) : localMsgs;
  }
  if (!localMsgs || localMsgs.length === 0) {
    return visibleLimit ? serverMsgs.slice(-visibleLimit) : serverMsgs;
  }

  // 1. Keep unconfirmed pending local user messages
  const pendingLocalUserMsgs = getPendingLocalUserMessages(localMsgs, serverMsgs, isTurnRunning);

  // 2. Keep live assistant messages ONLY if currently streaming and matching activeAid or running parts
  const liveAssistantMsgs = isTurnRunning
    ? localMsgs.filter(
        (m) =>
          m.role === "assistant" &&
          ((activeAid && m.id === activeAid) ||
            m.parts?.some((p) => p.status === "running"))
      )
    : [];

  // 3. Filter server messages to avoid duplicating any active live assistant message
  const serverFiltered = serverMsgs.filter(
    (sm) => !liveAssistantMsgs.some((lm) => lm.id === sm.id)
  );

  // 4. Combine server history + unconfirmed local user messages + active streaming assistant message
  const combined = [...serverFiltered, ...pendingLocalUserMsgs, ...liveAssistantMsgs];

  // Deduplicate by message ID to prevent any duplicate key errors in lists
  const seenIds = new Set<string>();
  const deduplicated: ChatMessage[] = [];
  for (const msg of combined) {
    if (!seenIds.has(msg.id)) {
      seenIds.add(msg.id);
      deduplicated.push(msg);
    }
  }

  return visibleLimit ? deduplicated.slice(-visibleLimit) : deduplicated;
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
  const refetchHistory = history.refetch;

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
  const runningThreadIdRef = useRef<string | null>(null);
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
      void refetchHistory();
      void refreshQueue(currentSessionId);
    }
  }, [rpcStatus, currentSessionId, refetchHistory, refreshQueue]);

  const createHandlers = useCallback(
    (aid: string, threadId: string): TurnHandlers => ({
      onTurnStarted: (turnId) => {
        runningThreadIdRef.current = threadId;
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
          const cleaned = parts.filter((x) => x.id !== `${aid}_init`);
          const i = cleaned.findIndex(
            (x) => x.id === p.id || (p.kind === "text" && x.id === "stream_text")
          );
          if (i === -1) return [...cleaned, p];
          const next = [...cleaned];
          next[i] = {
            ...p,
            text: p.text || cleaned[i]!.text,
            output: p.output || cleaned[i]!.output,
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
          const cleaned = parts.filter((x) => x.id !== `${aid}_init`);
          const effectiveId =
            itemId || (kind === "output" ? "terminal_out" : "stream_text");
          const i = cleaned.findIndex((x) => x.id === effectiveId);
          if (kind === "output") {
            if (i === -1) {
              return [
                ...cleaned,
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
            const next = [...cleaned];
            next[i] = { ...next[i]!, output: (next[i]!.output ?? "") + delta };
            return next;
          }
          if (i === -1) {
            return [...cleaned, { id: effectiveId, kind, text: delta, status: "running" }];
          }
          const next = [...cleaned];
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
        runningThreadIdRef.current = null;
        setSessionRunning(threadId, false);

        void stopAgentForeground({ sessionId: threadId, isSuccess: !err });

        chatStore.patchAssistant(threadId, aid, (parts) => {
          const cleaned = parts.filter((x) => x.id !== `${aid}_init` || parts.length === 1);
          const next = cleaned.map((p) =>
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
          const updatedMessages = prev.messages.map((msg) => {
            const parts = msg.parts.map((p) =>
              p.status === "running" ? { ...p, status: err ? ("error" as const) : ("done" as const) } : p
            );
            return {
              ...msg,
              parts,
              stats:
                msg.id === aid && msg.stats?.startedAt && !msg.stats.durationMs
                  ? {
                      ...msg.stats,
                      durationMs: Date.now() - msg.stats.startedAt,
                    }
                  : msg.stats,
            };
          });

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

      const isActivelyStreamingThisSession =
        Boolean(currentSessionId && runningThreadIdRef.current === currentSessionId && isStreamingRef.current);

      if (!isActivelyStreamingThisSession) {
        if (offRef.current) {
          try {
            offRef.current();
          } catch {}
          offRef.current = null;
        }
        runningThreadIdRef.current = null;

        setError(null);
        setVisibleCount(30);
        allHistoryRef.current = historyMessages;

        if (isTurnRunning && rpc && currentSessionId) {
          isStreamingRef.current = true;
          statusRef.current = "streaming";
          runningThreadIdRef.current = currentSessionId;
          setSessionRunning(currentSessionId, true);

          const lastAssMsg = [...historyMessages].reverse().find((m) => m.role === "assistant");
          const aid = serverActiveTurnId
            ? `a_${serverActiveTurnId}`
            : lastAssMsg?.id ?? makeUniqueId("live");
          activeAidRef.current = aid;
          chatStore.setState(currentSessionId, (prev) => ({
            ...prev,
            status: "streaming",
            isStreaming: true,
            activeAid: aid,
            activeTurnId: serverActiveTurnId || null,
            messages: mergeWithLocalMessages(prev.messages, historyMessages, true, 30, aid),
          }));
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
            chatStore.setState(currentSessionId, (prev) => {
              const merged = mergeWithLocalMessages(prev.messages, historyMessages, false, 30, null);
              return {
                ...prev,
                status: "ready",
                isStreaming: false,
                isStopping: false,
                activeAid: null,
                activeTurnId: null,
                messages: merged,
                error: null,
              };
            });
          }
        }
      }
      return;
    }

    // When session hasn't changed:
    if (currentSessionId) {
      const currentStore = chatStore.getState(currentSessionId);
      const isRecentlySubmitted = Date.now() - turnStartedAtRef.current < 5000;

      // STUCK-STATE RECOVERY: If server says turn is NOT running, and not recently started locally
      if (!isTurnRunning && currentStore.isStreaming && !isRecentlySubmitted && offRef.current == null) {
        isStreamingRef.current = false;
        statusRef.current = "ready";
        activeAidRef.current = null;
        setSessionRunning(currentSessionId, false);

        allHistoryRef.current = historyMessages;
        chatStore.setState(currentSessionId, (prev) => ({
          ...prev,
          messages: mergeWithLocalMessages(prev.messages, historyMessages, false, visibleCount, null),
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
          messages: mergeWithLocalMessages(prev.messages, historyMessages, true, visibleCount, aid),
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

      // Regular idle history update:
      if (!currentStore.isStreaming && statusRef.current === "ready" && historyMessages.length > 0) {
        allHistoryRef.current = historyMessages;
        chatStore.setState(currentSessionId, (prev) => {
          const merged = mergeWithLocalMessages(prev.messages, historyMessages, false, visibleCount, prev.activeAid);
          return {
            ...prev,
            messages: merged,
          };
        });
      }
    }
  }, [history.data, currentSessionId, visibleCount, rpc, createHandlers, setSessionRunning]);

  // Fast Stream Synchronizer: Reconciles server turns and transcript state
  useEffect(() => {
    if (!currentSessionId || (status !== "streaming" && status !== "submitted")) return;
    const interval = setInterval(() => {
      const store = chatStore.getState(currentSessionId);
      if (AppState.currentState !== "active") return;
      if (store.isStreaming && Date.now() - store.lastUpdated > 8000) {
        void refetchHistory();
        void refreshQueue(currentSessionId);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [currentSessionId, refetchHistory, status, refreshQueue]);

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
      if (!trimmed) return null;

      let threadId = overrideThreadId || currentSessionId;
      const now = Date.now();

      // Prevent rapid duplicate prompt submissions (<250ms debounce)
      if (
        lastSentRef.current.text === trimmed &&
        lastSentRef.current.threadId === threadId &&
        now - lastSentRef.current.time < 250
      ) {
        return threadId;
      }

      isSendingRef.current = true;
      lastSentRef.current = { text: trimmed, time: now, threadId };

      if (rpc && rpc.status !== "online") {
        try {
          await rpc.connect();
        } catch {}
      }

      if (!rpc || rpc.status !== "online") {
        const offlineErr = "Cannot send prompt: AvA server is offline or reconnecting. Please check connection and try again.";
        setError(offlineErr);
        setStatus("error");
        statusRef.current = "error";
        isSendingRef.current = false;

        const userMsgId = makeUniqueId("u");
        const optimisticUserMsg: ChatMessage = {
          id: userMsgId,
          role: "user",
          parts: [{ id: makeUniqueId("u_part"), kind: "text", text: trimmed, status: "done" }],
        };
        const optimisticAssMsg: ChatMessage = {
          id: makeUniqueId("live"),
          role: "assistant",
          parts: [
            {
              id: makeUniqueId("err"),
              kind: "notice" as const,
              text: offlineErr,
              status: "error" as const,
              meta: { tone: "error" as const },
            },
          ],
        };

        setMessages((prev) => [...prev, optimisticUserMsg, optimisticAssMsg]);
        if (threadId) {
          chatStore.setState(threadId, (prev) => ({
            ...prev,
            status: "error",
            error: offlineErr,
            messages: [...prev.messages, optimisticUserMsg, optimisticAssMsg],
          }));
        }
        return null;
      }

      try {
        const targetCwd = cwd || workingCwd || defaultCwd || APP.defaultCwd;
        let targetThreadId = threadId;

        // Start new session if none exists yet
        if (!targetThreadId) {
          try {
            targetThreadId = await startSession(rpc, {
              cwd: targetCwd,
              model: modelId || undefined,
              sandbox,
            });
            if (targetThreadId !== activeSessionId) {
              setActiveSessionId(targetThreadId);
            }
          } catch (e) {
            isStreamingRef.current = false;
            statusRef.current = "error";
            const errStr = formatCoreError(e);
            setError(errStr);
            const userMsgId = makeUniqueId("u");
            const optimisticUserMsg: ChatMessage = {
              id: userMsgId,
              role: "user",
              parts: [{ id: makeUniqueId("u_part"), kind: "text", text: trimmed, status: "done" }],
            };
            setMessages((prev) => [
              ...prev,
              optimisticUserMsg,
              {
                id: makeUniqueId("live"),
                role: "assistant",
                parts: [
                  {
                    id: makeUniqueId("err"),
                    kind: "notice" as const,
                    text: `Failed to create session: ${errStr}`,
                    status: "error" as const,
                    meta: { tone: "error" as const },
                  },
                ],
              },
            ]);
            return null;
          }
        }

        const userMsgId = makeUniqueId("u");
        const optimisticUserMsg: ChatMessage = {
          id: userMsgId,
          role: "user",
          parts: [{ id: makeUniqueId("u_part"), kind: "text", text: trimmed, status: "done" }],
        };

        const aid = makeUniqueId("live");
        activeAidRef.current = aid;
        setError(null);
        isStreamingRef.current = true;
        statusRef.current = "submitted";
        turnStartedAtRef.current = Date.now();
        runningThreadIdRef.current = targetThreadId;

        const optimisticAssMsg: ChatMessage = {
          id: aid,
          role: "assistant",
          parts: [{ id: `${aid}_init`, kind: "text", text: "", status: "running" }],
          stats: { startedAt: Date.now() },
        };

        chatStore.setState(targetThreadId, (prev) => {
          const hasUser = prev.messages.some((m) => m.id === userMsgId);
          return {
            ...prev,
            status: "submitted",
            isStreaming: true,
            isStopping: false,
            activeAid: aid,
            error: null,
            messages: hasUser
              ? prev.messages
              : [...prev.messages, optimisticUserMsg, optimisticAssMsg],
          };
        });

        setSessionRunning(targetThreadId, true);
        if (targetThreadId !== activeSessionId) {
          setActiveSessionId(targetThreadId);
        }

        if (offRef.current) {
          try {
            offRef.current();
          } catch {}
          offRef.current = null;
        }

        try {
          offRef.current = await runTurn(
            rpc,
            targetThreadId,
            trimmed,
            { modelId, effort, sandbox, cwd: targetCwd },
            createHandlers(aid, targetThreadId)
          );
        } catch (err) {
          const formattedErr = formatCoreError(err, "Failed to execute prompt");
          setError(formattedErr);
          statusRef.current = "error";
          isStreamingRef.current = false;
          runningThreadIdRef.current = null;
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
            activeAid: null,
            activeTurnId: null,
          }));
        }

        return targetThreadId;
      } finally {
        isSendingRef.current = false;
      }
    },
    [
      currentSessionId,
      rpc,
      workingCwd,
      defaultCwd,
      modelId,
      effort,
      sandbox,
      activeSessionId,
      setActiveSessionId,
      setSessionRunning,
      createHandlers,
    ]
  );

  const stop = useCallback(async () => {
    if (!rpc || !currentSessionId) return;
    setStatus("stopping");
    statusRef.current = "stopping";
    chatStore.setState(currentSessionId, (prev) => ({
      ...prev,
      status: "stopping",
      isStopping: true,
    }));
    try {
      await interruptTurn(rpc, currentSessionId);
    } catch (e) {
      console.warn("[useChat.stop] interrupt failed:", e);
    }
  }, [rpc, currentSessionId]);

  const resume = useCallback(async () => {
    if (!rpc || !currentSessionId) return;
    setStatus("streaming");
    statusRef.current = "streaming";
    isStreamingRef.current = true;
    chatStore.setState(currentSessionId, (prev) => ({
      ...prev,
      status: "streaming",
      isStreaming: true,
      isStopping: false,
    }));
    try {
      await rpc.call("thread/resume", { threadId: currentSessionId });
      const currentStore = chatStore.getState(currentSessionId);
      const aid = currentStore.activeAid || makeUniqueId("live");
      offRef.current = attachToRunningTurn(
        rpc,
        currentSessionId,
        createHandlers(aid, currentSessionId)
      );
    } catch (e) {
      console.warn("[useChat.resume] resume failed:", e);
    }
  }, [rpc, currentSessionId, createHandlers]);

  const removeQueued = useCallback(
    async (item: QueuedPromptItem | string) => {
      if (!rpc || !currentSessionId) return;
      const itemId = typeof item === "string" ? item : item.id;
      try {
        await deleteQueuedPrompt(rpc, currentSessionId, itemId);
        await refreshQueue(currentSessionId);
      } catch (e) {
        console.warn("[useChat.removeQueued] failed:", e);
      }
    },
    [rpc, currentSessionId, refreshQueue]
  );

  const clear = useCallback(() => {
    if (offRef.current) {
      try {
        offRef.current();
      } catch {}
      offRef.current = null;
    }
    isStreamingRef.current = false;
    statusRef.current = "ready";
    activeAidRef.current = null;
    runningThreadIdRef.current = null;
    if (currentSessionId) {
      setSessionRunning(currentSessionId, false);
      chatStore.cleanup(currentSessionId);
      chatStore.setState(currentSessionId, (prev) => ({
        ...prev,
        messages: [],
        status: "ready",
        error: null,
        activeAid: null,
        activeTurnId: null,
        isStreaming: false,
        isStopping: false,
        queuedItems: [],
      }));
    }
    setMessages([]);
    setStatus("ready");
    setError(null);
  }, [currentSessionId, setSessionRunning]);

  return {
    messages,
    status,
    error,
    queuedPrompts,
    send,
    stop,
    resume,
    removeQueued,
    clear,
    loadingHistory: history.isLoading,
    hasOlder: allHistoryRef.current.length > visibleCount,
    loadOlder,
  };
}
