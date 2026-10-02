import type { RpcClient } from "../rpc-client";
import type { AgentQuestion, ElicitationField, MessagePart, PlanStep, QueuedPrompt, TurnStats } from "../types";
import { itemToPart, toPlanSteps } from "./items";
import { formatCoreError } from "../errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

const str = (v: unknown, d = ""): string => (v == null ? d : String(v));

export interface TurnHandlers {
  onPart: (part: MessagePart) => void;
  onDelta: (itemId: string, delta: string, kind: "text" | "reasoning" | "output") => void;
  onPlan: (steps: PlanStep[], title?: string) => void;
  onNotice: (text: string, tone: "info" | "warning" | "error") => void;
  onStats: (stats: TurnStats) => void;
  onDone: (error?: string, info?: string) => void;
  onQuestion?: (q: AgentQuestion, requestId?: number | string) => void;
  onQueueChanged?: () => void;
  onTurnStarted?: (turnId: string) => void;
}

/**
 * Server-initiated request methods that are approval/elicitation prompts,
 * not genuine user-input questions. These get the sticky approval card UI
 * and a structured response (see answerApproval), instead of the free-text
 * question flow.
 */
export const APPROVAL_METHODS: ReadonlySet<string> = new Set([
  "item/commandExecution/requestApproval",
  "item/fileChange/requestApproval",
  "item/permissions/requestApproval",
  "mcpServer/elicitation/request",
]);

export function isApprovalMethod(method: string): boolean {
  return APPROVAL_METHODS.has(method);
}

/** Builds a human-readable detail line for an approval card from server params. */
export function approvalDetail(method: string, params: Raw): string | undefined {
  if (!params || typeof params !== "object") return undefined;
  const parts: string[] = [];
  if (typeof params.command === "string" && params.command.trim()) {
    parts.push(params.command.trim().slice(0, 300));
  }
  if (typeof params.reason === "string" && params.reason.trim()) {
    parts.push(params.reason.trim().slice(0, 300));
  }
  // Elicitation modes carry these (url mode: openable link; userVerification
  // mode: what the user is verifying) — surface them so the card is actionable
  // instead of showing a bare Allow/Deny for an unseen prompt.
  if (typeof params.url === "string" && params.url.trim()) {
    parts.push(params.url.trim().slice(0, 300));
  }
  if (typeof params.description === "string" && params.description.trim()) {
    parts.push(params.description.trim().slice(0, 500));
  }
  // Wire format is camelCase (server serializes with serde rename_all) —
  // accept snake_case too in case an older server sends it.
  const serverName = params.serverName ?? params.server_name;
  if (typeof serverName === "string" && serverName.trim()) {
    parts.push(`MCP server: ${serverName.trim()}`);
  }
  const grantRoot = params.grantRoot ?? params.grant_root;
  if (typeof grantRoot === "string" && grantRoot.trim()) {
    parts.push(`Grant root: ${grantRoot.trim()}`);
  }
  if (typeof params.cwd === "string" && params.cwd.trim()) {
    parts.push(`cwd: ${params.cwd.trim()}`);
  }
  return parts.length ? parts.join("\n") : undefined;
}

/**
 * Parses an MCP elicitation form (mcpServer/elicitation/request, form mode)
 * into renderable fields. Mirrors the desktop TUI's form-mode parsing
 * (ava-rs/tui mcp_server_elicitation.rs): object schemas with string fields
 * become text inputs, enums/single-selects and booleans become selects, and
 * anything the TUI cannot render (numbers, multi-selects, unknown shapes)
 * returns null so the caller falls back to the plain Allow/Deny card.
 */
export function parseElicitationForm(params: Raw): ElicitationField[] | null {
  if (!params || typeof params !== "object") return null;
  // The TUI only renders forms for "form" mode; other modes (openai/form,
  // url, userVerification) keep the Allow/Deny fallback.
  if (params.mode !== "form") return null;
  const schema = params.requestedSchema;
  if (!schema || typeof schema !== "object") return null;
  if (schema.type !== "object") return null;
  const props = schema.properties;
  if (!props || typeof props !== "object") return null;
  const ids = Object.keys(props);
  if (ids.length === 0) return null;
  const required = new Set(
    Array.isArray(schema.required) ? schema.required.filter((r: unknown) => typeof r === "string") : [],
  );
  const fields: ElicitationField[] = [];
  for (const id of ids) {
    const prop = props[id];
    if (!prop || typeof prop !== "object") return null;
    const label = typeof prop.title === "string" && prop.title ? prop.title : id;
    const description = typeof prop.description === "string" ? prop.description : undefined;
    const field: ElicitationField = { id, label, description, required: required.has(id), kind: "text" };
    const enumVals = Array.isArray(prop.enum) ? prop.enum : null;
    const oneOf = Array.isArray(prop.oneOf) ? prop.oneOf : null;
    if (enumVals && enumVals.length > 0) {
      // Legacy enum: { enum: [...], enumNames?: [...] }
      const names = Array.isArray(prop.enumNames) ? prop.enumNames : [];
      const options: ElicitationField["options"] = [];
      for (let i = 0; i < enumVals.length; i++) {
        const v = enumVals[i];
        if (typeof v !== "string" && typeof v !== "boolean") return null;
        options.push({
          label: typeof names[i] === "string" ? (names[i] as string) : String(v),
          value: v as string | boolean,
        });
      }
      field.kind = "select";
      field.options = options;
      if (prop.default !== undefined && options.some((o) => o.value === prop.default)) {
        field.defaultValue = prop.default as string | boolean;
      }
    } else if (oneOf && oneOf.length > 0) {
      // Single-select enum: { oneOf: [{ const, title? }] }
      const options: ElicitationField["options"] = [];
      for (const entry of oneOf) {
        if (!entry || typeof entry !== "object" || entry.const === undefined) return null;
        if (typeof entry.const !== "string" && typeof entry.const !== "boolean") return null;
        options.push({
          label: typeof entry.title === "string" ? entry.title : String(entry.const),
          value: entry.const as string | boolean,
        });
      }
      field.kind = "select";
      field.options = options;
      if (prop.default !== undefined && options.some((o) => o.value === prop.default)) {
        field.defaultValue = prop.default as string | boolean;
      }
    } else if (prop.type === "string") {
      field.kind = "text";
      field.secret = prop.format === "password";
      if (typeof prop.default === "string") field.defaultValue = prop.default;
    } else if (prop.type === "boolean") {
      field.kind = "select";
      field.options = [
        { label: "True", value: true },
        { label: "False", value: false },
      ];
      if (typeof prop.default === "boolean") field.defaultValue = prop.default;
    } else {
      // Numbers, multi-select enums and unknown shapes are not rendered by
      // the TUI either — fall back to the Allow/Deny card.
      return null;
    }
    fields.push(field);
  }
  return fields;
}

/** Dedupes the "output truncated" notice per process. */
const cappedProcessNotices = new Set<string>();

function decodeBase64ToText(b64: string): string {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

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
        params?.reason ??
        fallbackTitle[method] ??
        "Agent question",
    ),
    options: Array.isArray(params?.options) ? params.options.map((o: Raw) => String(o)) : undefined,
    requestId: reqId,
    method,
    params,
  };
  if (h.onQuestion) h.onQuestion(q, reqId);
}

/** Shared event dispatch for runTurn and attachToRunningTurn. */
function dispatchEvent(
  h: TurnHandlers,
  threadId: string,
  method: string,
  params: Raw,
  reqId: number | string | undefined,
  off: () => void,
) {
  const eventThreadId = params?.threadId ?? params?.thread_id;
  if (eventThreadId && eventThreadId !== threadId) return;
  const item = params?.item as Raw | undefined;

  switch (method) {
    case "turn/started": {
      const turnId = params?.turn?.id ?? params?.turnId;
      if (turnId && h.onTurnStarted) h.onTurnStarted(String(turnId));
      return;
    }
    case "thread/queue/changed":
      if (h.onQueueChanged) h.onQueueChanged();
      return;
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
    case "item/commandExecution/terminalInteraction": {
      // Protocol: flat { threadId, turnId, itemId, processId, stdin } — text is in `stdin`.
      const stdinText = str(params?.stdin ?? "");
      if (stdinText) {
        h.onDelta(String(params?.itemId ?? params?.id ?? ""), stdinText, "output");
      }
      break;
    }
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
}

/** Sends a prompt and streams every live event for that thread until the turn completes. */
export async function runTurn(
  rpc: RpcClient,
  threadId: string,
  text: string,
  opts: { model?: string; effort?: string },
  h: TurnHandlers,
) {
  const off = rpc.on(({ method, params, id: reqId }) => dispatchEvent(h, threadId, method, params, reqId, off));

  // One client message id per send — lets the server dedupe retries.
  const clientUserMessageId = `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const turnStartPayload = {
    threadId,
    input: [{ type: "text", text, text_elements: [] }],
    clientUserMessageId,
    ...(opts.model ? { model: opts.model } : {}),
    ...(opts.effort ? { effort: opts.effort } : {}),
  };

  const fireTurnStarted = (res: Raw) => {
    if (res?.turn?.id && h.onTurnStarted) h.onTurnStarted(String(res.turn.id));
  };

  try {
    // Best-effort: revive the thread server-side before starting the turn.
    try {
      await rpc.call("thread/resume", { threadId });
    } catch {
      /* thread may already be live; turn/start is authoritative */
    }
    fireTurnStarted(await rpc.call<Raw>("turn/start", turnStartPayload));
  } catch (e) {
    const errText = formatCoreError(e);
    if (/thread not found/i.test(errText)) {
      // The server lost the thread (restart/eviction): revive it, then retry once.
      try {
        await rpc.call("thread/resume", { threadId });
        fireTurnStarted(await rpc.call<Raw>("turn/start", turnStartPayload));
        h.onNotice("Session was revived on the server — continuing here.", "info");
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
  const off = rpc.on(({ method, params, id: reqId }) => dispatchEvent(h, threadId, method, params, reqId, off));
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

/**
 * Responds to a server approval/elicitation request with the structured
 * response the protocol expects. Unlike answerQuestion, this does NOT
 * steer or start a new turn — the server resumes the paused turn itself.
 */
export function answerApproval(
  rpc: RpcClient,
  requestId: number | string | undefined,
  method: string,
  approved: boolean,
  params?: Raw,
  content?: Record<string, unknown> | null,
): void {
  if (requestId == null) return;
  let response: Record<string, unknown> | null = null;
  switch (method) {
    case "item/commandExecution/requestApproval":
    case "item/fileChange/requestApproval":
      response = { decision: approved ? "accept" : "decline" };
      break;
    case "item/permissions/requestApproval":
      response = approved
        ? { permissions: params?.permissions ?? {}, scope: "turn" }
        : { permissions: {}, scope: "turn" };
      break;
    case "mcpServer/elicitation/request":
      response = {
        action: approved ? "accept" : "decline",
        // Form-mode elicitations carry the filled fields on accept; the TUI
        // sends content only for accept, null for decline/cancel.
        content: approved ? (content ?? null) : null,
      };
      break;
    default:
      return;
  }
  rpc.respond(requestId, response);
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
