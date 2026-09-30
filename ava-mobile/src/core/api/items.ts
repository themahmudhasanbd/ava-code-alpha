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
  if (typeof item.exitCode === "number") {
    return item.exitCode === 0 ? "done" : "error";
  }
  if (s === "completed" || s === "done" || s === "success") return "done";
  if (s === "inProgress" || s === "in_progress") {
    return fallback === "done" ? "done" : "running";
  }
  return fallback;
}

function mcpResultText(result: Raw): string {
  if (result == null) return "";
  if (typeof result === "string") return result;
  const content = result.content ?? result.Ok?.content;
  if (Array.isArray(content)) {
    return content
      .map((c: Raw) => {
        if (c.type === "text") return str(c.text ?? "");
        if (c.type === "image") return `[Image: ${c.mimeType || "image/png"}]`;
        if (c.type === "resource") return str(c.resource?.uri ?? c.resource?.text ?? "[Resource]");
        return str(c.text ?? "");
      })
      .filter(Boolean)
      .join("\n");
  }
  return JSON.stringify(result, null, 2);
}

export function toPlanSteps(list: Raw[]): PlanStep[] {
  return (list ?? [])
    .map((s) => {
      const st = str(s.status).toLowerCase();
      const isDone = s.completed || st === "completed" || st === "done";
      const isActive = st === "inprogress" || st === "in_progress" || st === "active";
      const isCancelled = st === "cancelled" || st === "canceled" || st === "abandoned";
      return {
        text: str(s.step ?? s.content ?? s.text ?? s.title),
        status: isDone ? "done" : isActive ? "active" : isCancelled ? "cancelled" : "pending",
      } as PlanStep;
    })
    .filter((s) => s.text);
}

function cleanMediaUrl(raw: string): string {
  return raw.trim().replace(/^['"`<(\[]+|['"`>)\].,;:]+$/g, "");
}

export function extractMediaFromText(
  text: string,
  options: { allowLocalFilePaths?: boolean } = { allowLocalFilePaths: true }
): MediaItem[] {
  if (!text) return [];
  const media: MediaItem[] = [];
  const seen = new Set<string>();

  const add = (item: MediaItem) => {
    if (!item.url) return;
    const cleanUrl = cleanMediaUrl(item.url);
    if (!cleanUrl) return;
    const key = cleanUrl.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      const name = item.name ? cleanMediaUrl(item.name) : cleanUrl.split("/").pop() || "Image";
      media.push({ ...item, url: cleanUrl, name });
    }
  };

  // 1. Markdown images: ![alt](url)
  const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = mdImgRegex.exec(text)) !== null) {
    const rawUrl = (m[2] || "").trim();
    if (rawUrl) {
      add({ type: "image", url: rawUrl, name: m[1] || rawUrl.split("/").pop() || "Image" });
    }
  }

  // 2. Base64 data URLs: data:image/...;base64,...
  const dataImgRegex = /(data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+)/g;
  while ((m = dataImgRegex.exec(text)) !== null) {
    const dataUrl = m[1];
    if (dataUrl && dataUrl.length > 30) {
      add({ type: "image", url: dataUrl, name: "Screenshot" });
    }
  }

  // 3. Absolute local image file paths: /root/..., /var/www/..., /home/..., /tmp/..., /temp/...
  if (options.allowLocalFilePaths !== false) {
    const localImgRegex = /(?:^|[\s"'(])(\/(?:root|var\/www|home|tmp|temp)\/[^\s"')`]+\.(png|jpe?g|gif|webp|svg))(?=[^a-zA-Z0-9]|$)/gi;
  while ((m = localImgRegex.exec(text)) !== null) {
    const path = m[1]?.trim();
    if (path && !path.includes("node_modules") && !path.includes("/.")) {
      add({ type: "image", url: path, name: path.split("/").pop() || "Image" });
    }
  }
  }

  // 4. Direct URLs / media file paths (http/https)
  const mediaFileRegex = /(https?:\/\/[^\s"'<>`]+\.(png|jpe?g|gif|webp|svg|mp4|webm|mov|mp3|wav|ogg|m4a|pdf|json|csv|zip))(?=[^a-zA-Z0-9]|$)/gi;
  while ((m = mediaFileRegex.exec(text)) !== null) {
    const url = m[1]?.trim();
    const ext = m[2]?.toLowerCase();
    if (!url || !ext) continue;
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
      add({ type: "image", url, name: url.split("/").pop() });
    } else if (["mp4", "webm", "mov"].includes(ext)) {
      add({ type: "video", url, name: url.split("/").pop() });
    } else if (["mp3", "wav", "ogg", "m4a"].includes(ext)) {
      add({ type: "audio", url, name: url.split("/").pop() });
    } else {
      add({ type: "file", url, name: url.split("/").pop() });
    }
  }

  return media;
}

export function extractMediaFromMcpContent(result: Raw): MediaItem[] {
  if (!result) return [];
  const media: MediaItem[] = [];
  const seen = new Set<string>();
  const content = result.content ?? result.Ok?.content ?? (Array.isArray(result) ? result : null);

  const add = (item: MediaItem) => {
    if (!item.url) return;
    const cleanUrl = cleanMediaUrl(item.url);
    if (!cleanUrl) return;
    const key = cleanUrl.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      media.push({ ...item, url: cleanUrl, name: item.name || "Screenshot" });
    }
  };

  if (Array.isArray(content)) {
    for (const c of content) {
      if (c && typeof c === "object") {
        if (c.type === "image" && c.data) {
          const mime = str(c.mimeType || "image/png");
          const url = c.data.startsWith("data:") ? c.data : `data:${mime};base64,${c.data}`;
          add({ type: "image", url, name: str(c.name || "Screenshot") });
        } else if (c.type === "resource" && c.resource?.blob) {
          const mime = str(c.resource.mimeType || "image/png");
          const url = `data:${mime};base64,${c.resource.blob}`;
          const name = c.resource.uri ? str(c.resource.uri).split("/").pop() || "Resource" : "Image";
          add({ type: "image", url, name });
        }
      }
    }
  }

  // Also check top-level screenshot / image fields
  const directScreenshot = result.screenshot ?? result.image ?? result.data;
  if (typeof directScreenshot === "string") {
    if (directScreenshot.startsWith("data:image/")) {
      add({ type: "image", url: directScreenshot, name: "Screenshot" });
    } else if (/\.(png|jpe?g|gif|webp|svg)(?=[?#]|$)/i.test(directScreenshot)) {
      add({ type: "image", url: directScreenshot, name: directScreenshot.split("/").pop() || "Screenshot" });
    }
  }

  return media;
}

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
/**
 * Extracts server-provided media from item.meta.media (e.g. from the attach_media
 * agent tool). Validates shape and normalizes to MediaItem.
 */
export function extractServerMetaMedia(meta: Raw): MediaItem[] {
  const raw = meta?.media;
  if (!Array.isArray(raw)) return [];
  const out: MediaItem[] = [];
  const validTypes = new Set(["image", "video", "audio", "file"]);
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const type = String((m as Raw).type ?? "");
    const url = String((m as Raw).url ?? "").trim();
    if (!validTypes.has(type) || !url) continue;
    out.push({
      type: type as MediaItem["type"],
      url,
      name: typeof (m as Raw).name === "string" ? ((m as Raw).name as string) : undefined,
      size: typeof (m as Raw).size === "number" ? ((m as Raw).size as number) : undefined,
      mimeType: typeof (m as Raw).mimeType === "string" ? ((m as Raw).mimeType as string) : undefined,
    });
  }
  return out;
}

/**
 * Merges text-extracted media with server-provided media, deduping by URL.
 */
export function mergeMediaItems(textMedia: MediaItem[], serverMedia: MediaItem[]): MediaItem[] {
  const seen = new Set(textMedia.map((m) => m.url));
  const merged = [...textMedia];
  for (const m of serverMedia) {
    if (!seen.has(m.url)) {
      seen.add(m.url);
      merged.push(m);
    }
  }
  return merged;
}

export function itemToPart(item: Raw, fallback: MessagePart["status"] = "done"): MessagePart | null {
  const id = item?.id ? String(item.id) : item?.itemId ? String(item.itemId) : generatePartId();
  const type = str(item.type);
  const status = itemStatus(item, fallback);
  const questions = extractQuestions(item);

  switch (type) {
    case "userMessage":
      return null;
    case "agentMessage": {
      const text = str(item.text ?? item.content ?? "");
      const media = mergeMediaItems(extractMediaFromText(text), extractServerMetaMedia(item.meta));
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
      const qs = questions || [
        {
          id: str(item.id || id),
          title: str(item.title || item.question || item.message || "Agent question"),
          options: Array.isArray(item.options) ? item.options.map((o: unknown) => str(o)) : undefined,
        },
      ];
      return {
        id,
        kind: "question",
        text: qs[0]?.title || "Question",
        status,
        meta: { questions: qs },
      };
    }
    case "reasoning": {
      // Protocol: summary: Vec<String> (always an array), content: Vec<String> fallback.
      const summaryParts = Array.isArray(item.summary) ? item.summary : [];
      const contentParts = Array.isArray(item.content) ? item.content : [];
      const parts = summaryParts.length ? summaryParts : contentParts;
      const s = parts.map((p: Raw) => str(p)).join("\n\n");
      return { id, kind: "reasoning", text: s, status };
    }
    case "commandExecution": {
      const command = prettyCommand(item.command);
      const outputText = str(item.aggregatedOutput ?? item.output ?? "");
      const isFailed = status === "error" || item.status === "failed" || (typeof item.exitCode === "number" && item.exitCode !== 0);
      const actions: Raw[] = Array.isArray(item.commandActions) ? item.commandActions : [];
      const primary = actions.find((a: Raw) => a.type && a.type !== "unknown") ?? actions[0];
      let toolName = "Terminal";
      if (primary?.type === "read") toolName = "File Read";
      else if (primary?.type === "listFiles") toolName = "List Files";
      else if (primary?.type === "search") toolName = "Search";

      // Do NOT extract media from the raw bash script/command itself.
      // Only extract from outputText if the command completed without error.
      const media = !isFailed ? extractMediaFromText(outputText, { allowLocalFilePaths: false }) : [];
      return {
        id,
        kind: "tool",
        text: "",
        toolName,
        input: command,
        status,
        output: outputText,
        meta: {
          command,
          cwd: str(item.cwd) || undefined,
          exitCode: num(item.exitCode),
          durationMs: num(item.durationMs),
          media: media.length ? media : undefined,
        },
      };
    }
    case "fileChange": {
      const changes = Array.isArray(item.changes) ? item.changes : [];
      const files = changes.map((c: Raw) => ({ path: str(c.path), kind: str(c.kind?.type ?? c.kind ?? "update") }));
      return { id, kind: "tool", text: "", toolName: "File change", input: item.changes, status, meta: { files } };
    }
    case "mcpToolCall": {
      const out = item.error ? str(item.error?.message ?? item.error) : mcpResultText(item.result);
      const rawToolName = str(item.tool, "MCP tool");
      const mcpMedia = extractMediaFromMcpContent(item.result);
      const textMedia = extractMediaFromText(out);
      const allMedia = [...mcpMedia, ...textMedia];

      // Check arguments for viewed image path or screenshot target
      const args = item.arguments;
      if (args && typeof args === "object") {
        if (args.path && typeof args.path === "string" && /\.(png|jpe?g|gif|webp|svg)(?=[?#]|$)/i.test(args.path)) {
          const p = cleanMediaUrl(args.path);
          if (p && !allMedia.some((m) => m.url.toLowerCase() === p.toLowerCase())) {
            allMedia.push({ type: "image", url: p, name: p.split("/").pop() || "Image" });
          }
        }
      }

      return {
        id,
        kind: "tool",
        text: "",
        toolName: rawToolName,
        input: item.arguments,
        status,
        output: out,
        meta: {
          server: str(item.server) || undefined,
          durationMs: num(item.durationMs),
          media: allMedia.length ? allMedia : undefined,
        },
      };
    }
    case "browser":
    case "browserToolCall": {
      const out = str(item.output ?? item.result ?? "");
      const media = [...extractMediaFromMcpContent(item.result), ...extractMediaFromText(out)];
      const ss = item.screenshot ?? item.result?.screenshot ?? item.image;
      if (typeof ss === "string") {
        const s = cleanMediaUrl(ss);
        if (s.startsWith("data:image/")) {
          if (!media.some((m) => m.url.toLowerCase() === s.toLowerCase())) {
            media.push({ type: "image", url: s, name: "Browser screenshot" });
          }
        } else if (/\.(png|jpe?g|gif|webp|svg)(?=[?#]|$)/i.test(s)) {
          if (!media.some((m) => m.url.toLowerCase() === s.toLowerCase())) {
            media.push({ type: "image", url: s, name: s.split("/").pop() || "Browser screenshot" });
          }
        }
      }
      return {
        id,
        kind: "tool",
        text: "",
        toolName: "Browser",
        input: item.arguments,
        status,
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
    case "imageGeneration": {
      const url = cleanMediaUrl(str(item.result ?? item.savedPath ?? item.url ?? ""));
      const media: MediaItem[] | undefined = url
        ? [{ type: "image", url, name: item.revisedPrompt ? str(item.revisedPrompt).slice(0, 60) : "Generated image" }]
        : undefined;
      return {
        id,
        kind: "tool",
        text: str(item.revisedPrompt ?? ""),
        toolName: "Image Generation",
        input: item.revisedPrompt || undefined,
        status,
        meta: { media, durationMs: num(item.durationMs) },
      };
    }
    case "imageView": {
      const path = cleanMediaUrl(str(item.path ?? item.arguments?.path ?? ""));
      const media: MediaItem[] | undefined = path
        ? [{ type: "image", url: path, name: path.split("/").pop() || "Viewed image" }]
        : undefined;
      return { id, kind: "tool", text: "", toolName: "View Image", input: path, status, meta: { media } };
    }
    case "dynamicToolCall": {
      const out = typeof item.output === "string" ? item.output : str(item.result ?? "");
      const media = [...extractMediaFromMcpContent(item.result), ...extractMediaFromText(out)];
      return {
        id,
        kind: "tool",
        text: "",
        toolName: str(item.tool ?? item.name ?? "Dynamic Tool"),
        input: item.arguments,
        output: out,
        status,
        meta: { durationMs: num(item.durationMs), media: media.length ? media : undefined },
      };
    }
    case "collabAgentToolCall": {
      const raw = str(item.tool ?? "agentAction");
      const label = raw.replace(/([A-Z])/g, " $1").replace(/^./, (c: string) => c.toUpperCase());
      return {
        id,
        kind: "tool",
        text: str(item.prompt ?? ""),
        toolName: `Agent · ${label}`,
        input: item.prompt || item.arguments || undefined,
        status,
        meta: { durationMs: num(item.durationMs) },
      };
    }
    case "subAgentActivity": {
      const k = str(item.kind ?? "activity");
      const agentPath = str(item.agentPath ?? item.agentThreadId ?? "");
      return {
        id,
        kind: "notice",
        text: agentPath ? `Sub-agent ${k}: ${agentPath}` : `Sub-agent ${k}`,
        status,
        meta: { tone: k === "interrupted" ? "warning" : k === "errored" ? "error" : "info" },
      };
    }
    case "enteredReviewMode":
      return {
        id,
        kind: "notice",
        text: `Entered review mode${item.review ? `: ${str(item.review)}` : ""}`,
        status,
        meta: { tone: "info" },
      };
    case "exitedReviewMode":
      return {
        id,
        kind: "notice",
        text: `Exited review mode${item.review ? `: ${str(item.review)}` : ""}`,
        status,
        meta: { tone: "info" },
      };
    case "extension": {
      const extKind = str(item.kind ?? "");
      if (extKind === "clock.sleep") {
        const dur = num(item.durationMs);
        return {
          id,
          kind: "notice",
          text: dur != null ? `Waiting ${(dur / 1000).toFixed(dur >= 60000 ? 0 : 1)}s` : "Sleeping…",
          status,
          meta: { tone: "info", durationMs: dur },
        };
      }
      if (extKind.includes("image") || extKind.includes("generation")) {
        const url = cleanMediaUrl(str(item.result ?? item.savedPath ?? ""));
        const media: MediaItem[] | undefined = url
          ? [{ type: "image", url, name: "Generated image" }]
          : undefined;
        return {
          id,
          kind: "tool",
          text: str(item.revisedPrompt ?? ""),
          toolName: "Image Generation",
          input: item.revisedPrompt || undefined,
          status,
          meta: { media, durationMs: num(item.durationMs) },
        };
      }
      if (extKind.includes("web") || extKind.includes("search")) {
        return {
          id,
          kind: "tool",
          text: "",
          toolName: "Web Search",
          input: str(item.query ?? item.action?.query ?? ""),
          status,
          meta: { command: str(item.query ?? "") },
        };
      }
      return {
        id,
        kind: "tool",
        text: "",
        toolName: str(extKind || "Extension"),
        input: item.arguments ?? item,
        status,
      };
    }
    case "hookPrompt":
      return { id, kind: "notice", text: "Hook executed", status, meta: { tone: "info" } };
    case "functionCallOutput": {
      let out = "";
      if (typeof item.output === "string") {
        out = item.output;
      } else if (Array.isArray(item.output)) {
        out = item.output
          .filter((c: Raw) => c.type === "input_text" || c.type === "text")
          .map((c: Raw) => str(c.text ?? ""))
          .filter(Boolean)
          .join("\n");
      }
      const name = str(item.name ?? item.tool ?? item.namespace ?? "Function");
      const media = extractMediaFromText(out);
      return { id, kind: "tool", text: "", toolName: name, output: out, status, meta: { media: media.length ? media : undefined } };
    }
    case "sleep": {
      const dur = num(item.durationMs);
      return {
        id,
        kind: "notice",
        text: dur != null ? `Waiting ${(dur / 1000).toFixed(dur >= 60000 ? 0 : 1)}s` : "Sleeping…",
        status,
        meta: { tone: "info", durationMs: dur },
      };
    }
    default: {
      const out = str(item.output ?? item.result ?? "");
      const media = [...extractMediaFromMcpContent(item.result), ...extractMediaFromText(out)];
      return {
        id,
        kind: "tool",
        text: "",
        toolName: str(item.tool) || str(item.name) || type || "Step",
        input: item.arguments ?? item,
        output: out,
        status,
        meta: { media: media.length ? media : undefined },
      };
    }
  }
}
