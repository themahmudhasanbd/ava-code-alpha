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
        updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : undefined,
        status: statusType,
        active: isStatusActive,
      };
    });
}

export async function startSession(rpc: RpcClient, opts: { cwd: string; model?: string; sandbox?: string }) {
  const res = await rpc.call<{ thread?: Raw }>("thread/start", {
    cwd: opts.cwd,
    ...(opts.model ? { model: opts.model } : {}),
    ...(opts.sandbox ? { sandbox: opts.sandbox } : {}),
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
  const res = await rpc.call<{ thread?: { status?: Raw; turns?: Raw[] } }>("thread/read", { threadId: id, includeTurns: true });
  const out: ChatMessage[] = [];
  const turns = res?.thread?.turns ?? [];
  const threadStatus = res?.thread?.status;
  const isThreadActive = threadStatus?.type === "active" || threadStatus === "active";

  let isTurnRunning = isThreadActive;
  let activeTurnId: string | undefined;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]!;
    const isLastTurn = i === turns.length - 1;
    const isTurnInProgress = turn.status === "inProgress" || (isLastTurn && isThreadActive);
    if (isTurnInProgress) {
      isTurnRunning = true;
      if (turn.id) {
        activeTurnId = str(turn.id);
      }
    }

    const items = (turn.items as Raw[]) ?? [];
    const parts: MessagePart[] = [];
    for (const it of items) {
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
        const itemStatus = isTurnInProgress && (!it.status || it.status === "inProgress" || it.status === "running") ? "running" : "done";
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
