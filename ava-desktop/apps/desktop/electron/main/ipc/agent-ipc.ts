import {
  IPC,
  ErrorCodes,
  type AgentEventEnvelope,
  type AgentPromptRequest,
  type AgentSteerRequest,
  type AgentStopRequest,
  type UiMessage,
} from "@pi-desktop/shared";
import type { HostProcess } from "../host-process";
import type { Logger } from "../logger";
import type { IpcRegistrar } from "./types";

export type AgentIpcDependencies = {
  registrar: IpcRegistrar;
  getHost: () => HostProcess | null;
  getSidecar?: () => any;
  getAgentHostBridge?: () => any;
  logger: Pick<Logger, "app">;
  vendorOAuth?: any;
  agentExtensions?: any;
  cancelSessionTools?: (sessionId: string, reason?: string) => void;
  persistenceOutbox?: any;
  dataDir: string;
  activeTurns: Map<string, string>;
  isTurnDispatchable?: (sessionId: string, turnId: string | null | undefined) => boolean;
  activeTurnUsages?: Map<string, any>;
  approvedExecutionIdsBySession?: Map<string, string>;
  claimedExecutionSessions?: Map<string, string>;
  resolveAgentRuntimeLaunch?: (...args: any[]) => Promise<any>;
  acquireSessionOperation?: (sessionId: string) => Promise<() => void>;
  finishTurn?: any;
  lockAbortReason?: (sessionId: string, turnId: string | null | undefined) => void;
  finishApprovedExecution?: any;
  dispatchApprovedPlan?: any;
  dispatchExecutionForProposal?: any;
  emitAgentEvent: (envelope: AgentEventEnvelope) => void;
  setNotificationViewingSessionId?: (sessionId: string | null) => void;
  optionalWorkspaceRoot?: () => Promise<string | null>;
  composerCommandService?: any;
  loadComposerTemplatesCached?: (root: string | null) => Promise<any[]>;
};

export function registerAgentIpc({
  registrar,
  getHost,
  logger,
  activeTurns,
  emitAgentEvent,
}: AgentIpcDependencies): void {
  let host: HostProcess | null = null;
  const handle = (channel: string, fn: (...args: any[]) => Promise<any>) => {
    registrar.handle(channel, async (...args) => {
      host = getHost();
      return fn(...args);
    });
  };

  handle(IPC.invoke.agentPrompt, async (req: AgentPromptRequest) => {
    if (!host) throw new Error("host unavailable");
    const threadId = req.sessionId;
    if (!threadId) throw new Error("sessionId required");

    const inputItems: any[] = [];
    if (req.content) {
      inputItems.push({ type: "text", text: req.content });
    }
    if (Array.isArray(req.attachments)) {
      for (const att of req.attachments) {
        if (att.kind === "image" && att.ref) {
          inputItems.push({ type: "image", path: att.ref });
        }
      }
    }

    try {
      const res = await host.call<{ turn?: any }>("turn/start", {
        threadId,
        input: inputItems,
      });

      const turn = res?.turn;
      const turnId = turn?.id || `turn-${Date.now()}`;
      activeTurns.set(threadId, turnId);

      logger.app("session", "info", "turn started natively", {
        sessionId: threadId,
        turnId,
      });

      return { accepted: true, turnId };
    } catch (e: any) {
      logger.app("session", "error", "failed to start turn", {
        sessionId: threadId,
        data: String(e),
      });
      throw e;
    }
  });

  handle(IPC.invoke.agentAbort, async (req: { sessionId: string; turnId?: string }) => {
    if (!host) throw new Error("host unavailable");
    const turnId = req.turnId || activeTurns.get(req.sessionId);
    try {
      await host.call("turn/interrupt", {
        threadId: req.sessionId,
        turnId,
      });
    } catch (e) {
      logger.app("session", "warn", "turn interrupt failed", { data: String(e) });
    }
    activeTurns.delete(req.sessionId);
    return { ok: true, aborted: true };
  });

  handle(IPC.invoke.agentStop, async (req: AgentStopRequest) => {
    if (!host) throw new Error("host unavailable");
    const turnId = activeTurns.get(req.sessionId);
    try {
      await host.call("turn/interrupt", {
        threadId: req.sessionId,
        turnId,
      });
    } catch (e) {
      logger.app("session", "warn", "turn stop failed", { data: String(e) });
    }
    return { ok: true };
  });

  handle(IPC.invoke.agentGetStatus, async (sessionId: string) => {
    return {
      sessionId,
      isRunning: activeTurns.has(sessionId),
      currentTurnId: activeTurns.get(sessionId),
      pendingToolConfirmations: 0,
    };
  });

  handle(IPC.invoke.promptEnhance, async (req: any) => {
    return { enhancedDraft: req?.draft || "" };
  });

  handle(IPC.invoke.sessionSummarizeTitle, async (req: any) => {
    const prompt = String(req?.userPrompt || "").trim();
    const title = prompt.length > 40 ? prompt.slice(0, 37) + "..." : prompt;
    return { title: title || "Untitled Session" };
  });

  handle(IPC.invoke.agentQueuePush, async () => ({ ok: true }));
  handle(IPC.invoke.agentQueueList, async () => ({ entries: [] }));
  handle(IPC.invoke.agentQueueRemove, async () => ({ ok: true }));
  handle(IPC.invoke.agentQueuePrioritize, async () => ({ ok: true }));
  handle(IPC.invoke.agentQueueReorder, async () => ({ ok: true }));
  handle(IPC.invoke.toolResolvePermission, async (resolution: any) => {
    if (!host) throw new Error("host unavailable");
    return host.call("permissions.resolve", resolution);
  });
  handle(IPC.invoke.askToolResolve, async () => ({ ok: true }));
  handle(IPC.invoke.plansPending, async () => ({ plans: [] }));
  handle(IPC.invoke.plansResolve, async () => ({ ok: true }));
}
