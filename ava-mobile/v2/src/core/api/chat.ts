import type { RpcClient } from "../rpc-client";
import type { AgentQuestion, MessagePart, PlanStep, QueuedPrompt, TurnStats } from "../types";
import { itemToPart, toPlanSteps } from "./items";
import { formatCoreError } from "../errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

export interface TurnHandlers {
  onPart: (part: MessagePart) => void;
  onDelta: (itemId: string, delta: string, kind: "text" | "reasoning" | "output") => void;
  onPlan: (steps: PlanStep[], title?: string) => void;
  onNotice: (text: string, tone: "info" | "warning" | "error") => void;
  onStats: (stats: TurnStats) => void;
  onQuestion?: (question: AgentQuestion, requestId?: number | string) => void;
  onDone: (error?: string, info?: string) => void;
}

/** Sends a prompt and streams every live event for that thread until the turn completes. */
export async function runTurn(
  rpc: RpcClient,
  threadId: string,
  text: string,
  opts: { model?: string; effort?: string },
  h: TurnHandlers,
) {
  const off = rpc.on(({ method, params, id: reqId }) => {
    const eventThreadId = params?.threadId ?? params?.thread_id;
    if (eventThreadId && eventThreadId !== threadId) return;
    const item = params?.item as Raw | undefined;

    switch (method) {
      case "item/started":
      case "item/completed": {
        const p = item && itemToPart(item, method === "item/started" ? "running" : "done");
        if (p) {
          h.onPart(p);
          if (p.meta?.questions && p.meta.questions.length > 0 && h.onQuestion) {
            h.onQuestion(p.meta.questions[0]!, reqId);
          }
        }
        break;
      }
      case "item/agentMessage/delta":
        h.onDelta(String(params?.itemId ?? params?.id ?? ""), String(params?.delta ?? params?.textDelta ?? params?.text ?? ""), "text");
        break;
      case "item/reasoning/summaryTextDelta":
      case "item/reasoning/textDelta":
        h.onDelta(String(params?.itemId ?? params?.id ?? ""), String(params?.delta ?? params?.textDelta ?? params?.text ?? ""), "reasoning");
        break;
      case "item/reasoning/summaryPartAdded":
        h.onDelta(String(params?.itemId ?? params?.id ?? ""), "\n\n", "reasoning");
        break;
      case "item/commandExecution/outputDelta":
      case "command/exec/outputDelta":
        h.onDelta(String(params?.itemId ?? params?.processId ?? params?.id ?? ""), String(params?.delta ?? params?.chunk ?? params?.output ?? ""), "output");
        break;
      case "turn/plan/updated":
        h.onPlan(toPlanSteps((params?.plan as Raw[]) ?? []), params?.explanation ? String(params.explanation) : undefined);
        break;
      case "thread/goal/updated": {
        const g = (params?.goal ?? params) as Raw;
        const objective = String(g?.objective ?? g?.text ?? g?.title ?? "");
        if (objective) h.onPlan([{ text: objective, status: g?.status === "completed" || g?.completed ? "done" : "active" }], "Goal");
        break;
      }
      case "thread/tokenUsage/updated": {
        const t = (params?.tokenUsage as Raw)?.total;
        if (t) h.onStats({ totalTokens: t.totalTokens, outputTokens: t.outputTokens });
        break;
      }
      case "elicitation":
      case "elicitationRequest":
      case "question": {
        const q: AgentQuestion = {
          id: String(params?.id || reqId || Date.now()),
          title: String(params?.title || params?.question || params?.message || "Agent question"),
          options: Array.isArray(params?.options) ? params.options.map(String) : undefined,
          requestId: reqId,
        };
        if (h.onQuestion) h.onQuestion(q, reqId);
        break;
      }
      case "warning": {
        const msg = formatCoreError(params, "Warning");
        // Known harmless server noise for custom model combos.
        if (!/^Model metadata for .* not found/.test(msg)) h.onNotice(msg, "warning");
        break;
      }
      case "error": {
        const msg = formatCoreError(params?.error ?? params);
        // Core retries some failures itself (e.g. stream disconnects) — show, but keep the turn alive.
        if (params?.willRetry) {
          h.onNotice(`${msg}\nRetrying…`, "warning");
          break;
        }
        off();
        h.onDone(msg);
        break;
      }
      case "turn/completed": {
        off();
        const turn = params?.turn as Raw;
        if (typeof turn?.durationMs === "number") h.onStats({ durationMs: turn.durationMs });
        if (turn?.status === "failed") h.onDone(formatCoreError(turn?.error, "Turn failed"));
        else if (turn?.status === "interrupted") h.onDone(undefined, "Stopped");
        else h.onDone();
        break;
      }
    }
  });

  try {
    await rpc.call("turn/start", {
      threadId,
      input: [{ type: "text", text }],
      ...(opts.model ? { model: opts.model } : {}),
      ...(opts.effort ? { effort: opts.effort } : {}),
    });
  } catch (e) {
    const errText = formatCoreError(e);
    if (errText.toLowerCase().includes("thread not found")) {
      try {
        await rpc.call("thread/resume", { threadId });
        await rpc.call("turn/start", {
          threadId,
          input: [{ type: "text", text }],
          ...(opts.model ? { model: opts.model } : {}),
          ...(opts.effort ? { effort: opts.effort } : {}),
        });
        return off;
      } catch (retryErr) {
        off();
        h.onDone(formatCoreError(retryErr));
        return off;
      }
    }
    off();
    h.onDone(errText);
  }
  return off;
}

/** Attaches listeners to an already running turn on the server without issuing turn/start. */
export function attachToRunningTurn(
  rpc: RpcClient,
  threadId: string,
  h: TurnHandlers,
) {
  const off = rpc.on(({ method, params, id: reqId }) => {
    const eventThreadId = params?.threadId ?? params?.thread_id;
    if (eventThreadId && eventThreadId !== threadId) return;
    const item = params?.item as Raw | undefined;

    switch (method) {
      case "item/started":
      case "item/completed": {
        const p = item && itemToPart(item, method === "item/started" ? "running" : "done");
        if (p) {
          h.onPart(p);
          if (p.meta?.questions && p.meta.questions.length > 0 && h.onQuestion) {
            h.onQuestion(p.meta.questions[0]!, reqId);
          }
        }
        break;
      }
      case "item/agentMessage/delta":
        h.onDelta(String(params?.itemId ?? params?.id ?? ""), String(params?.delta ?? params?.textDelta ?? params?.text ?? ""), "text");
        break;
      case "item/reasoning/summaryTextDelta":
      case "item/reasoning/textDelta":
        h.onDelta(String(params?.itemId ?? params?.id ?? ""), String(params?.delta ?? params?.textDelta ?? params?.text ?? ""), "reasoning");
        break;
      case "item/reasoning/summaryPartAdded":
        h.onDelta(String(params?.itemId ?? params?.id ?? ""), "\n\n", "reasoning");
        break;
      case "item/commandExecution/outputDelta":
      case "command/exec/outputDelta":
        h.onDelta(String(params?.itemId ?? params?.processId ?? params?.id ?? ""), String(params?.delta ?? params?.chunk ?? params?.output ?? ""), "output");
        break;
      case "turn/plan/updated":
        h.onPlan(toPlanSteps((params?.plan as Raw[]) ?? []), params?.explanation ? String(params.explanation) : undefined);
        break;
      case "thread/goal/updated": {
        const g = (params?.goal ?? params) as Raw;
        const objective = String(g?.objective ?? g?.text ?? g?.title ?? "");
        if (objective) h.onPlan([{ text: objective, status: g?.status === "completed" || g?.completed ? "done" : "active" }], "Goal");
        break;
      }
      case "thread/tokenUsage/updated": {
        const t = (params?.tokenUsage as Raw)?.total;
        if (t) h.onStats({ totalTokens: t.totalTokens, outputTokens: t.outputTokens });
        break;
      }
      case "elicitation":
      case "elicitationRequest":
      case "question": {
        const q: AgentQuestion = {
          id: String(params?.id || reqId || Date.now()),
          title: String(params?.title || params?.question || params?.message || "Agent question"),
          options: Array.isArray(params?.options) ? params.options.map(String) : undefined,
          requestId: reqId,
        };
        if (h.onQuestion) h.onQuestion(q, reqId);
        break;
      }
      case "warning": {
        const msg = formatCoreError(params, "Warning");
        if (!/^Model metadata for .* not found/.test(msg)) h.onNotice(msg, "warning");
        break;
      }
      case "error": {
        const msg = formatCoreError(params?.error ?? params);
        if (params?.willRetry) {
          h.onNotice(`${msg}\nRetrying…`, "warning");
          break;
        }
        off();
        h.onDone(msg);
        break;
      }
      case "turn/completed": {
        off();
        const turn = params?.turn as Raw;
        if (typeof turn?.durationMs === "number") h.onStats({ durationMs: turn.durationMs });
        if (turn?.status === "failed") h.onDone(formatCoreError(turn?.error, "Turn failed"));
        else if (turn?.status === "interrupted") h.onDone(undefined, "Stopped");
        else h.onDone();
        break;
      }
    }
  });
  return off;
}

export const interruptTurn = (rpc: RpcClient, threadId: string) => rpc.call("turn/interrupt", { threadId });

/** Adds a prompt to the server-side queue for the thread so it executes even if the app closes. */
export async function addPromptToQueue(
  rpc: RpcClient,
  threadId: string,
  text: string,
): Promise<QueuedPrompt | null> {
  const clientUserMessageId = `queued_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    const res = await rpc.call<Raw>("thread/queue/add", {
      threadId,
      input: [{ type: "text", text }],
      clientUserMessageId,
    });
    const sub = res?.queuedSubmission ?? res?.queued_submission ?? res;
    return {
      id: String(sub?.id ?? sub?.queuedItemId ?? clientUserMessageId),
      text,
      createdAt: Date.now(),
    };
  } catch (e) {
    console.warn("Server queue add failed, falling back to local queue:", e);
    return { id: clientUserMessageId, text, createdAt: Date.now() };
  }
}

/** Lists all queued prompts on the server for the thread. */
export async function listQueuedPrompts(
  rpc: RpcClient,
  threadId: string,
): Promise<QueuedPrompt[]> {
  try {
    const res = await rpc.call<Raw>("thread/queue/list", { threadId });
    const items = (res?.items ?? res?.queuedSubmissions ?? res?.queued_submissions ?? []) as Raw[];
    return items.map((item) => {
      let promptText = "";
      if (Array.isArray(item.input)) {
        promptText = item.input.map((i: Raw) => String(i?.text ?? "")).filter(Boolean).join("\n");
      } else if (typeof item.input === "string") {
        promptText = item.input;
      }
      return {
        id: String(item.id ?? item.queuedItemId ?? ""),
        text: promptText || "Queued prompt",
        createdAt: typeof item.createdAt === "number" ? item.createdAt : undefined,
      };
    }).filter((q) => q.id);
  } catch {
    return [];
  }
}

/** Deletes a queued prompt from the server queue. */
export async function deleteQueuedPrompt(
  rpc: RpcClient,
  threadId: string,
  queuedItemId: string,
): Promise<boolean> {
  try {
    await rpc.call("thread/queue/delete", { threadId, queuedItemId });
    return true;
  } catch {
    return false;
  }
}

/** Steers or responds to an active turn with an answer to a question. */
export async function answerQuestion(
  rpc: RpcClient,
  threadId: string,
  answer: string,
  requestId?: number | string,
) {
  if (requestId != null) {
    rpc.respond(requestId, { answer });
  }
  // Also steer turn or start next turn with the answer
  try {
    await rpc.call("turn/steer", {
      threadId,
      input: [{ type: "text", text: answer }],
    });
  } catch {
    // If steer is not supported for this turn, start turn
    await rpc.call("turn/start", {
      threadId,
      input: [{ type: "text", text: answer }],
    }).catch(() => {});
  }
}
