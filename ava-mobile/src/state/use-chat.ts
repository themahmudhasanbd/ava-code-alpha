import { AppState } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import {
  addPromptToQueue,
  answerApproval,
  approvalDetail,
  attachToRunningTurn,
  deleteQueuedPrompt,
  interruptTurn,
  isApprovalMethod,
  listQueuedPrompts,
  runTurn,
  startQueuedPrompt,
  type TurnHandlers,
} from "@/core/api/chat";
import { startSession } from "@/core/api/sessions";
import { generateSessionTitle } from "@/core/api/title";
import { formatCoreError } from "@/core/errors";
import type { ChatMessage, MessagePart, PendingApproval } from "@/core/types";
import { useAva } from "./ava-provider";
import type { RpcClient } from "@/core/rpc-client";
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

const isOptimisticId = (id: string) => /^u_\d+_/.test(id);

/** Sessions already considered for auto-titling this app launch. */
const autoTitledThreads = new Set<string>();

/**
 * TUI parity: after the first successful turn of a session, generate a short
 * title from the opening exchange on an ephemeral helper thread and rename
 * the real session. Best-effort — failures are swallowed.
 */
async function maybeAutoTitleSession(opts: {
  rpc: RpcClient;
  threadId: string;
  qc: QueryClient;
  cwd: string;
  model?: string;
}): Promise<void> {
  const { rpc, threadId, qc, cwd, model } = opts;
  if (!threadId || autoTitledThreads.has(threadId)) return;
  autoTitledThreads.add(threadId);
  try {
    const messages = chatStore.getState(threadId)?.messages ?? [];
    const userMsgs = messages.filter((m) => m.role === "user");
    // Only brand-new sessions (single exchange) — never overwrite a rename.
    if (userMsgs.length !== 1) return;
    const textOf = (m: ChatMessage | undefined) =>
      m?.parts
        ?.filter((p) => p.kind === "text" && p.text)
        .map((p) => p.text)
        .join("\n") ?? "";
    const userText = textOf(userMsgs[0]).slice(0, 2000);
    if (!userText.trim()) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    const assistantText = textOf(lastAssistant).slice(0, 2000);
    const title = await generateSessionTitle(rpc, {
      sessionId: threadId,
      cwd,
      model,
      userText,
      assistantText: assistantText || undefined,
    });
    if (title) qc.invalidateQueries({ queryKey: keys.sessions });
  } catch {
    /* auto-title must never break chat */
  }
}
const userText = (m: ChatMessage) =>
  (m.parts ?? []).map((p) => p.text ?? "").join("\n").trim();

/** Optimistic user messages the server has not confirmed yet (matched by text against the server tail). */
function getPendingLocalUserMessages(
  localMsgs: ChatMessage[],
  serverMsgs: ChatMessage[],
  _isTurnRunning = false
): ChatMessage[] {
  const optimistic = (localMsgs ?? []).filter((m) => m.role === "user" && isOptimisticId(m.id));
  if (optimistic.length === 0) return [];
  const serverTail = (serverMsgs ?? [])
    .filter((m) => m.role === "user")
    .slice(-Math.max(optimistic.length * 2, 6))
    .map(userText);
  const pending: ChatMessage[] = [];
  for (const m of optimistic) {
    const i = serverTail.indexOf(userText(m));
    if (i === -1) pending.push(m);
    else serverTail.splice(i, 1);
  }
  return pending;
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

  // 2b. PRESERVE COMPLETED-TURN WORKFLOW STEPS (item #23).
  // When the turn is NOT running, local assistant messages that carried
  // workflow steps (tool / reasoning / plan parts) would otherwise be dropped
  // in favor of the server history message — but the server message often
  // arrives without tool/reasoning/plan parts, which unmounts the
  // LiveStepOverviewCard (the "card vanishes when the turn ends" report).
  // Graft the local workflow parts onto the matching server message (same id,
  // or the last server assistant message for live-generated ids) so the card
  // stays visible with completed/stopped/failed status. Part ids dedupe the
  // graft, making repeated merges idempotent. If the server has no record of
  // the turn at all, keep the local message instead of dropping it.
  const isPreservableWorkflowPart = (p: MessagePart): boolean =>
    p.kind === "tool" || p.kind === "reasoning" || p.kind === "plan";
  const hasWorkflowSteps = (m: ChatMessage): boolean =>
    m.role === "assistant" && (m.parts ?? []).some(isPreservableWorkflowPart);
  let mostRecentLocalWorkflowIdx = -1;
  for (let i = 0; i < localMsgs.length; i++) {
    if (hasWorkflowSteps(localMsgs[i]!)) mostRecentLocalWorkflowIdx = i;
  }
  const finishedWorkflowMsgs =
    !isTurnRunning && mostRecentLocalWorkflowIdx !== -1
      ? localMsgs.filter(hasWorkflowSteps)
      : [];

  // 3. Filter server messages to avoid duplicating any active live assistant message
  const serverFiltered = serverMsgs.filter(
    (sm) => !liveAssistantMsgs.some((lm) => lm.id === sm.id)
  );

  const serverById = new Map<string, ChatMessage>();
  for (const sm of serverFiltered) serverById.set(sm.id, sm);
  const grafted = new Map<string, ChatMessage>(); // server id -> grafted copy
  const keptLocal: ChatMessage[] = [];
  for (const lm of finishedWorkflowMsgs) {
    let target = serverById.get(lm.id);
    if (!target && localMsgs.indexOf(lm) === mostRecentLocalWorkflowIdx) {
      // Live-generated id (e.g. makeUniqueId("live")): the just-finished turn
      // is the last assistant message in server history. Only the most recent
      // local turn may use the positional fallback, so an older turn never
      // grafts its steps onto the wrong message.
      for (let i = serverFiltered.length - 1; i >= 0; i--) {
        if (serverFiltered[i]!.role === "assistant") {
          target = serverFiltered[i];
          break;
        }
      }
    }
    if (!target) {
      // Server has no record of this turn yet — keep the local message so the
      // step overview card (and the turn itself) stays visible.
      keptLocal.push(lm);
      continue;
    }
    const existingPartIds = new Set((target.parts ?? []).map((p) => p.id));
    const missing = (lm.parts ?? []).filter(
      (p) => isPreservableWorkflowPart(p) && !existingPartIds.has(p.id)
    );
    if (missing.length > 0) {
      const mergedMsg: ChatMessage = {
        ...target,
        parts: [...(target.parts ?? []), ...missing],
      };
      grafted.set(target.id, mergedMsg);
      serverById.set(target.id, mergedMsg);
    }
  }
  const finalServer = serverFiltered.map((sm) => grafted.get(sm.id) ?? sm);

  // 4. Combine server history + unconfirmed local user messages + preserved
  //    finished-turn message (when the server has no record of it yet) +
  //    active streaming assistant message
  const combined = [...finalServer, ...pendingLocalUserMsgs, ...keptLocal, ...liveAssistantMsgs];

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
export function useChat(explicitSessionId?: string | null, opts: { passive?: boolean } = {}) {
  const passive = !!opts.passive;
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
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);

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

  // Audit A10 — track the queue-drain timeout in a ref so a newer drain
  // replaces a pending one; cleared on unmount so a stale drain can't fire
  // after the hook is gone.
  const queueDrainTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (queueDrainTimeoutRef.current) {
        clearTimeout(queueDrainTimeoutRef.current);
        queueDrainTimeoutRef.current = null;
      }
    };
  }, []);

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
        const qId = question.id || makeUniqueId("q");
        if (question.method && isApprovalMethod(question.method)) {
          const detail = approvalDetail(question.method, question.params);
          setPendingApprovals((prev) =>
            prev.some((a) => a.id === qId)
              ? prev
              : [
                  ...prev,
                  {
                    id: qId,
                    method: question.method!,
                    title: question.title,
                    detail,
                    params: question.params,
                    requestId,
                  },
                ]
          );
        }
        chatStore.patchAssistant(threadId, aid, (parts) => {
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
        setError(err ?? null);
        runningThreadIdRef.current = null;
        offRef.current = null;
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

        // Audit D15 — capture the notification text/title during the pure
        // updater, then fire the side effect outside setState.
        let turnTitle = err ? "Turn Failed" : "Turn Complete";
        let turnText = "Task finished.";
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
          turnText = firstText;

          return {
            ...prev,
            status: err ? "error" : "ready",
            error: err ?? null,
            isStreaming: false,
            isStopping: false,
            activeAid: null,
            activeTurnId: null,
            messages: updatedMessages,
          };
        });
        backgroundSync.onTurnDone(threadId, turnTitle, turnText);

        qc.invalidateQueries({ queryKey: keys.sessions });
        if (threadId) {
          qc.invalidateQueries({ queryKey: keys.session(threadId) });
        }

        // TUI parity: auto-generate a session title after the first turn.
        if (rpc && !err && info !== "Stopped") {
          void maybeAutoTitleSession({
            rpc,
            threadId,
            qc,
            cwd: workingCwd || defaultCwd || APP.defaultCwd,
            model: modelId || undefined,
          });
        }

        // Auto-drain queue: If server has queued items, start next prompt.
        // Tracked in a ref so a newer drain replaces a pending one and the
        // timer is cleared on unmount.
        if (rpc && !err && info !== "Stopped") {
          if (queueDrainTimeoutRef.current) {
            clearTimeout(queueDrainTimeoutRef.current);
            queueDrainTimeoutRef.current = null;
          }
          queueDrainTimeoutRef.current = setTimeout(async () => {
            queueDrainTimeoutRef.current = null;
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
                try { (offRef.current as (() => void) | null)?.(); } catch {}
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
    // Passive readers (Timeline) only mirror chatStore; the owning screen attaches/merges.
    if (passive) return;
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
          try { (offRef.current as (() => void) | null)?.(); } catch {}
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
      if (!isTurnRunning && currentStore.isStreaming && !isRecentlySubmitted && (offRef.current == null || Date.now() - currentStore.lastUpdated > 8000)) {
        try { (offRef.current as (() => void) | null)?.(); } catch {}
        offRef.current = null;
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

        try { (offRef.current as (() => void) | null)?.(); } catch {}
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
  }, [history.data, currentSessionId, visibleCount, rpc, createHandlers, setSessionRunning, passive]);

  // Fast Stream Synchronizer: Reconciles server turns and transcript state
  useEffect(() => {
    if (passive || !currentSessionId || (status !== "streaming" && status !== "submitted")) return;
    const interval = setInterval(() => {
      const store = chatStore.getState(currentSessionId);
      if (AppState.currentState !== "active") return;
      if (store.isStreaming && Date.now() - store.lastUpdated > 8000) {
        void refetchHistory();
        void refreshQueue(currentSessionId);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [currentSessionId, refetchHistory, status, refreshQueue, passive]);

  const loadOlder = useCallback(() => {
    if (!currentSessionId) return;
    // Audit A11 — compute the next count outside the updater; never call
    // chatStore.setState from inside a React state updater.
    const next = Math.min(allHistoryRef.current.length, visibleCount + 30);
    setVisibleCount(next);
    chatStore.setState(currentSessionId, (prev) => ({
      ...prev,
      visibleCount: next,
      messages: mergeWithLocalMessages(prev.messages, allHistoryRef.current, !!prev.isStreaming, next, prev.activeAid),
    }));
  }, [currentSessionId, visibleCount]);

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

        // Audit C25 — error state only, no optimistic ghost messages.
        if (threadId) {
          chatStore.setState(threadId, (prev) => ({
            ...prev,
            status: "error",
            error: offlineErr,
          }));
        }
        return null;
      }

      try {
        // Audit C23 — if a turn is already streaming on this thread, queue the
        // prompt directly. The live turn's onDone auto-drain will start it.
        // Do NOT detach offRef and do NOT call runTurn here.
        if (isStreamingRef.current && threadId) {
          try {
            const qp = await addPromptToQueue(rpc, threadId, trimmed);
            if (qp) {
              await refreshQueue(threadId);
            } else {
              setError("Failed to queue prompt.");
            }
          } catch (e) {
            setError(formatCoreError(e, "Failed to queue prompt"));
          }
          return threadId;
        }

        const targetCwd = cwd || workingCwd || defaultCwd || APP.defaultCwd;
        let targetThreadId = threadId;

        const userMsgId = makeUniqueId("u");
        const optimisticUserMsg: ChatMessage = {
          id: userMsgId,
          role: "user",
          parts: [{ id: makeUniqueId("u_part"), kind: "text", text: trimmed, status: "done" }],
        };

        const aid = makeUniqueId("live");
        const optimisticAssMsg: ChatMessage = {
          id: aid,
          role: "assistant",
          parts: [{ id: `${aid}_init`, kind: "text", text: "", status: "running" }],
          stats: { startedAt: Date.now() },
        };

        // FIX: show the prompt immediately, before any network round-trip.
        activeAidRef.current = aid;
        setError(null);
        isStreamingRef.current = true;
        statusRef.current = "submitted";
        turnStartedAtRef.current = Date.now();
        setMessages((prev) =>
          prev.some((m) => m.id === userMsgId) ? prev : [...prev, optimisticUserMsg, optimisticAssMsg]
        );

        const pushToStore = (tid: string) => {
          chatStore.setState(tid, (prev) => ({
            ...prev,
            status: "submitted",
            isStreaming: true,
            isStopping: false,
            activeAid: aid,
            error: null,
            messages: prev.messages.some((m) => m.id === userMsgId)
              ? prev.messages
              : [...prev.messages, optimisticUserMsg, optimisticAssMsg],
          }));
          setSessionRunning(tid, true);
        };

        if (targetThreadId) {
          runningThreadIdRef.current = targetThreadId;
          pushToStore(targetThreadId);
        }

        // Start new session if none exists yet
        if (!targetThreadId) {
          try {
            targetThreadId = await startSession(rpc, {
              cwd: targetCwd,
              model: modelId || undefined,
              sandbox,
            });
            // FIX: mark streaming flags BEFORE switching sessions so the
            // session-change effect does not wipe the optimistic transcript.
            runningThreadIdRef.current = targetThreadId;
            pushToStore(targetThreadId);
            if (targetThreadId !== activeSessionId) {
              setActiveSessionId(targetThreadId);
            }
          } catch (e) {
            isStreamingRef.current = false;
            statusRef.current = "error";
            runningThreadIdRef.current = null;
            activeAidRef.current = null;
            const errStr = formatCoreError(e);
            setError(errStr);
            setStatus("error");
            const failNotice: MessagePart = {
              id: makeUniqueId("err"),
              kind: "notice",
              text: `Failed to create session: ${errStr}`,
              status: "error",
              meta: { tone: "error" },
            };
            setMessages((prev) =>
              prev.map((m) => (m.id === aid ? { ...m, parts: [failNotice] } : m))
            );
            return null;
          }
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

          // Audit C28 — runTurn's catch already invoked onDone(errText), which
          // appended the error notice; do NOT append another one here.
          // Audit C25 — remove the optimistic user/assistant pair instead of
          // leaving permanent ghosts; the error banner carries the failure.
          chatStore.setState(targetThreadId, (prev) => ({
            ...prev,
            status: "error",
            error: formattedErr,
            isStreaming: false,
            isStopping: false,
            activeAid: null,
            activeTurnId: null,
            messages: prev.messages.filter((m) => m.id !== userMsgId && m.id !== aid),
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
      refreshQueue,
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
      // Audit C31 — reset streaming state on resume failure instead of only
      // logging; otherwise the UI stays stuck in "streaming".
      const errStr = formatCoreError(e, "Failed to resume turn");
      console.warn("[useChat.resume] resume failed:", e);
      isStreamingRef.current = false;
      statusRef.current = "error";
      setStatus("error");
      setError(errStr);
      setSessionRunning(currentSessionId, false);
      chatStore.setState(currentSessionId, (prev) => ({
        ...prev,
        status: "error",
        error: errStr,
        isStreaming: false,
        isStopping: false,
        activeAid: null,
        activeTurnId: null,
      }));
    }
  }, [rpc, currentSessionId, createHandlers, setSessionRunning]);

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

  /**
   * Responds to a pending approval from the sticky card above the composer.
   * Sends the structured protocol response, removes the card, and marks the
   * corresponding question part in the transcript as answered.
   */
  const answerPendingApproval = useCallback(
    (id: string, approved: boolean) => {
      const approval = pendingApprovals.find((a) => a.id === id);
      if (!approval) return;
      try {
        if (rpc) answerApproval(rpc, approval.requestId, approval.method, approved, approval.params);
      } catch (e) {
        console.warn("[useChat.answerPendingApproval] failed:", e);
      }
      setPendingApprovals((prev) => prev.filter((a) => a.id !== id));
      const aid = activeAidRef.current;
      const threadId = currentSessionId;
      if (aid && threadId) {
        chatStore.patchAssistant(threadId, aid, (parts) =>
          parts.map((p) =>
            p.kind === "question" && p.meta?.questions?.some((q) => q.id === id)
              ? {
                  ...p,
                  meta: {
                    ...p.meta,
                    questions: (p.meta.questions ?? []).map((q) =>
                      q.id === id ? { ...q, answered: true } : q
                    ),
                  },
                }
              : p
          )
        );
      }
    },
    [pendingApprovals, rpc, currentSessionId]
  );

  return {
    messages,
    status,
    error,
    queuedPrompts,
    pendingApprovals,
    answerPendingApproval,
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
