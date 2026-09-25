import type { RpcClient } from "../rpc-client";
import type { MessagePart, PlanStep, TurnStats } from "../types";
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
  const off = rpc.on(({ method, params }) => {
    if (params.threadId && params.threadId !== threadId) return;
    const item = params.item as Raw | undefined;
    switch (method) {
      case "item/started":
      case "item/completed": {
        const p = item && itemToPart(item, method === "item/started" ? "running" : "done");
        if (p) h.onPart(p);
        break;
      }
      case "item/agentMessage/delta":
        h.onDelta(String(params.itemId ?? ""), String(params.delta ?? ""), "text");
        break;
      case "item/reasoning/summaryTextDelta":
      case "item/reasoning/textDelta":
        h.onDelta(String(params.itemId ?? ""), String(params.delta ?? ""), "reasoning");
        break;
      case "item/reasoning/summaryPartAdded":
        h.onDelta(String(params.itemId ?? ""), "\n\n", "reasoning");
        break;
      case "item/commandExecution/outputDelta":
      case "command/exec/outputDelta":
        h.onDelta(String(params.itemId ?? params.processId ?? ""), String(params.delta ?? params.chunk ?? ""), "output");
        break;
      case "turn/plan/updated":
        h.onPlan(toPlanSteps((params.plan as Raw[]) ?? []), params.explanation ? String(params.explanation) : undefined);
        break;
      case "thread/goal/updated": {
        const g = (params.goal ?? params) as Raw;
        const objective = String(g.objective ?? g.text ?? g.title ?? "");
        if (objective) h.onPlan([{ text: objective, status: g.status === "completed" || g.completed ? "done" : "active" }], "Goal");
        break;
      }
      case "thread/tokenUsage/updated": {
        const t = (params.tokenUsage as Raw)?.total;
        if (t) h.onStats({ totalTokens: t.totalTokens, outputTokens: t.outputTokens });
        break;
      }
      case "warning": {
        const msg = formatCoreError(params, "Warning");
        // Known harmless server noise for custom model combos.
        if (!/^Model metadata for .* not found/.test(msg)) h.onNotice(msg, "warning");
        break;
      }
      case "error": {
        const msg = formatCoreError(params.error ?? params);
        // Core retries some failures itself (e.g. stream disconnects) — show, but keep the turn alive.
        if (params.willRetry) {
          h.onNotice(`${msg}\nRetrying…`, "warning");
          break;
        }
        off();
        h.onDone(msg);
        break;
      }
      case "turn/completed": {
        off();
        const turn = params.turn as Raw;
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
    off();
    h.onDone(formatCoreError(e));
  }
  return off;
}

export const interruptTurn = (rpc: RpcClient, threadId: string) => rpc.call("turn/interrupt", { threadId });
