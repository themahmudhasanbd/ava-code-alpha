import type { RpcClient } from "../rpc-client";
import type { AgentQuestion, MessagePart, PlanStep, QueuedPrompt, TurnStats } from "../types";
import { itemToPart, toPlanSteps } from "./items";
import { formatCoreError } from "../errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;
const str = (v: unknown, d = "") => (v == null ? d : String(v));

export interface TurnHandlers {
  onPart: (part: MessagePart) => void;
  onDelta: (itemId: string, delta: string, kind: "text" | "reasoning" | "output") => void;
  onPlan: (steps: PlanStep[], title?: string) => void;
  onNotice: (text: string, tone: "info" | "warning" | "error") => void;
  onStats: (stats: TurnStats) => void;
  onQuestion?: (question: AgentQuestion, requestId?: number | string) => void;
  onDone: (error?: string, info?: string) => void;
  onTurnStarted?: (turnId: string) => void;
  onQueueChanged?: () => void;
}

export interface RunTurnOptions {
  model?: string;
  modelId?: string;
  effort?: string;
  sandbox?: string;
  cwd?: string;
}

/** base64 → UTF-8 text (mirrors the helper in ./files.ts). */
function decodeBase64ToText(data: string): string {
  try {
    const binary = atob(data);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

/** Maps the app's sandbox ids to the protocol's SandboxPolicy union. */
function toSandboxPolicy(sandbox?: string): { type: string } | undefined {
  switch (sandbox) {
    case "read-only":
      return { type: "readOnly" };
    case "workspace-write":
      return { type: "workspaceWrite" };
    case "danger-full-access":
      return { type: "dangerFullAccess" };
    default:
      return undefined;
  }
}

/** Dedupes the "output truncated" notice per process. */
const cappedProcessNotices = new Set<string>();

/**
 * Routes a server-initiated request (approval / elicitation / user-input) into the
 * existing onQuestion UI flow. The answer path (rpc.respond + steer fallback) lives
 * in answerQuestion — unchanged.
 */
function handleServerRequest(
  h: TurnHandlers,
  method: string,
  params: Raw,
  reqId: number | string | undefined,
) {
  const fallbackTitle: Record<string, string> = {
    "mcpServer/elicitation/request": "Server request",
    "item/tool/requestUserInput": "Agent question",
    "item/commandExecution/requestApproval": "Approval requested",
    "item/fileChange/requestApproval": "Approval requested",
    "item/permissions/requestApproval": "Permission requested",
  };
  const q: AgentQuestion = {
    id: String(reqId ?? params?.id ?? Date.now()),
    title: String(
      params?.title ??
        params?.question ??
        params?.message ??
        params?.prompt ??
        params?.text ??
        fallbackTitle[method] ??
        "Agent question",
    ),
    options: Array.isArray(params?.options) ? params.options.map((o: Raw) => String(o)) : undefined,
    requestId: reqId,
  };
  if (h.onQuestion) h.onQuestion(q, reqId);
}

/** Sends a prompt and streams every live event for that thread until the turn completes. */
export async function runTurn(
  rpc: RpcClient,
  threadId: string,
  text: string,
  opts: RunTurnOptions = {},
  h: TurnHandlers,
) {
  const selectedModel = opts.model || opts.modelId;
  const selectedEffort = opts.effort;

  const off = rpc.on(({ method, params, id: reqId }) => {
    const eventThreadId = params?.threadId ?? params?.thread_id;
    if (eventThreadId && eventThreadId !== threadId) return;

    if (method === "turn/started") {
      const turnId = params?.turn?.id ?? params?.turnId;
      if (turnId && h.onTurnStarted) {
        h.onTurnStarted(String(turnId));
      }
      return;
    }

    if (method === "thread/queue/changed") {
      if (h.onQueueChanged) h.onQueueChanged();
      return;
    }

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
      case "item/fileChange/outputDelta":
        h.onDelta(String(params?.itemId ?? params?.processId ?? params?.id ?? ""), String(params?.delta ?? params?.chunk ?? params?.output ?? ""), "output");
        break;
      case "command/exec/outputDelta": {
        // Protocol: { processId, stream, deltaBase64, capReached } — payload is base64.
        const processId = String(params?.processId ?? "");
        const text = params?.deltaBase64 ? decodeBase64ToText(String(params.deltaBase64)) : "";
        if (processId && text) h.onDelta(processId, text, "output");
        if (params?.capReached && processId && !cappedProcessNotices.has(processId)) {
          cappedProcessNotices.add(processId);
          h.onNotice("Command output truncated (server cap reached)", "warning");
        }
        break;
      }
      case "item/mcpToolCall/progress":
        // Protocol: { threadId, turnId, itemId, message } — text is in `message`.
        h.onDelta(String(params?.itemId ?? params?.id ?? ""), String(params?.message ?? ""), "output");
        break;
      case "item/fileChange/patchUpdated": {
        // Live replacement for the deprecated item/fileChange/outputDelta.
        // Protocol: { threadId, turnId, itemId, changes: [{ path, kind: { type }, diff }] }.
        const patchItemId = String(params?.itemId ?? params?.id ?? "");
        const changes = Array.isArray(params?.changes) ? params.changes : [];
        if (patchItemId && changes.length > 0) {
          const lines = changes.map((c: Raw) => {
            const header = `${str(c?.kind?.type ?? c?.kind ?? "update")}: ${str(c?.path ?? "")}`.trim();
            const diff = str(c?.diff ?? "");
            return diff ? `${header}\n${diff}` : header;
          });
          h.onDelta(patchItemId, lines.join("\n\n"), "output");
        }
        break;
      }
      case "turn/plan/updated":
        h.onPlan(toPlanSteps((params?.plan as Raw[]) ?? []), params?.explanation ? String(params.explanation) : undefined);
        break;
      case "thread/goal/updated": {
        const g = (params?.goal ?? params) as Raw;
        const objective = String(g?.objective ?? g?.text ?? g?.title ?? "");
        if (objective) h.onPlan([{ text: objective, status: g?.status === "complete" || g?.completed ? "done" : "active" }], "Goal");
        break;
      }
      case "thread/tokenUsage/updated": {
        const t = (params?.tokenUsage as Raw)?.total;
        if (t) h.onStats({ totalTokens: t.totalTokens, outputTokens: t.outputTokens });
        break;
      }
      case "mcpServer/elicitation/request":
      case "item/tool/requestUserInput":
      case "item/commandExecution/requestApproval":
      case "item/fileChange/requestApproval":
      case "item/permissions/requestApproval":
        handleServerRequest(h, method, params, reqId);
        break;
      case "warning": {
        const msg = formatCoreError(params, "Warning");
        // Known harmless server noise for custom model combos.
        if (!/^Model metadata for .* not found/.test(msg)) h.onNotice(msg, "warning");
        break;
      }
      case "thread/environment/connected":
        h.onNotice("Environment connected", "info");
        break;
      case "thread/environment/disconnected":
        h.onNotice("Environment disconnected", "warning");
        break;
      case "mcpServer/startupStatus/updated": {
        const mcpName = str(params?.name ?? params?.server ?? "MCP server");
        const mcpStatus = str(params?.status ?? "");
        if (mcpStatus === "ready") {
          h.onNotice(`${mcpName} connected`, "info");
        } else if (mcpStatus === "failed") {
          h.onNotice(`${mcpName} failed to start`, "warning");
        }
        break;
      }
      case "item/commandExecution/terminalInteraction": {
        // Protocol: flat { threadId, turnId, itemId, processId, stdin } — text is in `stdin`.
        const stdinText = str(params?.stdin ?? "");
        if (stdinText) {
          h.onDelta(String(params?.itemId ?? params?.id ?? ""), stdinText, "output");
        }
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

  // One client message id per send — lets the server dedupe retries (C27).
  const clientUserMessageId = `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sandboxPolicy = toSandboxPolicy(opts.sandbox);
  const turnStartPayload = {
    threadId,
    input: [{ type: "text", text, text_elements: [] }],
    clientUserMessageId,
    ...(selectedModel ? { model: selectedModel } : {}),
    ...(selectedEffort ? { effort: selectedEffort } : {}),
    ...(opts.cwd ? { cwd: opts.cwd } : {}),
    ...(sandboxPolicy ? { sandboxPolicy } : {}),
  };

  try {
    try {
      await rpc.call("thread/resume", { threadId });
    } catch {}

    const res = await rpc.call<Raw>("turn/start", turnStartPayload);
    if (res?.turn?.id && h.onTurnStarted) {
      h.onTurnStarted(String(res.turn.id));
    }
  } catch (e) {
    const errText = formatCoreError(e);
    if (/thread not found/i.test(errText)) {
      try {
        await rpc.call("thread/resume", { threadId });
        const retryRes = await rpc.call<Raw>("turn/start", turnStartPayload);
        if (retryRes?.turn?.id && h.onTurnStarted) {
          h.onTurnStarted(String(retryRes.turn.id));
        }
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
  void rpc.call("thread/resume", { threadId }).catch(() => {});
  const off = rpc.on(({ method, params, id: reqId }) => {
    const eventThreadId = params?.threadId ?? params?.thread_id;
    if (eventThreadId && eventThreadId !== threadId) return;

    if (method === "turn/started") {
      const turnId = params?.turn?.id ?? params?.turnId;
      if (turnId && h.onTurnStarted) {
        h.onTurnStarted(String(turnId));
      }
      return;
    }

    if (method === "thread/queue/changed") {
      if (h.onQueueChanged) h.onQueueChanged();
      return;
    }

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
      case "item/fileChange/outputDelta":
        h.onDelta(String(params?.itemId ?? params?.processId ?? params?.id ?? ""), String(params?.delta ?? params?.chunk ?? params?.output ?? ""), "output");
        break;
      case "command/exec/outputDelta": {
        // Protocol: { processId, stream, deltaBase64, capReached } — payload is base64.
        const processId = String(params?.processId ?? "");
        const text = params?.deltaBase64 ? decodeBase64ToText(String(params.deltaBase64)) : "";
        if (processId && text) h.onDelta(processId, text, "output");
        if (params?.capReached && processId && !cappedProcessNotices.has(processId)) {
          cappedProcessNotices.add(processId);
          h.onNotice("Command output truncated (server cap reached)", "warning");
        }
        break;
      }
      case "item/mcpToolCall/progress":
        // Protocol: { threadId, turnId, itemId, message } — text is in `message`.
        h.onDelta(String(params?.itemId ?? params?.id ?? ""), String(params?.message ?? ""), "output");
        break;
      case "item/fileChange/patchUpdated": {
        // Live replacement for the deprecated item/fileChange/outputDelta.
        // Protocol: { threadId, turnId, itemId, changes: [{ path, kind: { type }, diff }] }.
        const patchItemId = String(params?.itemId ?? params?.id ?? "");
        const changes = Array.isArray(params?.changes) ? params.changes : [];
        if (patchItemId && changes.length > 0) {
          const lines = changes.map((c: Raw) => {
            const header = `${str(c?.kind?.type ?? c?.kind ?? "update")}: ${str(c?.path ?? "")}`.trim();
            const diff = str(c?.diff ?? "");
            return diff ? `${header}\n${diff}` : header;
          });
          h.onDelta(patchItemId, lines.join("\n\n"), "output");
        }
        break;
      }
      case "turn/plan/updated":
        h.onPlan(toPlanSteps((params?.plan as Raw[]) ?? []), params?.explanation ? String(params.explanation) : undefined);
        break;
      case "thread/goal/updated": {
        const g = (params?.goal ?? params) as Raw;
        const objective = String(g?.objective ?? g?.text ?? g?.title ?? "");
        if (objective) h.onPlan([{ text: objective, status: g?.status === "complete" || g?.completed ? "done" : "active" }], "Goal");
        break;
      }
      case "thread/tokenUsage/updated": {
        const t = (params?.tokenUsage as Raw)?.total;
        if (t) h.onStats({ totalTokens: t.totalTokens, outputTokens: t.outputTokens });
        break;
      }
      case "mcpServer/elicitation/request":
      case "item/tool/requestUserInput":
      case "item/commandExecution/requestApproval":
      case "item/fileChange/requestApproval":
      case "item/permissions/requestApproval":
        handleServerRequest(h, method, params, reqId);
        break;
      case "warning": {
        const msg = formatCoreError(params, "Warning");
        if (!/^Model metadata for .* not found/.test(msg)) h.onNotice(msg, "warning");
        break;
      }
      case "thread/environment/connected":
        h.onNotice("Environment connected", "info");
        break;
      case "thread/environment/disconnected":
        h.onNotice("Environment disconnected", "warning");
        break;
      case "mcpServer/startupStatus/updated": {
        const mcpName = str(params?.name ?? params?.server ?? "MCP server");
        const mcpStatus = str(params?.status ?? "");
        if (mcpStatus === "ready") {
          h.onNotice(`${mcpName} connected`, "info");
        } else if (mcpStatus === "failed") {
          h.onNotice(`${mcpName} failed to start`, "warning");
        }
        break;
      }
      case "item/commandExecution/terminalInteraction": {
        // Protocol: flat { threadId, turnId, itemId, processId, stdin } — text is in `stdin`.
        const stdinText = str(params?.stdin ?? "");
        if (stdinText) {
          h.onDelta(String(params?.itemId ?? params?.id ?? ""), stdinText, "output");
        }
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

/**
 * Interrupts a running turn.
 * Protocol requires `{ threadId, turnId }`. If turnId is omitted, resolves the active turn first.
 */
export async function interruptTurn(
  rpc: RpcClient,
  threadId: string,
  turnId?: string | null,
): Promise<boolean> {
  let targetTurnId = turnId;

  if (!targetTurnId) {
    try {
      await rpc.call("thread/resume", { threadId }).catch(() => {});
      const res = await rpc.call<{ thread?: { turns?: Raw[]; status?: Raw } }>("thread/read", {
        threadId,
        includeTurns: true,
      });
      const turns = res?.thread?.turns ?? [];
      const inProgressTurn = [...turns].reverse().find(
        (t) => t.status === "inProgress" || !t.status || t.status === "running"
      );
      if (inProgressTurn?.id) {
        targetTurnId = String(inProgressTurn.id);
      } else if (turns.length > 0) {
        targetTurnId = String(turns[turns.length - 1].id);
      }
    } catch (e) {
      console.warn("[interruptTurn] could not resolve active turn:", e);
    }
  }

  if (!targetTurnId) {
    console.warn("[interruptTurn] no active turnId to interrupt");
    return false;
  }

  try {
    await rpc.call("turn/interrupt", {
      threadId,
      turnId: targetTurnId,
    });
    return true;
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (/not found|already/i.test(msg)) {
      return true;
    }
    console.warn("[interruptTurn] turn/interrupt failed:", err);
    return false;
  }
}

/** Adds a prompt to the server-side queue for the thread so it executes even if the app closes. */
export async function addPromptToQueue(
  rpc: RpcClient,
  threadId: string,
  text: string,
): Promise<QueuedPrompt | null> {
  const clientUserMessageId = `queued_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await rpc.call("thread/resume", { threadId }).catch(() => {});
    const res = await rpc.call<Raw>("thread/queue/add", {
      threadId,
      input: [{ type: "text", text, text_elements: [] }],
      clientUserMessageId,
    });
    const sub = res?.queuedSubmission ?? res?.queued_submission ?? res;
    return {
      id: String(sub?.id ?? clientUserMessageId),
      text,
      createdAt: Date.now(),
    };
  } catch (e) {
    console.warn("[addPromptToQueue] server queue add failed:", e);
    return null;
  }
}

/** Lists all queued prompts on the server for the thread. */
export async function listQueuedPrompts(
  rpc: RpcClient,
  threadId: string,
): Promise<QueuedPrompt[]> {
  try {
    const res = await rpc.call<Raw>("thread/queue/list", { threadId });
    const items = (res?.data ?? res?.items ?? res?.queuedSubmissions ?? []) as Raw[];
    return items
      .map((item) => {
        let promptText = "";
        if (Array.isArray(item.input)) {
          promptText = item.input
            .map((i: Raw) => String(i?.text ?? ""))
            .filter(Boolean)
            .join("\n");
        } else if (typeof item.input === "string") {
          promptText = item.input;
        }
        return {
          id: String(item.id ?? item.clientUserMessageId ?? ""),
          text: promptText || "Queued prompt",
          createdAt: typeof item.createdAt === "number" ? item.createdAt : undefined,
        };
      })
      .filter((q) => q.id);
  } catch {
    return [];
  }
}

/** Deletes a queued prompt from the server queue. */
export async function deleteQueuedPrompt(
  rpc: RpcClient,
  threadId: string,
  queuedSubmissionId: string,
): Promise<boolean> {
  try {
    await rpc.call("thread/queue/delete", {
      threadId,
      queuedSubmissionId,
    });
    return true;
  } catch (e) {
    console.warn("[deleteQueuedPrompt] failed:", e);
    return false;
  }
}

/** Explicitly starts the next item in the server queue for a thread. */
export async function startQueuedPrompt(
  rpc: RpcClient,
  threadId: string,
  queuedSubmissionId?: string,
): Promise<string | null> {
  try {
    const res = await rpc.call<Raw>("thread/queue/start", {
      threadId,
      ...(queuedSubmissionId ? { queuedSubmissionId } : {}),
    });
    return res?.turn?.id ? String(res.turn.id) : null;
  } catch (e) {
    console.warn("[startQueuedPrompt] failed:", e);
    return null;
  }
}

/** Steers or responds to an active turn with an answer to a question. */
export async function answerQuestion(
  rpc: RpcClient,
  threadId: string,
  answer: string,
  requestId?: number | string,
  turnId?: string | null,
) {
  if (requestId != null) {
    rpc.respond(requestId, { answer });
  }
  // Also steer turn or start next turn with the answer.
  // Protocol requires expectedTurnId on turn/steer — without it the call always fails.
  try {
    await rpc.call("turn/steer", {
      threadId,
      ...(turnId ? { expectedTurnId: turnId } : {}),
      input: [{ type: "text", text: answer, text_elements: [] }],
    });
  } catch {
    // If steer is not supported for this turn, start turn
    await rpc.call("turn/start", {
      threadId,
      input: [{ type: "text", text: answer, text_elements: [] }],
    }).catch(() => {});
  }
}
