import type { RpcClient } from "../rpc-client";
import type { ChatMessage, MessagePart, Session } from "../types";
import { itemToPart } from "./items";

export { itemToPart };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;
const str = (v: unknown, d = "") => (v == null ? d : String(v));

let counter = 0;
function makeId(prefix = "id"): string {
  counter = (counter + 1) % 1000000;
  return `${prefix}_${Date.now()}_${counter}_${Math.random().toString(36).slice(2, 6)}`;
}

export interface SessionHistoryResult {
  messages: ChatMessage[];
  isTurnRunning: boolean;
  activeTurnId?: string | undefined;
}

export async function listSessions(rpc: RpcClient, limit = 50): Promise<Session[]> {
  const res = await rpc.call<{ data?: Raw[] }>("thread/list", { limit });
  return (res?.data ?? [])
    .filter((t) => t.id)
    .map((t) => {
      const isStatusActive =
        t.status?.type === "active" ||
        t.status === "active" ||
        t.status === "inProgress";
      const statusType = t.status?.type ?? (typeof t.status === "string" ? t.status : "idle");
      return {
        id: str(t.id),
        title: str(t.name) || str(t.preview) || "New session",
        directory: str(t.cwd, "/"),
        model: t.model ? str(t.model) : undefined,
        updatedAt: typeof t.updatedAt === "number" ? t.updatedAt * 1000 : undefined,
        status: statusType,
        active: isStatusActive,
      };
    });
}

/** SandboxMode serializes kebab-case ("read-only" | "workspace-write" | "danger-full-access"). */
function normalizeSandboxMode(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const kebab = v
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
  return kebab === "read-only" || kebab === "workspace-write" || kebab === "danger-full-access"
    ? kebab
    : undefined;
}

export async function startSession(rpc: RpcClient, opts: { cwd: string; model?: string; sandbox?: string }) {
  const sandbox = normalizeSandboxMode(opts.sandbox);
  const res = await rpc.call<{ thread?: Raw }>("thread/start", {
    cwd: opts.cwd,
    ...(opts.model ? { model: opts.model } : {}),
    ...(sandbox ? { sandbox } : {}),
  });
  return str(res?.thread?.id);
}

export async function resumeSession(rpc: RpcClient, id: string) {
  try {
    const res = await rpc.call<{ thread?: Raw }>("thread/resume", { threadId: id });
    return str(res?.thread?.id) || id;
  } catch {
    return id;
  }
}

export const deleteSession = (rpc: RpcClient, id: string) => rpc.call("thread/delete", { threadId: id });
export const archiveSession = (rpc: RpcClient, id: string) => rpc.call("thread/archive", { threadId: id });
export const renameSession = (rpc: RpcClient, id: string, name: string) => rpc.call("thread/name/set", { threadId: id, name });

export async function readSession(rpc: RpcClient, id: string): Promise<SessionHistoryResult> {
  let res: Raw | null = null;
  try {
    // Fast path: read directly from thread store / in-memory cache without full MCP reboot
    res = await rpc.call<Raw>("thread/read", { threadId: id, includeTurns: true });
  } catch {
    try {
      res = await rpc.call<Raw>("thread/resume", { threadId: id });
    } catch (e) {
      console.warn("[readSession] read error:", e);
      res = null;
    }
  }
  const out: ChatMessage[] = [];
  const turns = ((res?.thread?.turns ?? res?.turns ?? res?.initialTurnsPage?.turns) as Raw[]) ?? [];
  const threadStatus = res?.thread?.status ?? res?.status;
  const isThreadActive = threadStatus?.type === "active" || threadStatus === "active";

  let isTurnRunning = isThreadActive;
  let activeTurnId: string | undefined;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]!;
    const isLastTurn = i === turns.length - 1;
    const isTurnCompleted =
      turn.status === "completed" ||
      turn.status === "failed" ||
      turn.status === "interrupted" ||
      turn.status === "done";
    const isTurnInProgress =
      !isTurnCompleted &&
      (turn.status === "inProgress" ||
        turn.status === "running" ||
        (isLastTurn && isThreadActive));
    if (isTurnInProgress) {
      isTurnRunning = true;
      if (turn.id) {
        activeTurnId = str(turn.id);
      }
    }

    const items = (turn.items as Raw[]) ?? [];
    const parts: MessagePart[] = [];
    for (let j = 0; j < items.length; j++) {
      const it = items[j]!;
      if (it.type === "userMessage") {
        let text = "";
        if (Array.isArray(it.content)) {
          text = it.content.map((c: Raw) => str(c?.text ?? (typeof c === "string" ? c : ""))).filter(Boolean).join("\n");
        } else if (typeof it.content === "string") {
          text = it.content;
        } else if (it.text) {
          text = str(it.text);
        }
        const uId = str(it.id) || makeId("u");
        const uPartId = str(it.id ? `${it.id}_p` : makeId("u_p"));
        if (text) out.push({ id: uId, role: "user", parts: [{ id: uPartId, kind: "text", text, status: "done" }] });
      } else {
        const hasCompletedEvidence =
          typeof it.exitCode === "number" ||
          it.status === "completed" ||
          it.status === "done" ||
          it.status === "success" ||
          !!it.aggregatedOutput ||
          !!it.output;
        const isLastItem = j === items.length - 1;
        const itemStatus =
          isTurnInProgress && isLastItem && !hasCompletedEvidence
            ? "running"
            : hasCompletedEvidence
            ? "done"
            : it.status === "failed" || it.status === "error"
            ? "error"
            : "done";
        const p = itemToPart(it, itemStatus);
        if (p) parts.push(p);
      }
    }
    if (parts.length) {
      const turnIdStr = str(turn.id) || `${i}`;
      out.push({
        id: `a_${turnIdStr}`,
        role: "assistant",
        parts,
        stats: { durationMs: typeof turn.durationMs === "number" ? turn.durationMs : undefined },
      });
    }
  }

  return {
    messages: out,
    isTurnRunning,
    activeTurnId,
  };
}
