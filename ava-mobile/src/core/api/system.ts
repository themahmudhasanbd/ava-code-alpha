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
  const bool = (k: string) => (typeof c[k] === "boolean" ? (c[k] as boolean) : undefined);
  return {
    model: str("model"),
    provider: str("model_provider"),
    reasoningEffort: str("model_reasoning_effort"),
    approvalPolicy: str("approval_policy"),
    sandboxMode: str("sandbox_mode"),
    contextWindow: num("model_context_window"),
    projectDocMaxBytes: num("project_doc_max_bytes"),
    hideAgentReasoning: bool("hide_agent_reasoning"),
    webSearch: typeof c["web_search"] === "object" ? JSON.stringify(c["web_search"]) : str("web_search"),
  };
}

/** Write config fields to the server. Supports ava-rs batchWrite and value/write. */
export async function writeServerConfig(
  rpc: RpcClient,
  fields: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Try ava-rs protocol v2 standard config/batchWrite.
    // NOTE: param FIELD names are camelCase (keyPath/mergeStrategy/reloadUserConfig);
    // the key VALUES stay snake_case (e.g. "approval_policy") — the server matches those.
    const edits = Object.entries(fields).map(([keyPath, value]) => ({
      keyPath,
      value,
      mergeStrategy: "replace",
    }));
    await rpc.call("config/batchWrite", { edits, reloadUserConfig: true });
    return { success: true };
  } catch (e1: any) {
    // 2. Try single config/value/write per key
    try {
      for (const [keyPath, value] of Object.entries(fields)) {
        await rpc.call("config/value/write", {
          keyPath,
          value,
          mergeStrategy: "replace",
        });
      }
      return { success: true };
    } catch (e2: any) {
      return {
        success: false,
        error: e1?.message || e2?.message || "Failed to write server config",
      };
    }
  }
}
