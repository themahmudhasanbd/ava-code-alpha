import type { RpcClient } from "../rpc-client";
import type { ServerConfig, ServerDiagnostics } from "../types";
import type { CustomProvider } from "../custom-models";

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

/**
 * Push a custom provider to the AvA Core server so chat can actually route
 * to it. The mobile app keeps providers in device AsyncStorage for the model
 * picker, but the server only knows providers from its own config.toml —
 * without this, selecting a custom-provider model sends a model id the
 * server cannot resolve ("Model metadata for ... not found").
 *
 * Maps the mobile CustomProvider onto the server's `model_providers.<id>`
 * schema (ava-rs/model-provider-info) via config/batchWrite with
 * reloadUserConfig, so the provider is live immediately.
 *
 * OAuth providers (e.g. Antigravity) are skipped: the server ships its own
 * native entry with special headers/auth flow. Keyless non-local providers
 * are skipped too, so a keyless save never clobbers a built-in provider
 * with an empty override.
 */
export async function pushCustomProviderToServer(
  rpc: RpcClient,
  provider: CustomProvider
): Promise<{ ok: boolean; reason?: string }> {
  if (!provider?.id) return { ok: false, reason: "missing provider id" };
  if (provider.authType === "oauth") {
    return { ok: false, reason: "oauth providers are handled natively by the server" };
  }
  const keys = Array.from(
    new Set(
      [...(provider.apiKeys ?? []), ...(provider.apiKey ? [provider.apiKey] : [])]
        .map((k) => k.trim())
        .filter(Boolean)
    )
  );
  if (provider.authType !== "none" && keys.length === 0) {
    return { ok: false, reason: "no API keys configured" };
  }
  const value: Record<string, unknown> = {
    name: provider.name?.trim() || provider.id,
    base_url: provider.baseUrl?.trim(),
    // The server only speaks "responses" now (the "chat" wire api was removed).
    wire_api: "responses",
  };
  if (keys.length > 0) value.api_keys = keys;
  const res = await writeServerConfig(rpc, { [`model_providers.${provider.id}`]: value });
  if (!res.success) return { ok: false, reason: res.error || "config write failed" };
  return { ok: true };
}
