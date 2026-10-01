import type { RpcClient } from "../rpc-client";
import type { ServerConfig, ServerDiagnostics } from "../types";

export async function readDiagnostics(rpc: RpcClient): Promise<ServerDiagnostics> {
  const res = await rpc.call<{
    process?: { id?: number; residentMemoryBytes?: number };
    gauges?: { name?: string; value?: number }[];
  }>("server/diagnostics", {});
  return {
    processId: res.process?.id,
    memoryBytes: res.process?.residentMemoryBytes,
    gauges: (res.gauges ?? []).map((g) => ({ name: g.name ?? "", value: g.value ?? 0 })).filter((g) => g.name),
  };
}

export async function readServerConfig(rpc: RpcClient): Promise<ServerConfig> {
  const res = await rpc.call<{ config?: Record<string, unknown> }>("config/read", {});
  const c = res.config ?? {};
  const str = (k: string) => (typeof c[k] === "string" ? (c[k] as string) : undefined);
  const num = (k: string) => (typeof c[k] === "number" ? (c[k] as number) : undefined);
  return {
    model: str("model"),
    provider: str("model_provider"),
    reasoningEffort: str("model_reasoning_effort"),
    approvalPolicy: str("approval_policy"),
    sandboxMode: str("sandbox_mode"),
    contextWindow: num("model_context_window"),
  };
}
