import { DEFAULT_FALLBACK_MODELS, REASONING_EFFORTS } from "@/config/models";
import {
  fetchAntigravityModels,
  getAntigravityAuth,
  getCachedAntigravityModels,
  getCustomModels,
  getCustomProviders,
} from "../custom-models";
import type { RpcClient } from "../rpc-client";
import type { McpServer, ModelInfo } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

/**
 * Returns models aggregated dynamically across:
 * 1. Google Antigravity dynamic models (via OAuth access token or cached models)
 * 2. Active Custom Providers and their dynamically fetched models
 * 3. Standalone user-configured custom models
 * 4. Server-configured active model from `config/read`
 * 5. Default fallback models (no static combos)
 */
export async function listModels(rpc?: RpcClient): Promise<ModelInfo[]> {
  let configuredModel = "";
  let configuredProvider = "";

  if (rpc) {
    try {
      const res = await rpc.call<{ config?: Raw }>("config/read", { cwd: "/" });
      configuredModel = String(res?.config?.model ?? "");
      configuredProvider = String(res?.config?.model_provider ?? "");
    } catch {
      /* fall back gracefully */
    }
  }

  const modelMap = new Map<string, ModelInfo>();

  // 1. Load default fallback models
  for (const m of DEFAULT_FALLBACK_MODELS) {
    modelMap.set(m.id.toLowerCase(), { ...m });
  }

  // 2. Load Antigravity dynamic models (cached first, then refresh if token present)
  try {
    const cachedAntigravity = await getCachedAntigravityModels();
    for (const m of cachedAntigravity) {
      modelMap.set(m.id.toLowerCase(), { ...m, provider: "antigravity" });
    }

    const auth = await getAntigravityAuth();
    if (auth?.accessToken) {
      // Async fetch to keep cache up to date without blocking
      fetchAntigravityModels(auth.accessToken)
        .then((fresh) => {
          if (fresh.length > 0) {
            fresh.forEach((m) => modelMap.set(m.id.toLowerCase(), { ...m, provider: "antigravity" }));
          }
        })
        .catch(() => {});
    }
  } catch (err) {
    console.warn("[Catalog] Failed loading Antigravity models:", err);
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
      const isAntigravity =
        configuredModel.startsWith("antigravity/") ||
        configuredProvider === "antigravity" ||
        configuredModel.includes("gemini") ||
        configuredModel.includes("claude");

      modelMap.set(key, {
        id: configuredModel,
        name: configuredModel,
        provider: configuredProvider || (isAntigravity ? "antigravity" : "server"),
        supportsImages: true,
        reasoning: true,
        reasoningEfforts: [...REASONING_EFFORTS],
      });
    }
  }

  // Convert map to array
  const list = Array.from(modelMap.values());

  // Determine active default ID
  const activeDefaultId = configuredModel || list[0]?.id || "gpt-5.6-sol";

  return list
    .map((m) => ({ ...m, isDefault: m.id === activeDefaultId }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

export async function listMcpServers(rpc: RpcClient): Promise<McpServer[]> {
  const res = await rpc.call<{ data?: Raw[] }>("mcpServerStatus/list", {});
  return (res?.data ?? [])
    .map((s) => {
      const tools = (s.tools && typeof s.tools === "object" ? s.tools : {}) as Record<string, Raw>;
      return {
        name: String(s.name ?? ""),
        status: String(s.runtimeStatus ?? s.status ?? "connected"),
        authStatus: s.authStatus ? String(s.authStatus) : undefined,
        tools: Object.entries(tools).map(([name, t]) => ({
          name,
          description: String(t?.description ?? ""),
        })),
      };
    })
    .filter((s) => s.name);
}

export const reloadMcpServers = (rpc: RpcClient) => rpc.call("config/mcpServer/reload", {});

/** Initiate OAuth login for an MCP server. Returns the authorization URL to open. */
export async function mcpOAuthLogin(
  rpc: RpcClient,
  serverName: string
): Promise<{ authorizationUrl: string } | null> {
  try {
    const res = await rpc.call<{ authorizationUrl?: string }>("mcpServer/oauth/login", {
      name: serverName,
    });
    if (res?.authorizationUrl) {
      return { authorizationUrl: res.authorizationUrl };
    }
    return null;
  } catch (e) {
    console.warn("[MCP] OAuth login failed:", e);
    return null;
  }
}
