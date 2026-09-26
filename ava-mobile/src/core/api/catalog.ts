import { CURATED_MODELS, REASONING_EFFORTS } from "@/config/models";
import { getCustomModels } from "../custom-models";
import type { RpcClient } from "../rpc-client";
import type { McpServer, ModelInfo } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

/**
 * The server's `model/list` returns a built-in stock catalog that is not
 * actually configured. The real models are the OmniRoute combos, user-defined custom models,
 * plus the model set in the server config, which is marked as default.
 */
export async function listModels(rpc: RpcClient): Promise<ModelInfo[]> {
  let configured = "";
  try {
    const res = await rpc.call<{ config?: Raw }>("config/read", { cwd: "/" });
    configured = String(res?.config?.model ?? "");
  } catch {
    /* fall back to curated list */
  }

  const custom = await getCustomModels();
  const list = CURATED_MODELS.map((m) => ({ ...m }));

  // Add custom user-configured models dynamically
  for (const c of custom) {
    if (!list.some((m) => m.id === c.id)) {
      list.push(c);
    }
  }

  if (configured && !list.some((m) => m.id === configured)) {
    list.unshift({
      id: configured,
      name: configured,
      provider: "omniroute",
      supportsImages: true,
      reasoningEfforts: [...REASONING_EFFORTS],
    });
  }
  const def = configured || list[0]!.id;
  return list
    .map((m) => ({ ...m, isDefault: m.id === def }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

export async function listMcpServers(rpc: RpcClient): Promise<McpServer[]> {
  const res = await rpc.call<{ data?: Raw[] }>("mcpServerStatus/list", {});
  return (res?.data ?? []).map((s) => {
    const tools = (s.tools && typeof s.tools === "object" ? s.tools : {}) as Record<string, Raw>;
    return {
      name: String(s.name ?? ""),
      status: String(s.authStatus ?? s.status ?? "connected"),
      tools: Object.entries(tools).map(([name, t]) => ({ name, description: String(t?.description ?? "") })),
    };
  }).filter((s) => s.name);
}

export const reloadMcpServers = (rpc: RpcClient) => rpc.call("config/mcpServer/reload", {});
