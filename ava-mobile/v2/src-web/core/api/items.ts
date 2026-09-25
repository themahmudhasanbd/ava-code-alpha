import type { MessagePart, PlanStep } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;
const str = (v: unknown, d = "") => (v == null ? d : String(v));
const num = (v: unknown) => (typeof v === "number" ? v : undefined);

/** "/bin/bash -lc 'ls -la'" → "ls -la" */
export function prettyCommand(cmd: unknown) {
  const c = Array.isArray(cmd) ? cmd.join(" ") : str(cmd);
  const m = c.match(/^\S*(?:bash|sh|zsh)\s+-l?c\s+(['"])([\s\S]*)\1$/);
  return m ? m[2]! : c;
}

function itemStatus(item: Raw, fallback: MessagePart["status"]): MessagePart["status"] {
  const s = str(item.status);
  if (s === "failed" || s === "declined" || s === "error") return "error";
  if (s === "inProgress" || s === "in_progress") return "running";
  if (s === "completed") return "done";
  return fallback;
}

function mcpResultText(result: Raw): string {
  if (result == null) return "";
  if (typeof result === "string") return result;
  const content = result.content ?? result.Ok?.content;
  if (Array.isArray(content)) return content.map((c: Raw) => str(c.text ?? "")).filter(Boolean).join("\n");
  return JSON.stringify(result, null, 2);
}

export function toPlanSteps(list: Raw[]): PlanStep[] {
  return (list ?? []).map((s) => {
    const st = str(s.status);
    return {
      text: str(s.step ?? s.text ?? s.title),
      status: s.completed || st === "completed" ? "done" : st === "inProgress" || st === "in_progress" ? "active" : "pending",
    } as PlanStep;
  }).filter((s) => s.text);
}

/** Converts one server "item" into a UI part. Shared by history and live streaming. */
function generatePartId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // ignore
    }
  }
  return `part_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Converts one server "item" into a UI part. Shared by history and live streaming. */
export function itemToPart(item: Raw, fallback: MessagePart["status"] = "done"): MessagePart | null {
  const id = item?.id ? String(item.id) : generatePartId();
  const type = str(item.type);
  const status = itemStatus(item, fallback);
  switch (type) {
    case "userMessage":
      return null;
    case "agentMessage":
      return { id, kind: "text", text: str(item.text), status };
    case "reasoning": {
      const s = Array.isArray(item.summary) ? item.summary.join("\n\n") : "";
      return { id, kind: "reasoning", text: s, status };
    }
    case "commandExecution": {
      const command = prettyCommand(item.command);
      return {
        id, kind: "tool", text: "", toolName: "Terminal", input: command, status,
        output: str(item.aggregatedOutput ?? ""),
        meta: { command, cwd: str(item.cwd) || undefined, exitCode: num(item.exitCode), durationMs: num(item.durationMs) },
      };
    }
    case "fileChange": {
      const changes = Array.isArray(item.changes) ? item.changes : [];
      const files = changes.map((c: Raw) => ({ path: str(c.path), kind: str(c.kind?.type ?? c.kind ?? "update") }));
      return { id, kind: "tool", text: "", toolName: "File change", input: item.changes, status, meta: { files } };
    }
    case "mcpToolCall":
      return {
        id, kind: "tool", text: "", toolName: str(item.tool, "MCP tool"), input: item.arguments, status,
        output: item.error ? str(item.error?.message ?? item.error) : mcpResultText(item.result),
        meta: { server: str(item.server) || undefined, durationMs: num(item.durationMs) },
      };
    case "webSearch":
      return { id, kind: "tool", text: "", toolName: "Web search", input: str(item.query), status, meta: { command: str(item.query) } };
    case "todoList":
    case "plan":
      return { id, kind: "plan", text: "", status, meta: { steps: toPlanSteps(item.items ?? item.plan ?? []) } };
    case "contextCompaction":
      return { id, kind: "notice", text: "Context compacted to keep the conversation going", status, meta: { tone: "info" } };
    case "error":
      return { id, kind: "notice", text: str(item.message, "Error"), status: "error", meta: { tone: "error" } };
    default:
      return {
        id, kind: "tool", text: "", toolName: str(item.tool) || str(item.name) || type || "Step",
        input: item.arguments ?? item, output: str(item.output ?? item.result ?? ""), status,
      };
  }
}
