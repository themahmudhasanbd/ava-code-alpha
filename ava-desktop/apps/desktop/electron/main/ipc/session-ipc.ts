import { shell } from "electron";
import { isAbsolute, join, relative, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import {
  ErrorCodes,
  IPC,
  type SessionDetail,
  type SessionSummary,
  type UiMessage,
  type Mode,
  type SessionThinkingLevel,
} from "@pi-desktop/shared";
import type { HostProcess } from "../host-process";
import type { Logger } from "../logger";
import type { PersistenceOutbox } from "../persistence-outbox";
import type { PluginRuntime } from "../plugin-runtime";
import type { IpcRegistrar } from "./types";

function threadToSessionSummary(thread: any): SessionSummary {
  const createdAtMs = (thread.createdAt || Date.now() / 1000) * 1000;
  const updatedAtMs = (thread.updatedAt || thread.createdAt || Date.now() / 1000) * 1000;
  return {
    id: thread.id,
    source: "desktop",
    title: thread.name || thread.preview || "Untitled Session",
    messageCount: Array.isArray(thread.turns) ? thread.turns.length : 1,
    projectPath: thread.cwd || "/var/www/ava-code",
    modelId: thread.model || "powerful-coding-combo",
    providerId: thread.modelProvider || "omniroute",
    mode: "agent",
    thinkingLevel: (thread.reasoningEffort as any) || "max",
    permissionMode: "inherit",
    capabilities: {
      canPrompt: true,
      canStop: true,
      canRefresh: true,
    },
    createdAt: new Date(createdAtMs).toISOString(),
    updatedAt: new Date(updatedAtMs).toISOString(),
  };
}

function turnsToUiMessages(turns: any[], threadCreatedAt: number = Date.now() / 1000): UiMessage[] {
  const messages: UiMessage[] = [];
  for (const turn of turns || []) {
    const turnTimestamp = new Date((turn.startedAt || threadCreatedAt) * 1000).toISOString();
    for (const item of turn.items || []) {
      if (item.type === "userMessage") {
        const text = Array.isArray(item.content)
          ? item.content.map((c: any) => c.text || "").join("\n")
          : (item.content || item.text || "");
        messages.push({
          id: item.id || `user-${messages.length}`,
          role: "user",
          content: text,
          status: "complete",
          createdAt: turnTimestamp,
        });
      } else if (item.type === "agentMessage") {
        messages.push({
          id: item.id || `agent-${messages.length}`,
          role: "assistant",
          content: item.text || (typeof item.content === "string" ? item.content : ""),
          thinking: item.reasoning || item.summary || undefined,
          status: turn.status === "failed" ? "error" : "complete",
          createdAt: turnTimestamp,
        });
      } else if (item.type === "commandExecution") {
        messages.push({
          id: item.id || `tool-${messages.length}`,
          role: "tool",
          toolName: "exec_command",
          toolCallId: item.id,
          toolArgs: { cmd: item.command, cwd: item.cwd },
          toolResult: item.output || item.error || "",
          toolStatus: item.status === "failed" ? "error" : "success",
          isError: item.status === "failed",
          content: "",
          createdAt: turnTimestamp,
        });
      } else if (item.type === "fileChange") {
        messages.push({
          id: item.id || `tool-${messages.length}`,
          role: "tool",
          toolName: "apply_patch",
          toolCallId: item.id,
          toolArgs: { path: item.path, diff: item.diff },
          toolResult: item.output || item.diff || "",
          toolStatus: item.status === "failed" ? "error" : "success",
          isError: item.status === "failed",
          content: "",
          createdAt: turnTimestamp,
        });
      } else if (item.type === "mcpToolCall" || item.type === "customToolCall" || item.type === "functionCall") {
        messages.push({
          id: item.id || `tool-${messages.length}`,
          role: "tool",
          toolName: item.name || item.type,
          toolCallId: item.id,
          toolArgs: item.arguments,
          toolResult: item.output || item.error || "",
          toolStatus: item.status === "failed" ? "error" : "success",
          isError: item.status === "failed",
          content: "",
          createdAt: turnTimestamp,
        });
      }
    }
  }
  return messages;
}

export type SessionIpcDependencies = {
  registrar: IpcRegistrar;
  getHost: () => HostProcess | null;
  getSidecar: () => any;
  dataDir: string;
  activeTurns: ReadonlyMap<string, string>;
  sessionProjects: Map<string, string | null>;
  persistenceOutbox: PersistenceOutbox;
  logger: Pick<Logger, "app">;
  plugins: Pick<PluginRuntime, "broadcastEvent">;
  sessionCapabilityContext: () => Promise<{ providers: any; defaults: any }>;
  enrichSession: (session: any, providers: any, defaults: any) => any;
  acquireSessionOperation: (sessionId: string) => Promise<() => void>;
  stripWinLongPrefix: (path: string) => string;
};

export function registerSessionIpc({
  registrar,
  getHost,
  dataDir,
  activeTurns,
  sessionProjects,
  logger,
  acquireSessionOperation,
  stripWinLongPrefix,
}: SessionIpcDependencies): void {
  let host: HostProcess | null = null;
  const handle = (channel: string, fn: (...args: any[]) => Promise<any>) => {
    registrar.handle(channel, async (...args) => {
      host = getHost();
      return fn(...args);
    });
  };

  handle(IPC.invoke.sessionList, async () => {
    if (!host) throw new Error("host unavailable");
    try {
      const res = await host.call<{ data: any[] }>("thread/list", {});
      const threads = res?.data || [];
      const sessions = threads.map(threadToSessionSummary);
      return { sessions };
    } catch (e) {
      logger.app("session", "error", "failed to list threads", { data: String(e) });
      return { sessions: [] };
    }
  });

  handle(IPC.invoke.sessionCreate, async (input: any = {}) => {
    if (!host) throw new Error("host unavailable");
    try {
      const res = await host.call<{ thread?: any }>("thread/start", {
        cwd: input.projectPath || "/var/www/ava-code",
        model: input.modelId,
      });
      const thread = res?.thread;
      if (!thread) throw new Error("Failed to create thread");
      const session = threadToSessionSummary(thread);
      sessionProjects.set(session.id, session.projectPath || null);
      logger.app("session", "info", "session created", { sessionId: session.id });
      return { session };
    } catch (e) {
      logger.app("session", "error", "failed to create session", { data: String(e) });
      throw e;
    }
  });

  handle(IPC.invoke.sessionGet, async (input: string | { id?: string }) => {
    if (!host) throw new Error("host unavailable");
    const threadId = typeof input === "string" ? input : input?.id;
    if (!threadId) throw new Error("session id required");
    try {
      const res = await host.call<{ thread?: any }>("thread/read", {
        threadId,
        includeTurns: true,
      });
      const thread = res?.thread;
      if (!thread) return { session: null };
      const summary = threadToSessionSummary(thread);
      const messages = turnsToUiMessages(thread.turns || [], thread.createdAt);
      const detail: SessionDetail = {
        ...summary,
        messages,
      };
      return { session: detail };
    } catch (e) {
      logger.app("session", "error", "failed to read session", { sessionId: threadId, data: String(e) });
      return { session: null };
    }
  });

  handle(IPC.invoke.sessionOpen, async (rawSessionId: string) => {
    if (!host) throw new Error("host unavailable");
    const sessionId = String(rawSessionId ?? "").trim();
    if (!sessionId) throw new Error("session id required");
    const res = await host.call<{ thread?: any }>("thread/read", {
      threadId: sessionId,
      includeTurns: true,
    });
    const thread = res?.thread;
    if (!thread) {
      throw Object.assign(new Error("Session not found"), { errorCode: ErrorCodes.NOT_FOUND });
    }
    const summary = threadToSessionSummary(thread);
    const messages = turnsToUiMessages(thread.turns || [], thread.createdAt);
    return { session: { ...summary, messages } };
  });

  handle(IPC.invoke.sessionFork, async (input: { sessionId?: string; title?: string } = {}) => {
    if (!host) throw new Error("host unavailable");
    const sessionId = String(input.sessionId ?? "").trim();
    if (!sessionId) throw new Error("sessionId required");
    const res = await host.call<{ thread?: any }>("thread/fork", { threadId: sessionId });
    const thread = res?.thread;
    if (!thread) throw new Error("Failed to fork thread");
    const summary = threadToSessionSummary(thread);
    const messages = turnsToUiMessages(thread.turns || [], thread.createdAt);
    return { session: { ...summary, messages } };
  });

  handle(IPC.invoke.sessionDelete, async (id: string) => {
    if (!host) throw new Error("host unavailable");
    try {
      await host.call("thread/archive", { threadId: id });
    } catch {
      await host.call("thread/delete", { threadId: id }).catch(() => undefined);
    }
    sessionProjects.delete(id);
    logger.app("session", "info", "session deleted", { sessionId: id });
    return { ok: true };
  });

  handle(IPC.invoke.sessionRename, async (id: string, title: string) => {
    if (!host) throw new Error("host unavailable");
    await host.call("thread/name/set", { threadId: id, name: title });
    return { ok: true };
  });

  handle(IPC.invoke.sessionConfigure, async (id: string, config: any) => {
    return { ok: true, session: { id, ...config } };
  });

  handle(IPC.invoke.sessionGetScratchPath, async (input: { sessionId: string }) => {
    const scratchPath = resolve(join(dataDir, "scratch", input.sessionId));
    mkdirSync(scratchPath, { recursive: true });
    return { path: scratchPath };
  });

  handle(IPC.invoke.sessionOpenScratchPath, async (input: { sessionId: string }) => {
    const scratchPath = resolve(join(dataDir, "scratch", input.sessionId));
    mkdirSync(scratchPath, { recursive: true });
    const openError = await shell.openPath(stripWinLongPrefix(scratchPath));
    if (openError) throw new Error(openError);
    return { ok: true, path: scratchPath };
  });

  handle(IPC.invoke.sessionSearch, async () => {
    return { hits: [], nextOffset: null };
  });

  handle(IPC.invoke.sessionCollaboration, async () => {
    return { collaborators: [] };
  });
}
