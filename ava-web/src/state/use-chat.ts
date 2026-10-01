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

/** Owns the transcript for the active session: history + live streaming turn. */
export function useChat() {
  const { rpc, activeSessionId, setActiveSessionId, setWorkingSessionId, modelId, effort, sandbox } = useAva();
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
  const drainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createHandlersRef = useRef<(aid: string, threadId: string) => TurnHandlers>(() => {
    throw new Error("createHandlers not ready");
  });
  const drainQueueRef = useRef<((threadId: string) => Promise<void>) | null>(null);

  useEffect(() => {
    if (status === "ready") {
      const all = activeSessionId ? history.data ?? [] : [];
      allHistoryRef.current = all;
      setVisibleCount(30);
      setMessages(all.slice(-30));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.data, activeSessionId]);

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
          patchAssistant(aid, (parts) => {
            const i = parts.findIndex((x) => x.id === p.id);
            if (i === -1) return [...parts, p];
            const next = [...parts];
            next[i] = { ...p, text: p.text || parts[i]!.text };
            return next;
          });
        },
        onDelta: (itemId, delta, kind) => {
          setStatus("streaming");
          patchAssistant(aid, (parts) => {
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
          patchAssistant(aid, (parts) => {
            const part: MessagePart = { id: pid, kind: "plan", text: title ?? "Plan", status: "running", meta: { steps } };
            const i = parts.findIndex((x) => x.id === pid);
            if (i === -1) return [...parts, part];
            const next = [...parts];
            next[i] = part;
            return next;
          });
        },
        onNotice: (text, tone) => {
          patchAssistant(aid, (parts) =>
            parts.some((p) => p.kind === "notice" && p.text === text)
              ? parts
              : [...parts, { id: makeId("n"), kind: "notice", text, status: "done", meta: { tone } }],
          );
        },
        onStats: (stats) => {
          setMessages((m) => m.map((msg) => (msg.id === aid ? { ...msg, stats: { ...msg.stats, ...stats } } : msg)));
        },
        onTurnStarted: (turnId) => {
          turnIdRef.current = turnId;
        },
        onQueueChanged: () => {
          void refreshQueue(threadId);
        },
        onQuestion: (question, requestId) => {
          const qId = question.id || makeId("q");
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
          patchAssistant(aid, (parts) => {
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
          patchAssistant(aid, (parts) => {
            const next = parts.map((p) => (p.status === "running" ? { ...p, status: err ? ("error" as const) : ("done" as const) } : p));
            const note = err ?? info;
            if (!note) return next;
            return [...next, { id: makeId("end"), kind: "notice" as const, text: note, status: "done" as const, meta: { tone: err ? ("error" as const) : ("info" as const) } }];
          });
          setMessages((m) =>
            m.map((msg) =>
              msg.id === aid && msg.stats?.startedAt && !msg.stats.durationMs
                ? { ...msg, stats: { ...msg.stats, durationMs: Date.now() - msg.stats.startedAt } }
                : msg,
            ),
          );
          setStatus(err ? "error" : "ready");
          setWorkingSessionId(null);
          streamingRef.current = false;
          aidRef.current = null;
          turnIdRef.current = null;
          qc.invalidateQueries({ queryKey: keys.sessions });
          if (threadId) qc.invalidateQueries({ queryKey: keys.session(threadId) });
          // Auto-drain queue: if the server has queued prompts, start the next one.
          if (!err && info !== "Stopped") scheduleDrain();
        },
      };
    },
    [refreshQueue, patchAssistant, setWorkingSessionId, qc]
  );
  createHandlersRef.current = createHandlers;

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
        } catch (e) {
          setStatus("error");
          setError(formatCoreError(e));
          return;
        }
      }
      // If a turn is already streaming on this thread, queue the prompt directly.
      // The live turn's onDone auto-drain will start it.
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
        return;
      }
      setWorkingSessionId(threadId);
      const aid = `live_${Date.now()}`;
      aidRef.current = aid;
      turnIdRef.current = null;
      streamingRef.current = true;
      setMessages((m) => [
        ...m,
        { id: `u_${Date.now()}`, role: "user", parts: [{ id: "u", kind: "text", text, status: "done" }] },
        { id: aid, role: "assistant", parts: [], stats: { startedAt: Date.now() } },
      ]);
      offRef.current = await runTurn(rpc, threadId, text, { ...(modelId ? { model: modelId } : {}), effort }, createHandlers(aid, threadId));
    },
    [rpc, activeSessionId, modelId, effort, sandbox, setActiveSessionId, setWorkingSessionId, patchAssistant, qc, refreshQueue, createHandlers]
  );

  /** Re-attaches to a stopped/interrupted turn (or starts the next queued prompt). */
  const resume = useCallback(async () => {
    if (!rpc || !activeSessionId) return;
    const threadId = activeSessionId;
    setError(null);
    setStatus("streaming");
    streamingRef.current = true;
    setWorkingSessionId(threadId);
    try {
      await rpc.call("thread/resume", { threadId });
      const aid = aidRef.current ?? `live_${Date.now()}`;
      aidRef.current = aid;
      setMessages((m) => {
        if (m.some((msg) => msg.id === aid)) return m;
        return [...m, { id: aid, role: "assistant", parts: [], stats: { startedAt: Date.now() } }];
      });
      offRef.current = attachToRunningTurn(rpc, threadId, createHandlersRef.current(aid, threadId));
    } catch (e) {
      const errStr = formatCoreError(e, "Failed to resume turn");
      console.warn("[useChat.resume] resume failed:", e);
      streamingRef.current = false;
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
      setMessages((m) =>
        m.map((msg) =>
          msg.role === "assistant"
            ? {
                ...msg,
                parts: msg.parts.map((p) =>
                  p.kind === "question" && p.meta?.questions?.some((q) => q.id === id)
                    ? {
                        ...p,
                        meta: {
                          ...p.meta,
                          questions: (p.meta.questions ?? []).map((q) => (q.id === id ? { ...q, answered: true } : q)),
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
    offRef.current?.();
    streamingRef.current = false;
    aidRef.current = null;
    setStatus("ready");
    setWorkingSessionId(null);
  }, [rpc, activeSessionId, setWorkingSessionId]);

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
