import type { AgentQuestion, MessagePart, PlanStep } from "../types";
import { URL } from "url";

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

/** Parses a JSON object embedded at the start of a tool output string. */
function leadingJsonObject(text: string): Raw | undefined {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("{")) return undefined;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parseDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.split("/")[0] ?? url;
  }
}

/** Extracts a human-readable summary from any structured tool input object. */
function summaryFromObject(obj: Raw): string {
  if (!obj || typeof obj !== "object") return "";
  if (obj.path) return str(obj.path).split("/").pop() || str(obj.path);
  if (obj.file) return str(obj.file).split("/").pop() || str(obj.file);
  if (obj.query) return `"${str(obj.query).slice(0, 40)}"`;
  if (obj.pattern) return `"${str(obj.pattern).slice(0, 40)}"`;
  if (obj.domain) return str(obj.domain);
  if (obj.url) return parseDomain(str(obj.url));
  if (obj.command) return (str(obj.command).split("\n")[0] ?? "").slice(0, 60);
  if (obj.name) return str(obj.name);
  return "";
}

export function toPlanSteps(list: Raw[]): PlanStep[] {
  return (list ?? []).map((s) => {
    const st = str(s.status).toLowerCase();
    const isDone = s.completed || st === "completed" || st === "done";
    const isActive = st === "inprogress" || st === "in_progress" || st === "active";
    const isCancelled = st === "cancelled" || st === "canceled" || st === "abandoned";
    const status: PlanStep["status"] = isDone ? "done" : isActive ? "active" : isCancelled ? "cancelled" : "pending";
    return { text: str(s.step ?? s.content ?? s.text ?? s.title), status };
  }).filter((s) => s.text);
}

/** Converts one server "item" into a UI part. Shared by history and live streaming. */
export function extractQuestions(item: Raw): AgentQuestion[] | undefined {
  if (Array.isArray(item?.questions) && item.questions.length > 0) {
    return item.questions
      .map((q: Raw, idx: number) => ({
        id: str(q.id || `q_${idx}`),
        title: str(q.title || q.question || q.text || ""),
        options: Array.isArray(q.options) ? q.options.map((o: unknown) => str(o)) : undefined,
      }))
      .filter((q: AgentQuestion) => q.title);
  }
  return undefined;
}

export function itemToPart(item: Raw, fallback: MessagePart["status"] = "done"): MessagePart | null {
  const id = str(item.id, crypto.randomUUID());
  const type = str(item.type);
  const status = itemStatus(item, fallback);
  const questions = extractQuestions(item);
  switch (type) {
    case "userMessage":
      return null;
    case "agentMessage":
      return { id, kind: questions ? "question" : "text", text: str(item.text), status, meta: questions ? { questions } : undefined };
    case "question":
    case "elicitation":
    case "elicitationRequest": {
      const qs = questions ?? [
        {
          id,
          title: str(item.title ?? item.question ?? item.message, "Agent question"),
          options: Array.isArray(item.options) ? item.options.map((o: unknown) => str(o)) : undefined,
        },
      ];
      return { id, kind: "question", text: qs[0]?.title ?? "Question", status, meta: { questions: qs } };
    }
    case "reasoning": {
      // Server sends summary/content as part objects ({ type, text }) — never
      // join() them directly or the UI would render "[object Object]".
      const partText = (v: unknown): string =>
        Array.isArray(v)
          ? v
              .map((e) => (typeof e === "string" ? e : str((e as Raw)?.text)))
              .filter(Boolean)
              .join("\n\n")
          : "";
      const s = partText(item.summary) || partText(item.content) || str(item.text);
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
      // changes may be objects ({path, kind, diff}) or legacy pairs (HashMap entries).
      const files = changes.map((c: Raw) => ({
        path: str(c.path ?? c.file ?? ""),
        kind: str(c.kind?.type ?? c.kind ?? "update"),
        diff: str(c.diff ?? c.unified_diff ?? ""),
      }));
      return { id, kind: "tool", text: "", toolName: "File change", input: item.changes, status, meta: { files } };
    }
    case "functionCallOutput": {
      // Inbuilt extension tools (browser, view_image, tool_search, ...) arrive
      // as FunctionCallOutput items — distinct from MCP tool calls.
      const outputBody = item.output;
      const outText = typeof outputBody === "string"
        ? outputBody
        : Array.isArray(outputBody?.contentItems ?? outputBody)
          ? (outputBody.contentItems ?? outputBody)
              .map((c: Raw) => str(c?.text ?? "")).filter(Boolean).join("\n")
          : str(outputBody?.body ?? outputBody?.text ?? "");
      const ok = outputBody?.success !== false;
      const toolRaw = str(item.name, "Tool");
      const toolLower = toolRaw.toLowerCase();
      const args = item.arguments ?? {};
      const outputObj = leadingJsonObject(outText);
      let toolName = toolRaw.replace(/_/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase());
      let metaCommand: string | undefined = undefined;
      let input: Raw = args;
      if (toolLower === "browser" || toolLower === "browser_subagent") {
        toolName = "Browser";
        const action = str(args?.action ?? outputObj?.action, "open");
        const url = str(args?.url ?? outputObj?.url);
        metaCommand = [action, url ? parseDomain(url) : str(outputObj?.title, "").slice(0, 50)].filter(Boolean).join(" ");
        input = url || outputObj?.url || args;
      } else if (toolLower === "view_image") {
        toolName = "View image";
        const path = str(args?.path ?? args?.filePath);
        metaCommand = path.split("/").pop() || path;
        input = path || args;
      } else if (toolLower === "tool_search" || toolLower === "tool_search_tool") {
        toolName = "Tool search";
        metaCommand = str(args?.query ?? args?.pattern) || undefined;
      } else if (toolLower === "attach_media") {
        toolName = "Attach media";
        const p = str(args?.path);
        metaCommand = p.split("/").pop() || p;
      }
      return {
        id, kind: "tool", text: "", toolName, input, status: ok ? status : "error",
        output: outText,
        meta: {
          server: str(item.namespace) || undefined,
          command: metaCommand,
          durationMs: num(item.durationMs),
        },
      };
    }
    case "mcpToolCall": {
      const mcpToolRaw = str(item.tool, "MCP tool");
      const server = str(item.server) || undefined;
      // Normalize MCP tools that semantically belong to a richer card.
      const toolLower = mcpToolRaw.toLowerCase();
      const serverLower = (server ?? "").toLowerCase();
      let toolName = mcpToolRaw;
      let toolMetaCommand: string | undefined = undefined;
      if (toolLower.includes("browser") || toolLower.includes("navigate") || serverLower.includes("puppeteer")) {
        toolName = "Browser";
        const args = item.arguments ?? {};
        const url = str(args?.url ?? args?.href ?? "");
        if (url) toolMetaCommand = `navigate ${parseDomain(url)}`.trim();
      }
      return {
        id, kind: "tool", text: "", toolName, input: item.arguments, status,
        output: item.error ? str(item.error?.message ?? item.error) : mcpResultText(item.result),
        meta: { server, durationMs: num(item.durationMs), command: toolMetaCommand },
      };
    }
    case "webSearch": {
      const action = item.action ?? {};
      const q = str(item.query) || str(action.query) || (Array.isArray(action.queries) ? action.queries.join(", ") : "");
      const url = str(action.url);
      const pattern = str(action.pattern);
      const actionLabel = str(action.type);
      let sub = q ? `"${q.slice(0, 50)}"` : url ? parseDomain(url) : pattern ? `find "${pattern.slice(0, 40)}"` : "";
      if (actionLabel === "openPage" && url) sub = url.slice(0, 60);
      if (actionLabel === "findInPage" && url) sub = `${parseDomain(url)} · "${pattern.slice(0, 30)}"`;
      return { id, kind: "tool", text: "", toolName: "Web search", input: q || url, status, output: str(item.output ?? ""), meta: { command: sub || "web search" } };
    }
    case "webView":
    case "webViewToolCall":
    case "browserUse": {
      const url = str(item.url ?? item.arguments?.url ?? "");
      const domain = parseDomain(url) || str(item.domain);
      const action = str(item.action ?? item.tool ?? "navigate");
      return { id, kind: "tool", text: "", toolName: "Browser", input: url || domain, status, output: str(item.output ?? item.result ?? ""), meta: { command: `${action} ${domain}`.trim() } };
    }
    case "imageGeneration": {
      const revised = str(item.revised_prompt ?? item.revisedPrompt);
      const savedPath = str(item.saved_path ?? item.savedPath);
      const failure = item.failure ? str(item.failure?.message ?? item.failure) : "";
      return {
        id,
        kind: "tool",
        text: "",
        toolName: "Generate image",
        input: revised || savedPath,
        status: failure ? "error" : status,
        output: failure || (savedPath ? `Saved to ${savedPath}` : str(item.result ?? "")),
        meta: { command: revised ? revised.slice(0, 60) : "image generation" },
      };
    }
    case "imageView":
    case "viewImage": {
      const path = str(item.path ?? item.arguments?.path);
      return {
        id, kind: "tool", text: "", toolName: "View image",
        input: path, status,
        output: str(item.output ?? ""),
        meta: { command: path.split("/").pop() || path },
      };
    }
    case "sleep": {
      const ms = num(item.durationMs ?? item.duration_ms);
      return {
        id, kind: "tool", text: "", toolName: "Sleep",
        input: ms, status,
        meta: { command: ms ? (ms >= 1000 ? `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s wait` : `${ms}ms wait`) : "wait", durationMs: ms },
      };
    }
    case "dynamicToolCall": {
      const tool = str(item.tool, "Tool");
      const ns = str(item.namespace);
      const args = item.arguments ?? {};
      const summary = summaryFromObject(args);
      return {
        id, kind: "tool", text: "", toolName: ns ? `${ns} · ${tool}` : tool,
        input: args, status,
        output: str(item.output ?? ""),
        meta: { command: summary || undefined, durationMs: num(item.durationMs) },
      };
    }
    case "collabAgentToolCall": {
      const tool = str(item.tool, "collab");
      const pretty = tool.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
      const receivers = Array.isArray(item.receiver_thread_ids ?? item.receiverThreadIds) ? (item.receiver_thread_ids ?? item.receiverThreadIds).length : 0;
      const sub = [pretty.charAt(0).toUpperCase() + pretty.slice(1), receivers ? `${receivers} agent${receivers > 1 ? "s" : ""}` : "", str(item.prompt ?? "").slice(0, 40)].filter(Boolean).join(" · ");
      return {
        id, kind: "tool", text: "", toolName: "Collab agent",
        input: item, status,
        meta: { command: sub || tool },
      };
    }
    case "subAgentActivity": {
      const kind = str(item.kind ?? "activity");
      const path = str(item.agent_path ?? item.agentPath);
      const shortPath = path.split("/").filter(Boolean).slice(-2).join("/");
      return {
        id, kind: "tool", text: "", toolName: "Sub-agent",
        input: item, status,
        meta: { command: `${kind.charAt(0).toUpperCase()}${kind.slice(1)}${shortPath ? ` · ${shortPath}` : ""}` },
      };
    }
    case "hookPrompt": {
      const frags = Array.isArray(item.fragments) ? item.fragments : [];
      const hookRunId = frags[0]?.hook_run_id ?? frags[0]?.hookRunId;
      const combined = frags.map((f: Raw) => str(f.text)).filter(Boolean).join(" ");
      return {
        id, kind: "notice",
        text: combined || "Hook prompt injected",
        status, meta: { tone: "info", command: hookRunId ? `hook: ${str(hookRunId).slice(0, 20)}` : undefined },
      };
    }
    case "enteredReviewMode":
    case "enteredReview":
      return { id, kind: "notice", text: `Review mode started — ${str(item.review ?? item.text ?? "reviewing changes")}`, status, meta: { tone: "info" } };
    case "exitedReviewMode":
    case "exitedReview":
      return { id, kind: "notice", text: `Review complete — ${str(item.review ?? item.text ?? "changes applied")}`, status, meta: { tone: "info" } };
    case "todoList":
    case "plan":
      return { id, kind: "plan", text: str(item.explanation ?? item.title ?? item.text), status, meta: { steps: toPlanSteps(item.items ?? item.plan ?? []) } };
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
