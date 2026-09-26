import type { AgentQuestion, MediaItem, MessagePart, PlanStep } from "../types";

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
  if (s === "inProgress" || s === "in_progress") return fallback === "done" ? "done" : "running";
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
    const st = str(s.status).toLowerCase();
    const isDone = s.completed || st === "completed" || st === "done";
    const isActive = st === "inprogress" || st === "in_progress" || st === "active";
    const isCancelled = st === "cancelled" || st === "canceled" || st === "abandoned";
    return {
      text: str(s.step ?? s.content ?? s.text ?? s.title),
      status: isDone ? "done" : isActive ? "active" : isCancelled ? "cancelled" : "pending",
    } as PlanStep;
  }).filter((s) => s.text);
}

export function extractMediaFromText(text: string): MediaItem[] {
  if (!text) return [];
  const media: MediaItem[] = [];

  // 1. Markdown images: ![alt](url)
  const mdImgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/var\/[^\s)]+|file:\/\/[^\s)]+|data:image\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = mdImgRegex.exec(text)) !== null) {
    if (m[2]) {
      media.push({ type: "image", url: m[2], name: m[1] || "Image" });
    }
  }

  // 2. Direct URLs / media file paths
  const mediaFileRegex = /(https?:\/\/[^\s"'<>]+\.(png|jpe?g|gif|webp|svg|mp4|webm|mov|mp3|wav|ogg|m4a|pdf|json|csv|zip))(?=[^a-zA-Z0-9]|$)/gi;
  while ((m = mediaFileRegex.exec(text)) !== null) {
    const url = m[1];
    const ext = m[2]?.toLowerCase();
    if (!url || !ext) continue;
    if (media.some((item) => item.url === url)) continue;
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
      media.push({ type: "image", url, name: url.split("/").pop() });
    } else if (["mp4", "webm", "mov"].includes(ext)) {
      media.push({ type: "video", url, name: url.split("/").pop() });
    } else if (["mp3", "wav", "ogg", "m4a"].includes(ext)) {
      media.push({ type: "audio", url, name: url.split("/").pop() });
    } else {
      media.push({ type: "file", url, name: url.split("/").pop() });
    }
  }

  return media;
}

export function extractQuestions(item: Raw): AgentQuestion[] | undefined {
  if (Array.isArray(item?.questions) && item.questions.length > 0) {
    return item.questions.map((q: Raw, idx: number) => ({
      id: str(q.id || `q_${idx}`),
      title: str(q.title || q.question || q.text || ""),
      options: Array.isArray(q.options) ? q.options.map((o: unknown) => str(o)) : undefined,
    })).filter((q: AgentQuestion) => q.title);
  }
  return undefined;
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
  const id = item?.id ? String(item.id) : (item?.itemId ? String(item.itemId) : generatePartId());
  const type = str(item.type);
  const status = itemStatus(item, fallback);
  const questions = extractQuestions(item);

  switch (type) {
    case "userMessage":
      return null;
    case "agentMessage": {
      const text = str(item.text ?? item.content ?? "");
      const media = extractMediaFromText(text);
      return {
        id,
        kind: questions ? "question" : "text",
        text,
        status,
        meta: {
          media: media.length ? media : undefined,
          questions,
        },
      };
    }
    case "question":
    case "elicitation":
    case "elicitationRequest": {
      const qs = questions || [{
        id: str(item.id || id),
        title: str(item.title || item.question || item.message || "Agent question"),
        options: Array.isArray(item.options) ? item.options.map((o: unknown) => str(o)) : undefined,
      }];
      return {
        id,
        kind: "question",
        text: qs[0]?.title || "Question",
        status,
        meta: { questions: qs },
      };
    }
    case "reasoning": {
      const s = Array.isArray(item.summary) ? item.summary.join("\n\n") : str(item.summary ?? item.text ?? "");
      return { id, kind: "reasoning", text: s, status };
    }
    case "commandExecution": {
      const command = prettyCommand(item.command);
      return {
        id, kind: "tool", text: "", toolName: "Terminal", input: command, status,
        output: str(item.aggregatedOutput ?? item.output ?? ""),
        meta: { command, cwd: str(item.cwd) || undefined, exitCode: num(item.exitCode), durationMs: num(item.durationMs) },
      };
    }
    case "fileChange": {
      const changes = Array.isArray(item.changes) ? item.changes : [];
      const files = changes.map((c: Raw) => ({ path: str(c.path), kind: str(c.kind?.type ?? c.kind ?? "update") }));
      return { id, kind: "tool", text: "", toolName: "File change", input: item.changes, status, meta: { files } };
    }
    case "mcpToolCall": {
      const out = item.error ? str(item.error?.message ?? item.error) : mcpResultText(item.result);
      const media = extractMediaFromText(out);
      return {
        id, kind: "tool", text: "", toolName: str(item.tool, "MCP tool"), input: item.arguments, status,
        output: out,
        meta: {
          server: str(item.server) || undefined,
          durationMs: num(item.durationMs),
          media: media.length ? media : undefined,
        },
      };
    }
    case "browser":
    case "browserToolCall": {
      const out = str(item.output ?? item.result ?? "");
      const media = extractMediaFromText(out);
      // Check for base64 screenshot
      const ss = item.screenshot ?? item.result?.screenshot ?? item.image;
      if (typeof ss === "string" && ss.startsWith("data:image/")) {
        media.push({ type: "image", url: ss, name: "Browser screenshot" });
      }
      return {
        id, kind: "tool", text: "", toolName: "Browser", input: item.arguments, status,
        output: out,
        meta: {
          durationMs: num(item.durationMs),
          media: media.length ? media : undefined,
        },
      };
    }
    case "webSearch":
      return { id, kind: "tool", text: "", toolName: "Web search", input: str(item.query), status, meta: { command: str(item.query) } };
    case "todoList":
    case "plan":
      return { id, kind: "plan", text: "", status, meta: { steps: toPlanSteps(item.items ?? item.plan ?? []) } };
    case "contextCompaction":
      return { id, kind: "notice", text: "Context compacted to keep the conversation going", status, meta: { tone: "info" } };
    case "error":
      return { id, kind: "notice", text: str(item.message, "Error"), status: "error", meta: { tone: "error" } };
    default: {
      const out = str(item.output ?? item.result ?? "");
      const media = extractMediaFromText(out);
      return {
        id, kind: "tool", text: "", toolName: str(item.tool) || str(item.name) || type || "Step",
        input: item.arguments ?? item, output: out, status,
        meta: { media: media.length ? media : undefined },
      };
    }
  }
}
