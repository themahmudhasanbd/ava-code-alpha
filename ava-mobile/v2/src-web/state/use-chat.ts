import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { interruptTurn, runTurn } from "@/core/api/chat";
import { startSession } from "@/core/api/sessions";
import { formatCoreError } from "@/core/errors";
import type { ChatMessage, MessagePart } from "@/core/types";
import { useAva } from "./ava-provider";
import { keys, useSessionHistory } from "./queries";

export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

/** Owns the transcript for the active session: history + live streaming turn. */
export function useChat() {
  const { rpc, activeSessionId, setActiveSessionId, setWorkingSessionId, modelId, effort, sandbox } = useAva();
  const qc = useQueryClient();
  const history = useSessionHistory(activeSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);
  const allHistoryRef = useRef<ChatMessage[]>([]);
  const offRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (status === "ready") {
      const all = activeSessionId ? history.data ?? [] : [];
      allHistoryRef.current = all;
      setVisibleCount(30);
      setMessages(all.slice(-30));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.data, activeSessionId]);

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
      setWorkingSessionId(threadId);
      const aid = `live_${Date.now()}`;
      setMessages((m) => [
        ...m,
        { id: `u_${Date.now()}`, role: "user", parts: [{ id: "u", kind: "text", text, status: "done" }] },
        { id: aid, role: "assistant", parts: [], stats: { startedAt: Date.now() } },
      ]);
      offRef.current = await runTurn(rpc, threadId, text, { ...(modelId ? { model: modelId } : {}), effort }, {
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
              : [...parts, { id: `n_${Date.now()}`, kind: "notice", text, status: "done", meta: { tone } }],
          );
        },
        onStats: (stats) => {
          setMessages((m) => m.map((msg) => (msg.id === aid ? { ...msg, stats: { ...msg.stats, ...stats } } : msg)));
        },
        onDone: (err, info) => {
          patchAssistant(aid, (parts) => {
            const next = parts.map((p) => (p.status === "running" ? { ...p, status: err ? ("error" as const) : ("done" as const) } : p));
            const note = err ?? info;
            if (!note) return next;
            return [...next, { id: `end_${Date.now()}`, kind: "notice" as const, text: note, status: "done" as const, meta: { tone: err ? ("error" as const) : ("info" as const) } }];
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
          qc.invalidateQueries({ queryKey: keys.sessions });
          if (threadId) qc.invalidateQueries({ queryKey: keys.session(threadId) });
        },
      });
    },
    [rpc, activeSessionId, modelId, effort, sandbox, setActiveSessionId, setWorkingSessionId, patchAssistant, qc],
  );

  const stop = useCallback(() => {
    if (rpc && activeSessionId) interruptTurn(rpc, activeSessionId).catch(() => {});
    offRef.current?.();
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
  };
}
