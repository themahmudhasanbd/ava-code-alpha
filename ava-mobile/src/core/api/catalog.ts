import { DEFAULT_FALLBACK_MODELS, REASONING_EFFORTS } from "@/config/models";
import {
  getCustomModels,
  getCustomProviders,
} from "../custom-models";
import type { RpcClient } from "../rpc-client";
import type { McpServer, ModelInfo } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

/**
 * Returns models aggregated dynamically across:
 * 1. Server models via `model/list`
 * 2. Active Custom Providers and their dynamically fetched models
 * 3. Standalone user-configured custom models
 * 4. Server-configured active model from `config/read`
 */
export async function listModels(rpc?: RpcClient): Promise<ModelInfo[]> {
  let configuredModel = "";
  let configuredProvider = "";

  const modelMap = new Map<string, ModelInfo>();

  // 1. Optional fallbacks (empty by default to avoid fake/hardcoded models)
  for (const m of DEFAULT_FALLBACK_MODELS) {
    modelMap.set(m.id.toLowerCase(), { ...m });
  }

  // 2. Fetch live server models from `model/list`
  if (rpc) {
    try {
      const res = await rpc.call<{ data?: Raw[] }>("model/list", { includeHidden: false });
      if (Array.isArray(res?.data) && res.data.length > 0) {
        for (const m of res.data) {
          const id = String(m.id || m.model || "");
          if (!id) continue;
          const efforts = Array.isArray(m.supported_reasoning_efforts)
            ? m.supported_reasoning_efforts
                .map((e: any) => (typeof e === "string" ? e : e?.reasoning_effort || e?.effort))
                .filter(Boolean)
            : [...REASONING_EFFORTS];

          let provider = "server";
          const lid = id.toLowerCase();
          if (lid.includes("gemini")) provider = "google";
          else if (lid.includes("claude")) provider = "anthropic";
          else if (lid.includes("gpt") || lid.includes("o1") || lid.includes("o3") || lid.includes("o4")) provider = "openai";
          else if (lid.includes("deepseek")) provider = "deepseek";

          modelMap.set(id.toLowerCase(), {
            id,
            name: String(m.display_name || m.name || id),
            description: String(m.description || ""),
            provider,
            supportsImages: Array.isArray(m.input_modalities) ? m.input_modalities.includes("image") : true,
            reasoning: efforts.length > 0,
            reasoningEfforts: efforts.length > 0 ? efforts : [...REASONING_EFFORTS],
            isDefault: Boolean(m.is_default),
          });
        }
      }
    } catch (e) {
      console.warn("[Catalog] Failed to fetch server model/list:", e);
    }

    try {
      const res = await rpc.call<{ config?: Raw }>("config/read", { cwd: "/" });
      configuredModel = String(res?.config?.model ?? "");
      configuredProvider = String(res?.config?.model_provider ?? "");
    } catch {
      /* fall back gracefully */
    }
  }

  // 3. Load active Custom Providers and their dynamically fetched models
  try {
    const providers = await getCustomProviders();
    for (const prov of providers) {
      if (!prov.enabled) continue;
      if (Array.isArray(prov.models) && prov.models.length > 0) {
        for (const m of prov.models) {
          modelMap.set(m.id.toLowerCase(), {
            ...m,
            provider: prov.id,
          });
        }
      }
    }
  } catch (err) {
    console.warn("[Catalog] Failed loading Provider models:", err);
  }

  // 4. Load standalone custom models
  try {
    const custom = await getCustomModels();
    for (const c of custom) {
      modelMap.set(c.id.toLowerCase(), { ...c });
    }
  } catch (err) {
    console.warn("[Catalog] Failed loading Custom models:", err);
  }

  // 5. Ensure server-configured model is in the catalog
  if (configuredModel) {
    const key = configuredModel.toLowerCase();
    if (!modelMap.has(key)) {
      modelMap.set(key, {
        id: configuredModel,
        name: configuredModel,
        provider: configuredProvider || "server",
        supportsImages: true,
        reasoning: true,
        reasoningEfforts: [...REASONING_EFFORTS],
      });
    }
  }

  // Convert map to array
  const list = Array.from(modelMap.values());

  if (list.length === 0) {
    return [];
  }

  // Determine active default ID
  const activeDefaultId = configuredModel || list[0]?.id || "";

  return list
    .map((m) => ({ ...m, isDefault: m.id === activeDefaultId }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

/**
 * Maps server runtime_status (camelCase) to the UI status values McpScreen expects.
 * Server: notStarted | starting | connected | authenticationRequired | failed | cancelled | disabled
 */
function mapMcpRuntimeStatus(runtimeStatus: unknown): string {
  switch (String(runtimeStatus ?? "")) {
    case "connected":
      return "connected";
    case "starting":
      return "starting";
    case "authenticationRequired":
      return "authRequired";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "disabled":
      return "disabled";
    case "notStarted":
    default:
      return "stopped";
  }
}

export async function listMcpServers(rpc: RpcClient): Promise<McpServer[]> {
  const res = await rpc.call<{ data?: Raw[] }>("mcpServerStatus/list", {});
  return (res?.data ?? [])
    .map((s) => {
      const tools = (s.tools && typeof s.tools === "object" ? s.tools : {}) as Record<string, Raw>;
      // Server sends runtime_status / auth_status (camelCase); older field names kept as fallback.
      const runtimeStatus = (s as Raw).runtimeStatus ?? (s as Raw).runtime_status ?? (s as Raw).status;
      const authStatus = (s as Raw).authStatus ?? (s as Raw).auth_status;
      return {
        name: String(s.name ?? ""),
        status: mapMcpRuntimeStatus(runtimeStatus),
        authStatus: typeof authStatus === "string" ? authStatus : undefined,
        tools: Object.entries(tools).map(([name, t]) => ({
          name,
          description: String((t as any)?.description ?? ""),
        })),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function reloadMcpServers(rpc: RpcClient): Promise<void> {
  await rpc.call("config/mcpServer/reload", {});
}

export async function mcpOAuthLogin(rpc: RpcClient, serverName: string): Promise<{ authorizationUrl?: string }> {
  const res = await rpc.call<Raw>("mcpServer/oauth/login", { name: serverName });
  const url = (res?.authorizationUrl ?? res?.authorization_url) as string | undefined;
  return { authorizationUrl: typeof url === "string" ? url : undefined };
}

export interface McpServerAddParams {
  name: string;
  /** "stdio" | "http" */
  transport: "stdio" | "http";
  /** For stdio: the command to run */
  command?: string;
  /** For stdio: command args */
  args?: string[];
  /** For http: the server URL */
  url?: string;
  /** For http: env var name holding the bearer token */
  bearerTokenEnvVar?: string;
}

/**
 * Adds an MCP server by writing its config via config/batchWrite, then reloading.
 * Uses existing config infrastructure — no dedicated server RPC needed.
 */
export async function addMcpServer(rpc: RpcClient, params: McpServerAddParams): Promise<void> {
  const name = params.name.trim();
  if (!name) throw new Error("Server name is required");

  let serverConfig: Record<string, unknown>;
  if (params.transport === "stdio") {
    if (!params.command?.trim()) throw new Error("Command is required for stdio transport");
    serverConfig = {
      command: params.command.trim(),
      args: params.args ?? [],
    };
  } else {
    if (!params.url?.trim()) throw new Error("URL is required for HTTP transport");
    serverConfig = {
      url: params.url.trim(),
      ...(params.bearerTokenEnvVar?.trim()
        ? { bearer_token_env_var: params.bearerTokenEnvVar.trim() }
        : {}),
    };
  }

  // Write mcp_servers.<name> via the standard config batchWrite API
  const edits = [
    {
      keyPath: `mcp_servers.${name}`,
      value: serverConfig,
      mergeStrategy: "replace",
    },
  ];
  await rpc.call("config/batchWrite", { edits, reloadUserConfig: true });
  // Reload MCP servers so the new one starts
  await reloadMcpServers(rpc);
}
