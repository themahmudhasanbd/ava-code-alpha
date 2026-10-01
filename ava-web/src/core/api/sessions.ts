import type { RpcClient } from "../rpc-client";
import type { ChatMessage, MessagePart, Session } from "../types";
import { itemToPart } from "./items";

export { itemToPart };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;
const str = (v: unknown, d = "") => (v == null ? d : String(v));

export async function listSessions(rpc: RpcClient, limit = 50): Promise<Session[]> {
  const res = await rpc.call<{ data?: Raw[] }>("thread/list", { limit });
  return (res?.data ?? [])
    .filter((t) => t.id)
    .map((t) => ({
      id: str(t.id),
      title: str(t.name) || str(t.preview) || "New session",
      directory: str(t.cwd, "/"),
      model: t.model ? str(t.model) : undefined,
      updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : undefined,
    }));
}

export async function startSession(rpc: RpcClient, opts: { cwd: string; model?: string; sandbox?: string }) {
  const res = await rpc.call<{ thread?: Raw }>("thread/start", {
    cwd: opts.cwd,
    ...(opts.model ? { model: opts.model } : {}),
    ...(opts.sandbox ? { sandbox: opts.sandbox } : {}),
  });
  return str(res?.thread?.id);
}

export const deleteSession = (rpc: RpcClient, id: string) => rpc.call("thread/delete", { threadId: id });
export const archiveSession = (rpc: RpcClient, id: string) => rpc.call("thread/archive", { threadId: id });
export const renameSession = (rpc: RpcClient, id: string, name: string) => rpc.call("thread/name/set", { threadId: id, name });

export async function readSession(rpc: RpcClient, id: string): Promise<ChatMessage[]> {
  const res = await rpc.call<{ thread?: { turns?: Raw[] } }>("thread/read", { threadId: id, includeTurns: true });
  const out: ChatMessage[] = [];
  for (const turn of res?.thread?.turns ?? []) {
    const items = (turn.items as Raw[]) ?? [];
    const parts: MessagePart[] = [];
    for (const it of items) {
      if (it.type === "userMessage") {
        const text = ((it.content as Raw[]) ?? []).map((c) => str(c.text)).filter(Boolean).join("\n");
        if (text) out.push({ id: str(it.id), role: "user", parts: [{ id: str(it.id), kind: "text", text, status: "done" }] });
      } else {
        const p = itemToPart(it);
        if (p) parts.push(p);
      }
    }
    if (parts.length)
      out.push({
        id: `a_${str(turn.id)}`,
        role: "assistant",
        parts,
        stats: { durationMs: typeof turn.durationMs === "number" ? turn.durationMs : undefined },
      });
  }
  return out;
}
