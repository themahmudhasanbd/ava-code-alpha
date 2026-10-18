import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  addPromptToQueue,
  answerApproval,
  answerQuestion,
  approvalDetail,
  attachToRunningTurn,
  deleteQueuedPrompt,
  interruptTurn,
  isApprovalMethod,
  listQueuedPrompts,
  parseElicitationForm,
  runTurn,
  startQueuedPrompt,
  type TurnHandlers,
} from "@/core/api/chat";
import { startSession } from "@/core/api/sessions";
import { formatCoreError } from "@/core/errors";
import type { AgentQuestion, ChatMessage, MessagePart, PendingApproval, QueuedPrompt } from "@/core/types";
import { useAva } from "./ava-provider";
import { keys, useSessionHistory } from "./queries";

export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

const makeId = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function isOptimisticId(id: string): boolean {
  return id.startsWith("u_") || id.startsWith("live_");
}

function userText(m: ChatMessage): string {
  return (m.parts ?? []).map((p) => p.text ?? "").join("\n").trim();
}

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

const isPreservableWorkflowPart = (p: MessagePart): boolean =>
  p.kind === "tool" || p.kind === "reasoning" || p.kind === "plan";

const hasWorkflowSteps = (m: ChatMessage): boolean =>
  m.role === "assistant" && (m.parts ?? []).some(isPreservableWorkflowPart);

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
            (!m.id.startsWith("live_") && m.parts?.some((p) => p.status === "running")))
      )
    : [];

  // 2b. Preserve completed-turn workflow steps — but never carry workflow parts
  // from a local LIVE bubble (live_* id) whose turn has since completed: they
  // belong to a different turn and would graft onto the previous assistant
  // message, duplicating another turn's reasoning/tools at its tail.
  let mostRecentLocalWorkflowIdx = -1;
  for (let i = 0; i < localMsgs.length; i++) {
    if (hasWorkflowSteps(localMsgs[i]!)) mostRecentLocalWorkflowIdx = i;
  }
  const isLiveBubble = (m: ChatMessage) => m.role === "assistant" && m.id.startsWith("live_");
  const finishedWorkflowMsgs =
    !isTurnRunning && mostRecentLocalWorkflowIdx !== -1
      ? localMsgs.filter(
          (m) => hasWorkflowSteps(m) && !isLiveBubble(m)
        )
      : [];

  // 3. Filter server messages to avoid duplicating any active live assistant message
  const serverFiltered = serverMsgs.filter(
    (sm) => !liveAssistantMsgs.some((lm) => lm.id === sm.id)
  );

  const serverById = new Map<string, ChatMessage>();
  for (const sm of serverFiltered) serverById.set(sm.id, sm);
  const grafted = new Map<string, ChatMessage>();
  const keptLocal: ChatMessage[] = [];
  for (const lm of finishedWorkflowMsgs) {
    if (lm.id.startsWith("live_")) {
      keptLocal.push(lm);
      continue;
    }
    let target = serverById.get(lm.id);
    if (!target && localMsgs.indexOf(lm) === mostRecentLocalWorkflowIdx) {
      for (let i = serverFiltered.length - 1; i >= 0; i--) {
        if (serverFiltered[i]!.role === "assistant") {
          target = serverFiltered[i];
          break;
        }
      }
    }
    if (!target) {
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

  // 4. Combine server history + unconfirmed local user messages + preserved finished-turn + active live assistant
  const combined = [...finalServer, ...pendingLocalUserMsgs, ...keptLocal, ...liveAssistantMsgs];

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

/** Owns the transcript for the active session: history + live streaming turn. */
export function useChat() {
  const { rpc, activeSessionId, setActiveSessionId, workingSessionId, setWorkingSessionId, modelId, effort, sandbox } = useAva();
  const qc = useQueryClient();
  const history = useSessionHistory(activeSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [queuedPrompts, setQueuedPrompts] = useState<QueuedPrompt[]>([]);
  const [visibleCount, setVisibleCount] = useState(30);

  const allHistoryRef = useRef<ChatMessage[]>([]);
  const offRef = useRef<(() => void) | null>(null);
  const turnIdRef = useRef<string | null>(null);
  const aidRef = useRef<string | null>(null);
  const streamingRef = useRef(false);
  const currentSessionRef = useRef<string | null>(null);
  const runningThreadIdRef = useRef<string | null>(null);
  const turnStartedAtRef = useRef<number>(0);
  const drainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createHandlersRef = useRef<(aid: string, threadId: string) => TurnHandlers>(() => {
    throw new Error("createHandlers not ready");
  });
  const drainQueueRef = useRef<((threadId: string) => Promise<void>) | null>(null);

  useEffect(
    () => () => {
      if (drainTimerRef.current) clearTimeout(drainTimerRef.current);
    },
    []
  );

  const loadOlder = useCallback(() => {
    setVisibleCount((current) => {
      const next = Math.min(allHistoryRef.current.length, current + 30);
      setMessages(allHistoryRef.current.slice(-next));
      return next;
    });
  }, []);

  const patchAssistant = useCallback((id: string, fn: (parts: MessagePart[]) => MessagePart[]) => {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, parts: fn(msg.parts) } : msg)));
  }, []);

  const renameAssistant = useCallback((from: string, to: string) => {
    setMessages((m) => (m.some((msg) => msg.id === from) ? m.map((msg) => (msg.id === from ? { ...msg, id: to } : msg)) : m));
  }, []);

  const refreshQueue = useCallback(
    async (threadId: string) => {
      if (!rpc || !threadId) return [] as QueuedPrompt[];
      try {
        const items = await listQueuedPrompts(rpc, threadId);
        setQueuedPrompts(items);
        return items;
      } catch {
        return [] as QueuedPrompt[];
      }
    },
    [rpc]
  );

  useEffect(() => {
    if (activeSessionId) void refreshQueue(activeSessionId);
    else setQueuedPrompts([]);
  }, [activeSessionId, refreshQueue]);

  /** Builds the per-turn event handlers for a live assistant message. */
  const createHandlers = useCallback(
    (aid: string, threadId: string): TurnHandlers => {
      // Live mutable bubble id: canonicalized to `a_<turnId>` on turn start so
      // subsequent patches target the renamed bubble.
      let currentAid = aid;
      const scheduleDrain = () => {
        if (drainTimerRef.current) clearTimeout(drainTimerRef.current);
        drainTimerRef.current = setTimeout(() => {
          drainTimerRef.current = null;
          void drainQueueRef.current?.(threadId);
        }, 800);
      };
      return {
        onPart: (p) => {
          setStatus("streaming");
          patchAssistant(currentAid, (parts) => {
            const i = parts.findIndex((x) => x.id === p.id);
            if (i === -1) return [...parts, p];
            const next = [...parts];
            next[i] = { ...p, text: p.text || parts[i]!.text };
            return next;
          });
        },
        onDelta: (itemId, delta, kind) => {
          setStatus("streaming");
          patchAssistant(currentAid, (parts) => {
            const i = parts.findIndex((x) => x.id === itemId);
            if (kind === "output") {
              if (i === -1) return parts;
              const next = [...parts];
              next[i] = { ...next[i]!, output: (next[i]!.output ?? "") + delta };
              return next;
            }
            if (i === -1) return [...parts, { id: itemId, kind, text: delta, status: "running" }];
            const next = [...parts];
            next[i] = { ...next[i]!, text: next[i]!.text + delta };
            return next;
          });
        },
        onPlan: (steps, title) => {
          const pid = title === "Goal" ? "goal" : "plan";
          patchAssistant(currentAid, (parts) => {
            const part: MessagePart = { id: pid, kind: "plan", text: title ?? "Plan", status: "running", meta: { steps } };
            const i = parts.findIndex((x) => x.id === pid);
            if (i === -1) return [...parts, part];
            const next = [...parts];
            next[i] = part;
            return next;
          });
        },
        onNotice: (text, tone) => {
          patchAssistant(currentAid, (parts) =>
            parts.some((p) => p.kind === "notice" && p.text === text)
              ? parts
              : [...parts, { id: makeId("n"), kind: "notice", text, status: "done", meta: { tone } }],
          );
        },
        onStats: (stats) => {
          setMessages((m) => m.map((msg) => (msg.id === currentAid ? { ...msg, stats: { ...msg.stats, ...stats } } : msg)));
        },
        onTurnStarted: (turnId) => {
          turnIdRef.current = turnId;
          // Canonicalize the live bubble id so history merges match this turn
          // instead of duplicating reasoning/steps into a phantom new bubble.
          const canonicalAid = `a_${turnId}`;
          if (currentAid !== canonicalAid) {
            renameAssistant(currentAid, canonicalAid);
            aidRef.current = canonicalAid;
            currentAid = canonicalAid;
          }
        },
        onQueueChanged: () => {
          void refreshQueue(threadId);
        },
        onQuestion: (question, requestId) => {
          const qId = question.id || makeId("q");
          if (question.method && isApprovalMethod(question.method)) {
            const detail = approvalDetail(question.method, question.params);
            const form =
              question.method === "mcpServer/elicitation/request"
                ? (parseElicitationForm(question.params) ?? undefined)
                : undefined;
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
                      form,
                    },
                  ]
            );
          }
          patchAssistant(currentAid, (parts) => {
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
          patchAssistant(currentAid, (parts) => {
            const next = parts.map((p) => (p.status === "running" ? { ...p, status: err ? ("error" as const) : ("done" as const) } : p));
            const note = err ?? info;
            if (!note) return next;
            return [...next, { id: makeId("end"), kind: "notice" as const, text: note, status: "done" as const, meta: { tone: err ? ("error" as const) : ("info" as const) } }];
          });
          setMessages((m) =>
            m.map((msg) =>
              msg.id === currentAid && msg.stats?.startedAt && !msg.stats.durationMs
                ? { ...msg, stats: { ...msg.stats, durationMs: Date.now() - msg.stats.startedAt } }
                : msg,
            ),
          );
          setStatus(err ? "error" : "ready");
          setWorkingSessionId(null);
          streamingRef.current = false;
          aidRef.current = null;
          turnIdRef.current = null;
          runningThreadIdRef.current = null;
          qc.invalidateQueries({ queryKey: keys.sessions });
          if (threadId) qc.invalidateQueries({ queryKey: keys.session(threadId) });
          // Auto-drain queue: if the server has queued prompts, start the next one.
          if (!err && info !== "Stopped") scheduleDrain();
          setPendingApprovals([]);
        },
      };
    },
    [refreshQueue, patchAssistant, setWorkingSessionId, qc]
  );
  createHandlersRef.current = createHandlers;

  // Handle session change, background history synchronization, and attaching to running turns
  useEffect(() => {
    const sessionChanged = currentSessionRef.current !== activeSessionId;
    const historyData = history.data;
    const historyMessages = historyData?.messages ?? [];
    const isTurnRunning = !!historyData?.isTurnRunning;
    const serverActiveTurnId = historyData?.activeTurnId;

    if (sessionChanged) {
      currentSessionRef.current = activeSessionId;

      const isActivelyStreamingThisSession =
        Boolean(activeSessionId && runningThreadIdRef.current === activeSessionId && streamingRef.current);

      if (!isActivelyStreamingThisSession) {
        if (offRef.current) {
          try {
            offRef.current();
          } catch {}
          offRef.current = null;
        }
        runningThreadIdRef.current = null;
        setPendingApprovals([]);
        setError(null);
        setVisibleCount(30);
        allHistoryRef.current = historyMessages;

        if (isTurnRunning && rpc && activeSessionId) {
          streamingRef.current = true;
          setStatus("streaming");
          runningThreadIdRef.current = activeSessionId;
          setWorkingSessionId(activeSessionId);

          const lastAssMsg = [...historyMessages].reverse().find((m) => m.role === "assistant");
          const aid = serverActiveTurnId
            ? `a_${serverActiveTurnId}`
            : lastAssMsg?.id ?? makeId("live");
          aidRef.current = aid;
          turnIdRef.current = serverActiveTurnId || null;

          setMessages(mergeWithLocalMessages([], historyMessages, true, 30, aid));

          try {
            offRef.current?.();
          } catch {}
          offRef.current = attachToRunningTurn(
            rpc,
            activeSessionId,
            createHandlersRef.current(aid, activeSessionId)
          );
        } else {
          streamingRef.current = false;
          setStatus("ready");
          aidRef.current = null;
          turnIdRef.current = null;
          setWorkingSessionId(null);
          setMessages(historyMessages.slice(-30));
        }
      }
      return;
    }

    // Session has not changed:
    if (activeSessionId) {
      const isRecentlySubmitted = Date.now() - turnStartedAtRef.current < 5000;

      // STUCK-STATE RECOVERY: If server says turn is NOT running, and client is streaming, but not recently started locally
      if (
        !isTurnRunning &&
        streamingRef.current &&
        !isRecentlySubmitted &&
        (offRef.current == null || Date.now() - turnStartedAtRef.current > 8000)
      ) {
        try {
          offRef.current?.();
        } catch {}
        offRef.current = null;
        streamingRef.current = false;
        setStatus("ready");
        aidRef.current = null;
        turnIdRef.current = null;
        runningThreadIdRef.current = null;
        setWorkingSessionId(null);

        allHistoryRef.current = historyMessages;
        setMessages((prev) => mergeWithLocalMessages(prev, historyMessages, false, visibleCount, null));
        return;
      }

      // If server history says turn IS running, but client is NOT streaming:
      if (isTurnRunning && !streamingRef.current && rpc) {
        streamingRef.current = true;
        setStatus("streaming");
        runningThreadIdRef.current = activeSessionId;
        setWorkingSessionId(activeSessionId);

        const lastAssMsg = [...historyMessages].reverse().find((m) => m.role === "assistant");
        const aid = serverActiveTurnId
          ? `a_${serverActiveTurnId}`
          : lastAssMsg?.id ?? makeId("live");
        aidRef.current = aid;
        turnIdRef.current = serverActiveTurnId || null;
        allHistoryRef.current = historyMessages;

        setMessages((prev) => mergeWithLocalMessages(prev, historyMessages, true, visibleCount, aid));

        try {
          offRef.current?.();
        } catch {}
        offRef.current = attachToRunningTurn(
          rpc,
          activeSessionId,
          createHandlersRef.current(aid, activeSessionId)
        );
        return;
      }

      // Regular idle history update:
      if (!streamingRef.current && status === "ready" && historyMessages.length > 0) {
        allHistoryRef.current = historyMessages;
        setMessages((prev) => mergeWithLocalMessages(prev, historyMessages, false, visibleCount, null));
      }
    }
  }, [history.data, activeSessionId, visibleCount, rpc, setWorkingSessionId, status]);

  // Instant resync when the tab returns to the foreground after backgrounding.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && activeSessionId) {
        void history.refetch();
        if (activeSessionId) void refreshQueue(activeSessionId);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [activeSessionId, history, refreshQueue]);

  // Fast Stream Synchronizer: Reconciles server turns and transcript state
  useEffect(() => {
    if (!activeSessionId || (status !== "streaming" && status !== "submitted")) return;
    const interval = setInterval(() => {
      if (streamingRef.current) {
        void history.refetch();
        void refreshQueue(activeSessionId);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [activeSessionId, status, history, refreshQueue]);

  /** Starts the next queued prompt on the thread, attaching to the running turn. */
  const drainQueue = useCallback(
    async (threadId: string) => {
      if (!rpc || streamingRef.current) return;
      const currentQ = await refreshQueue(threadId);
      if (currentQ.length === 0 || streamingRef.current) return;
      try {
        const nextTurnId = await startQueuedPrompt(rpc, threadId);
        if (!nextTurnId) return;
        const nextAid = `a_${nextTurnId}`;
        aidRef.current = nextAid;
        turnIdRef.current = nextTurnId;
        turnStartedAtRef.current = Date.now();
        runningThreadIdRef.current = threadId;
        streamingRef.current = true;
        setStatus("streaming");
        setWorkingSessionId(threadId);
        setMessages((m) => [...m, { id: nextAid, role: "assistant", parts: [], stats: { startedAt: Date.now() } }]);
        offRef.current = attachToRunningTurn(rpc, threadId, createHandlersRef.current(nextAid, threadId));
      } catch (e) {
        console.warn("[useChat.drainQueue] failed:", e);
      }
    },
    [rpc, refreshQueue, setWorkingSessionId]
  );
  drainQueueRef.current = drainQueue;

  const send = useCallback(
    async (text: string, cwd = "/") => {
      if (!rpc || !text.trim()) return;
      setError(null);
      setStatus("submitted");
      let threadId = activeSessionId;
      if (!threadId) {
        try {
          threadId = await startSession(rpc, { cwd, sandbox, ...(modelId ? { model: modelId } : {}) });
          setActiveSessionId(threadId);
          qc.invalidateQueries({ queryKey: keys.sessions });
        } catch (e) {
          setStatus("error");
          setError(formatCoreError(e));
          return;
        }
      }
      // If a turn is already streaming on this thread, queue the prompt directly.
      if (streamingRef.current && threadId) {
        try {
          const qp = await addPromptToQueue(rpc, threadId, text.trim());
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
      turnStartedAtRef.current = Date.now();
      runningThreadIdRef.current = threadId;
      setWorkingSessionId(threadId);
      const aid = `live_${Date.now()}`;
      aidRef.current = aid;
      turnIdRef.current = null;
      streamingRef.current = true;
      try {
        offRef.current?.();
      } catch {}
      setMessages((m) => [
        ...m,
        { id: `u_${Date.now()}`, role: "user", parts: [{ id: "u", kind: "text", text, status: "done" }] },
        { id: aid, role: "assistant", parts: [], stats: { startedAt: Date.now() } },
      ]);
      offRef.current = await runTurn(rpc, threadId, text, { ...(modelId ? { model: modelId } : {}), effort }, createHandlers(aid, threadId));
      return threadId;
    },
    [rpc, activeSessionId, modelId, effort, sandbox, setActiveSessionId, setWorkingSessionId, qc, refreshQueue, createHandlers]
  );

  /** Re-attaches to a stopped/interrupted turn (or starts the next queued prompt). */
  const resume = useCallback(async () => {
    if (!rpc || !activeSessionId) return;
    const threadId = activeSessionId;
    setError(null);
    setStatus("streaming");
    streamingRef.current = true;
    turnStartedAtRef.current = Date.now();
    runningThreadIdRef.current = threadId;
    setWorkingSessionId(threadId);
    try {
      await rpc.call("thread/resume", { threadId });
      const aid = aidRef.current ?? `live_${Date.now()}`;
      aidRef.current = aid;
      setMessages((m) => {
        if (m.some((msg) => msg.id === aid)) return m;
        return [...m, { id: aid, role: "assistant", parts: [], stats: { startedAt: Date.now() } }];
      });
      try {
        offRef.current?.();
      } catch {}
      offRef.current = attachToRunningTurn(rpc, threadId, createHandlersRef.current(aid, threadId));
    } catch (e) {
      const errStr = formatCoreError(e, "Failed to resume turn");
      console.warn("[useChat.resume] resume failed:", e);
      streamingRef.current = false;
      runningThreadIdRef.current = null;
      setStatus("error");
      setError(errStr);
      setWorkingSessionId(null);
    }
  }, [rpc, activeSessionId, setWorkingSessionId]);

  const removeQueued = useCallback(
    async (id: string) => {
      if (!rpc || !activeSessionId) return;
      try {
        await deleteQueuedPrompt(rpc, activeSessionId, id);
        await refreshQueue(activeSessionId);
      } catch (e) {
        console.warn("[useChat.removeQueued] failed:", e);
      }
    },
    [rpc, activeSessionId, refreshQueue]
  );

  /**
   * Responds to a pending approval from the sticky card above the composer.
   */
  const answerPendingApproval = useCallback(
    (id: string, approved: boolean, content?: Record<string, unknown> | null) => {
      const approval = pendingApprovals.find((a) => a.id === id);
      if (!approval) return;
      try {
        if (rpc) answerApproval(rpc, approval.requestId, approval.method, approved, approval.params, content);
      } catch (e) {
        console.warn("[useChat.answerPendingApproval] failed:", e);
      }
      setPendingApprovals((prev) => prev.filter((a) => a.id !== id));
      setMessages((m) =>
        m.map((msg) =>
          msg.role === "assistant"
            ? {
                ...msg,
                parts: msg.parts.map((p) =>
                  p.id === id || p.meta?.questions?.some((q) => q.id === id)
                    ? {
                        ...p,
                        meta: {
                          ...p.meta,
                          questions: (p.meta?.questions ?? []).map((q) => (q.id === id ? { ...q, answered: true } : q)),
                        },
                      }
                    : p
                ),
              }
            : msg
        )
      );
    },
    [pendingApprovals, rpc]
  );

  /** Answers an inline agent question (option pill) from the transcript. */
  const answerQuestionPart = useCallback(
    async (questionId: string, option: string) => {
      if (!rpc || !activeSessionId) return;
      let found: AgentQuestion | undefined;
      for (const msg of messages) {
        for (const p of msg.parts) {
          const q = p.meta?.questions?.find((qq) => qq.id === questionId);
          if (q) {
            found = q;
            break;
          }
        }
        if (found) break;
      }
      if (!found || found.answered) return;
      setMessages((m) =>
        m.map((msg) =>
          msg.role === "assistant"
            ? {
                ...msg,
                parts: msg.parts.map((p) =>
                  p.meta?.questions?.some((q) => q.id === questionId)
                    ? {
                        ...p,
                        meta: {
                          ...p.meta,
                          questions: (p.meta.questions ?? []).map((q) => (q.id === questionId ? { ...q, answered: true } : q)),
                        },
                      }
                    : p
                ),
              }
            : msg
        )
      );
      try {
        await answerQuestion(rpc, activeSessionId, option, found.requestId, turnIdRef.current);
      } catch (e) {
        console.warn("[useChat.answerQuestionPart] failed:", e);
      }
    },
    [rpc, activeSessionId, messages]
  );

  const stop = useCallback(() => {
    if (rpc && activeSessionId) interruptTurn(rpc, activeSessionId).catch(() => {});
    const aid = aidRef.current;
    if (aid) {
      patchAssistant(aid, (parts) => {
        const done = parts.map((pt) => (pt.status === "running" ? { ...pt, status: "done" as const } : pt));
        if (done.some((pt) => pt.kind === "notice" && pt.text === "Stopped")) return done;
        return [...done, { id: makeId("stop"), kind: "notice" as const, text: "Stopped", status: "done" as const, meta: { tone: "info" as const } }];
      });
      setMessages((m) =>
        m.map((msg) =>
          msg.id === aid && msg.stats?.startedAt && !msg.stats.durationMs
            ? { ...msg, stats: { ...msg.stats, durationMs: Date.now() - msg.stats.startedAt } }
            : msg,
        ),
      );
    }
    offRef.current?.();
    streamingRef.current = false;
    aidRef.current = null;
    turnIdRef.current = null;
    runningThreadIdRef.current = null;
    setStatus("ready");
    setWorkingSessionId(null);
    setPendingApprovals([]);
  }, [rpc, activeSessionId, setWorkingSessionId, patchAssistant]);

  const clear = useCallback(() => setMessages([]), []);

  return {
    messages,
    status,
    error,
    send,
    stop,
    clear,
    loadingHistory: history.isLoading,
    hasOlder: allHistoryRef.current.length > visibleCount,
    loadOlder,
    pendingApprovals,
    queuedPrompts,
    answerPendingApproval,
    answerQuestionPart,
    removeQueued,
    resume,
  };
}
