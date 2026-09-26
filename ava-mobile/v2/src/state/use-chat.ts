import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { attachToRunningTurn, interruptTurn, runTurn, type TurnHandlers } from "@/core/api/chat";
import { startSession } from "@/core/api/sessions";
import { formatCoreError } from "@/core/errors";
import type { ChatMessage, MessagePart } from "@/core/types";
import { useAva } from "./ava-provider";
import { keys, useSessionHistory } from "./queries";
import { APP } from "@/config/app";

export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

/** Owns the transcript for the active session: history + live streaming turn. */
export function useChat(explicitSessionId?: string | null) {
  const {
    rpc,
    activeSessionId,
    setActiveSessionId,
    setWorkingSessionId,
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);

  const allHistoryRef = useRef<ChatMessage[]>([]);
  const offRef = useRef<(() => void) | null>(null);
  const isStreamingRef = useRef(false);
  const statusRef = useRef<ChatStatus>("ready");
  const activeAidRef = useRef<string | null>(null);
  const currentSessionRef = useRef(currentSessionId);

  const patchAssistant = useCallback(
    (id: string, fn: (parts: MessagePart[]) => MessagePart[]) => {
      setMessages((m) => {
        const idx = m.findIndex((msg) => msg.id === id);
        if (idx !== -1) {
          const next = [...m];
          next[idx] = { ...next[idx]!, parts: fn(next[idx]!.parts) };
          return next;
        }

        // If no assistant message exists yet for this live id, append one
        return [
          ...m,
          {
            id,
            role: "assistant",
            parts: fn([]),
            stats: { startedAt: Date.now() },
          },
        ];
      });
    },
    []
  );

  const createHandlers = useCallback(
    (aid: string, threadId: string): TurnHandlers => ({
      onPart: (p) => {
        isStreamingRef.current = true;
        statusRef.current = "streaming";
        setStatus("streaming");
        patchAssistant(aid, (parts) => {
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
        setStatus("streaming");
        patchAssistant(aid, (parts) => {
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
        patchAssistant(aid, (parts) => {
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
        patchAssistant(aid, (parts) =>
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
        setMessages((m) =>
          m.map((msg) =>
            msg.id === aid ? { ...msg, stats: { ...msg.stats, ...stats } } : msg
          )
        );
      },
      onDone: (err, info) => {
        isStreamingRef.current = false;
        statusRef.current = err ? "error" : "ready";
        activeAidRef.current = null;

        patchAssistant(aid, (parts) => {
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

        setMessages((m) =>
          m.map((msg) =>
            msg.id === aid && msg.stats?.startedAt && !msg.stats.durationMs
              ? {
                  ...msg,
                  stats: {
                    ...msg.stats,
                    durationMs: Date.now() - msg.stats.startedAt,
                  },
                }
              : msg
          )
        );

        setStatus(err ? "error" : "ready");
        setWorkingSessionId(null);
        qc.invalidateQueries({ queryKey: keys.sessions });
        if (threadId) {
          qc.invalidateQueries({ queryKey: keys.session(threadId) });
        }
      },
    }),
    [patchAssistant, qc, setWorkingSessionId]
  );

  // Handle session change, background history synchronization, and attaching to running turns
  useEffect(() => {
    const sessionChanged = currentSessionRef.current !== currentSessionId;
    const historyData = history.data;
    const historyMessages = historyData?.messages ?? [];
    const isTurnRunning = !!historyData?.isTurnRunning;
    const activeTurnId = historyData?.activeTurnId;

    if (sessionChanged) {
      currentSessionRef.current = currentSessionId;

      // Clean up previous session listeners
      if (offRef.current) {
        try {
          offRef.current();
        } catch {}
        offRef.current = null;
      }

      setError(null);
      setVisibleCount(30);
      allHistoryRef.current = historyMessages;
      setMessages(historyMessages.slice(-30));

      if (isTurnRunning && rpc && currentSessionId) {
        isStreamingRef.current = true;
        statusRef.current = "streaming";
        setStatus("streaming");
        setWorkingSessionId(currentSessionId);

        const lastAssMsg = [...historyMessages].reverse().find((m) => m.role === "assistant");
        const aid = activeTurnId
          ? `a_${activeTurnId}`
          : lastAssMsg?.id ?? `live_${Date.now()}`;
        activeAidRef.current = aid;
        offRef.current = attachToRunningTurn(rpc, currentSessionId, createHandlers(aid, currentSessionId));
      } else {
        isStreamingRef.current = false;
        statusRef.current = "ready";
        setStatus("ready");
        activeAidRef.current = null;
      }
      return;
    }

    // When session hasn't changed:
    if (!isStreamingRef.current && statusRef.current === "ready") {
      if (isTurnRunning && rpc && currentSessionId) {
        isStreamingRef.current = true;
        statusRef.current = "streaming";
        setStatus("streaming");
        setWorkingSessionId(currentSessionId);

        const lastAssMsg = [...historyMessages].reverse().find((m) => m.role === "assistant");
        const aid = activeTurnId
          ? `a_${activeTurnId}`
          : lastAssMsg?.id ?? `live_${Date.now()}`;
        activeAidRef.current = aid;
        allHistoryRef.current = historyMessages;
        setMessages(historyMessages.slice(-visibleCount));
        offRef.current = attachToRunningTurn(rpc, currentSessionId, createHandlers(aid, currentSessionId));
      } else if (historyMessages.length > 0) {
        allHistoryRef.current = historyMessages;
        setMessages(historyMessages.slice(-visibleCount));
      }
    }
  }, [history.data, currentSessionId, visibleCount, rpc, createHandlers, setWorkingSessionId]);

  const loadOlder = useCallback(() => {
    setVisibleCount((current) => {
      const next = Math.min(allHistoryRef.current.length, current + 30);
      setMessages(allHistoryRef.current.slice(-next));
      return next;
    });
  }, []);

  const send = useCallback(
    async (text: string, cwd?: string, overrideThreadId?: string) => {
      if (!rpc || !text.trim()) return null;

      // 1. Clean up any existing listeners
      if (offRef.current) {
        try {
          offRef.current();
        } catch {}
        offRef.current = null;
      }

      setError(null);
      isStreamingRef.current = true;
      statusRef.current = "submitted";
      setStatus("submitted");

      const targetCwd = cwd || workingCwd || defaultCwd || APP.defaultCwd;
      let threadId = overrideThreadId || currentSessionId;

      if (!threadId) {
        try {
          threadId = await startSession(rpc, {
            cwd: targetCwd,
            sandbox,
            ...(modelId ? { model: modelId } : {}),
          });
          setActiveSessionId(threadId);
        } catch (e) {
          isStreamingRef.current = false;
          statusRef.current = "error";
          setStatus("error");
          setError(formatCoreError(e));
          return null;
        }
      }

      setWorkingSessionId(threadId);
      if (threadId !== activeSessionId) {
        setActiveSessionId(threadId);
      }

      const aid = `live_${Date.now()}`;
      activeAidRef.current = aid;

      // Append user prompt and placeholder live assistant message
      setMessages((m) => [
        ...m,
        {
          id: `u_${Date.now()}`,
          role: "user",
          parts: [{ id: `u_part_${Date.now()}`, kind: "text", text, status: "done" }],
        },
        { id: aid, role: "assistant", parts: [], stats: { startedAt: Date.now() } },
      ]);

      offRef.current = await runTurn(
        rpc,
        threadId,
        text,
        { ...(modelId ? { model: modelId } : {}), effort },
        createHandlers(aid, threadId)
      );
      return threadId;
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
      setWorkingSessionId,
      createHandlers,
    ]
  );

  const stop = useCallback(() => {
    if (rpc && currentSessionId) {
      interruptTurn(rpc, currentSessionId).catch(() => {});
    }
    if (offRef.current) {
      try {
        offRef.current();
      } catch {}
      offRef.current = null;
    }
    isStreamingRef.current = false;
    statusRef.current = "ready";
    activeAidRef.current = null;
    setStatus("ready");
    setWorkingSessionId(null);
  }, [rpc, currentSessionId, setWorkingSessionId]);

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
