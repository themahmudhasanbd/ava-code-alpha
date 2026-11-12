import type { AgentQuestion, MessagePart, PartMeta, PlanStep } from "../types";
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
    return url.replace(/^https?:\/\//i, "").split("/")[0] ?? url;
  }
}

export function isBrowserToolName(name: string): boolean {
  const n = (name || "").toLowerCase().trim();
  return (
    n === "browser" ||
    n === "browser_subagent" ||
    n === "browsersubagent" ||
    n === "agent-browser" ||
    n === "agent_browser" ||
    n.startsWith("puppeteer_") ||
    n.startsWith("playwright_") ||
    n.includes("browser")
  );
}

export function parseBrowserMeta(
  args: Raw,
  outText = "",
  outputObj?: Raw
): { command: string; meta: Partial<PartMeta> } {
  const action = str(args?.action ?? outputObj?.action ?? (args?.task ? "subagent" : "open")).toLowerCase();

  let url = str(args?.url ?? args?.target_url ?? args?.uri ?? outputObj?.url ?? outputObj?.currentUrl);
  if (!url && typeof args === "string" && args.startsWith("http")) {
    url = args;
  }
  if (!url && outText) {
    const urlMatch = outText.match(/https?:\/\/[^\s"'<>\)]+/i);
    if (urlMatch) url = urlMatch[0];
  }

  let viewport = str(args?.viewport ?? args?.profile ?? outputObj?.viewport);
  if (!viewport && args?.width && args?.height) {
    viewport = `${args.width}x${args.height}`;
  }

  let screenshotPath = str(
    args?.screenshot_path ??
    args?.screenshotPath ??
    outputObj?.screenshotPath ??
    outputObj?.screenshot_path ??
    outputObj?.path ??
    outputObj?.image_path
  );
  if (!screenshotPath && outText) {
    const shotMatch = outText.match(/(?:\/[\w.-]+)+\.(?:png|jpg|jpeg|webp)/i);
    if (shotMatch) screenshotPath = shotMatch[0];
  }

  const pageTitle = str(outputObj?.title ?? outputObj?.pageTitle ?? outputObj?.page_title);
  const ref = str(args?.ref ?? args?.submit_ref);
  const selector = str(args?.selector ?? args?.css_selector ?? args?.submit_selector);
  const code = str(args?.code ?? args?.script);

  const elementsCount =
    typeof outputObj?.elementsCount === "number"
      ? outputObj.elementsCount
      : Array.isArray(outputObj?.elements)
        ? outputObj.elements.length
        : undefined;

  let command = action.toUpperCase();
  if (url) {
    command += ` ${parseDomain(url)}`;
  } else if (action === "viewport" && viewport) {
    command += ` ${viewport}`;
  } else if (action === "click" && (ref || selector)) {
    command += ` ${ref ? `@${ref}` : selector}`;
  } else if (action === "fill" && (ref || selector)) {
    command += ` ${ref ? `@${ref}` : selector}`;
  } else if (action === "screenshot" && screenshotPath) {
    command += ` ${screenshotPath.split("/").pop()}`;
  } else if (args?.task_name) {
    command += ` ${str(args.task_name)}`;
  } else if (pageTitle) {
    command += ` "${pageTitle.slice(0, 40)}"`;
  }

  return {
    command,
    meta: {
      isBrowser: true,
      action,
      url: url || undefined,
      viewport: viewport || undefined,
      screenshotPath: screenshotPath || undefined,
      pageTitle: pageTitle || undefined,
      ref: ref || undefined,
      selector: selector || undefined,
      code: code || undefined,
      elementsCount,
    },
  };
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
      const outText = str(item.aggregatedOutput ?? "");
      const isBrowserCmd =
        command.startsWith("agent-browser") ||
        command.includes(" agent-browser") ||
        command.startsWith("npx agent-browser") ||
        command.startsWith("browser ") ||
        command.includes("browser_screenshot") ||
        (command.includes(".ava-media") && /\.(?:png|jpg|jpeg|webp)/i.test(command));

      if (isBrowserCmd) {
        let action = "open";
        if (/\bopen\b/i.test(command)) action = "open";
        else if (/\bscreenshot\b/i.test(command) || command.includes("browser_screenshot") || /\.(?:png|jpg|jpeg|webp)/i.test(command)) action = "screenshot";
        else if (/\bclick\b/i.test(command)) action = "click";
        else if (/\bfill\b/i.test(command)) action = "fill";
        else if (/\beval\b/i.test(command)) action = "eval";
        else if (/\bscroll\b/i.test(command)) action = "scroll";
        else if (/\bwait\b/i.test(command)) action = "wait";

        const urlMatch = command.match(/https?:\/\/[^\s"'<>\)]+/i) || outText.match(/https?:\/\/[^\s"'<>\)]+/i);
        const vpMatch = command.match(/--viewport\s+([^\s]+)/i);
        const allPngMatches = [...command.matchAll(/(?:\/[\w.-]+)+\.(?:png|jpg|jpeg|webp)/gi)];
        const lastShot = allPngMatches.length > 0 ? allPngMatches[allPngMatches.length - 1]![0] : undefined;
        const shotMatch =
          lastShot ||
          command.match(/screenshot(?:\s+([^\s'"]+\.(?:png|jpg|jpeg|webp)))?/i)?.[1] ||
          outText.match(/(?:\/[\w.-]+)+\.(?:png|jpg|jpeg|webp)/i)?.[0];

        const screenshotPath = shotMatch;
        const url = urlMatch ? urlMatch[0] : undefined;
        const viewport = vpMatch ? vpMatch[1] : undefined;

        const { command: browserCmd, meta: bMeta } = parseBrowserMeta(
          { action, url, viewport, screenshot_path: screenshotPath },
          outText,
          leadingJsonObject(outText)
        );

        return {
          id,
          kind: "tool",
          text: "",
          toolName: "Browser",
          input: url || command,
          status,
          output: outText,
          meta: {
            ...bMeta,
            command: browserCmd || command,
            cwd: str(item.cwd) || undefined,
            exitCode: num(item.exitCode),
            durationMs: num(item.durationMs),
          },
        };
      }

      return {
        id, kind: "tool", text: "", toolName: "Terminal", input: command, status,
        output: outText,
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
    case "functionCall":
    case "function_call":
    case "toolCall":
    case "customToolCall":
    case "custom_tool_call": {
      const toolRaw = str(item.name ?? item.tool ?? item.call?.name, "Tool");
      const args = item.arguments ?? item.args ?? item.call?.arguments ?? {};
      if (isBrowserToolName(toolRaw)) {
        const { command, meta: bMeta } = parseBrowserMeta(args, "");
        return {
          id,
          kind: "tool",
          text: "",
          toolName: "Browser",
          input: bMeta.url || args,
          status,
          output: "",
          meta: {
            ...bMeta,
            command,
            server: str(item.namespace) || undefined,
            durationMs: num(item.durationMs),
          },
        };
      }
      const summary = summaryFromObject(args);
      return {
        id,
        kind: "tool",
        text: "",
        toolName: toolRaw.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
        input: args,
        status,
        output: "",
        meta: {
          server: str(item.namespace) || undefined,
          command: summary || undefined,
          durationMs: num(item.durationMs),
        },
      };
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
      const toolRaw = str(item.name ?? item.tool, "Tool");
      const args = item.arguments ?? {};
      const outputObj = leadingJsonObject(outText);

      if (isBrowserToolName(toolRaw)) {
        const { command, meta: bMeta } = parseBrowserMeta(args, outText, outputObj);
        return {
          id,
          kind: "tool",
          text: "",
          toolName: "Browser",
          input: bMeta.url || args,
          status: ok ? status : "error",
          output: outText,
          meta: {
            ...bMeta,
            command,
            server: str(item.namespace) || undefined,
            durationMs: num(item.durationMs),
          },
        };
      }

      const toolLower = toolRaw.toLowerCase();
      let toolName = toolRaw.replace(/_/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase());
      let metaCommand: string | undefined = undefined;
      let input: Raw = args;
      if (toolLower === "view_image") {
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
      } else {
        metaCommand = summaryFromObject(args);
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
      const out = item.error ? str(item.error?.message ?? item.error) : mcpResultText(item.result);
      const args = item.arguments ?? {};
      if (isBrowserToolName(mcpToolRaw) || toolLower.includes("navigate") || serverLower.includes("puppeteer")) {
        const { command, meta: bMeta } = parseBrowserMeta(args, out, leadingJsonObject(out));
        return {
          id, kind: "tool", text: "", toolName: "Browser", input: bMeta.url || args, status,
          output: out,
          meta: { ...bMeta, server, durationMs: num(item.durationMs), command },
        };
      }
      return {
        id, kind: "tool", text: "", toolName, input: item.arguments, status,
        output: out,
        meta: { server, durationMs: num(item.durationMs), command: summaryFromObject(args) || undefined },
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
      const args = item.arguments ?? item;
      const out = str(item.output ?? item.result ?? "");
      const { command, meta: bMeta } = parseBrowserMeta(args, out, leadingJsonObject(out));
      return { id, kind: "tool", text: "", toolName: "Browser", input: bMeta.url || args, status, output: out, meta: { ...bMeta, command } };
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
      const out = str(item.output ?? "");
      if (isBrowserToolName(tool)) {
        const { command, meta: bMeta } = parseBrowserMeta(args, out, leadingJsonObject(out));
        return {
          id, kind: "tool", text: "", toolName: "Browser",
          input: bMeta.url || args, status,
          output: out,
          meta: { ...bMeta, command, durationMs: num(item.durationMs) },
        };
      }
      const summary = summaryFromObject(args);
      return {
        id, kind: "tool", text: "", toolName: ns ? `${ns} · ${tool}` : tool,
        input: args, status,
        output: out,
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
    case "exitedReviewMode":
    case "exitedReview":
      return { id, kind: "notice", text: `Review mode — ${str(item.review ?? item.text ?? "reviewing changes")}`, status, meta: { tone: "info" } };
    case "todoList":
    case "plan":
      return { id, kind: "plan", text: str(item.explanation ?? item.title ?? item.text), status, meta: { steps: toPlanSteps(item.items ?? item.plan ?? []) } };
    case "contextCompaction":
      return { id, kind: "notice", text: "Context compacted to keep the conversation going", status, meta: { tone: "info" } };
    case "error":
      return { id, kind: "notice", text: str(item.message, "Error"), status: "error", meta: { tone: "error" } };
    default: {
      const rawName = str(item.tool || item.name || type);
      const args = item.arguments ?? item;
      const out = str(item.output ?? item.result ?? "");
      if (isBrowserToolName(rawName)) {
        const { command, meta: bMeta } = parseBrowserMeta(args, out, leadingJsonObject(out));
        return {
          id,
          kind: "tool",
          text: "",
          toolName: "Browser",
          input: bMeta.url || args,
          output: out,
          status,
          meta: { ...bMeta, command },
        };
      }
      return {
        id, kind: "tool", text: "", toolName: rawName || "Step",
        input: args, output: out, status,
      };
    }
  }
}
