import {
  IPC,
  type ProviderPublic,
  type ThinkingLevel,
} from "@pi-desktop/shared";
import type { HostProcess } from "../host-process";
import type { Logger } from "../logger";
import type { IpcRegistrar } from "./types";

const OMNIROUTE_PROVIDER: ProviderPublic = {
  id: "omniroute",
  name: "OmniRoute Gateway",
  vendorKey: "omniroute",
  type: "native",
  protocol: "openai_compatible",
  enabled: true,
  baseUrl: "http://127.0.0.1:20128/v1",
  authKind: "api_key",
  hasSecret: true,
  models: [],
  defaultModelId: "",
  supportsReasoning: true,
  supportsVision: true,
  supportedThinkingLevels: ["off", "low", "medium", "max", "ultra"] as ThinkingLevel[],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export type ProviderIpcDependencies = {
  registrar: IpcRegistrar;
  getHost: () => HostProcess | null;
  modelsDevCatalog?: any;
  vendorOAuth?: any;
  logger: Pick<Logger, "app">;
  enrichProvider?: any;
  listRuntimeProviders?: any;
  enrichProviderList?: any;
  bindingForModel?: any;
};

export function registerProviderIpc({
  registrar,
  getHost,
  logger,
}: ProviderIpcDependencies): void {
  let host: HostProcess | null = null;
  const handle = (channel: string, fn: (...args: any[]) => Promise<any>) => {
    registrar.handle(channel, async (...args) => {
      host = getHost();
      return fn(...args);
    });
  };

  handle(IPC.invoke.providersList, async () => {
    return { providers: [OMNIROUTE_PROVIDER] };
  });

  handle(IPC.invoke.providersListModels, async () => {
    if (!host) {
      return {
        models: [],
        source: "fallback",
      };
    }

    try {
      const res = await host.call<{ data: any[] }>("model/list", {});
      const rawModels = res?.data || [];
      const models = rawModels.map((m: any) => ({
        modelId: m.id || m.model,
        displayName: m.displayName || m.id,
        description: m.description,
        providerId: "omniroute",
        reasoning: Boolean(m.supportedReasoningEfforts?.length),
        capabilities: ["text", "tools", "vision", "reasoning"],
        supportedThinkingLevels: ["off", "low", "medium", "max", "ultra"],
        source: "discovered",
        isDefault: m.isDefault || false,
      }));

      // Models from core are authoritative; sort default model first if flagged
      models.sort((a: any, b: any) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

      return { models, source: "remote" };
    } catch (e) {
      logger.app("provider", "error", "failed to list models", { data: String(e) });
      return { models: [], source: "fallback" };
    }
  });

  handle(IPC.invoke.providersReorder, async () => ({ ok: true }));
  handle(IPC.invoke.providersRefreshModelCatalog, async () => ({ refreshed: true }));
  handle(IPC.invoke.providersModelCatalogStatus, async () => ({ status: "ready" }));
  handle(IPC.invoke.providersLookupModel, async () => ({ info: null }));
  handle(IPC.invoke.providersCreate, async (input: any) => ({ provider: input }));
  handle(IPC.invoke.providersUpdate, async (input: any) => ({ provider: input }));
  handle(IPC.invoke.providersSetSecret, async (input: any) => ({ provider: input }));
  handle(IPC.invoke.providersDelete, async () => ({ ok: true }));
  handle(IPC.invoke.providersTest, async () => ({ ok: true, network: "ok" }));
  handle(IPC.invoke.providersOauthVendors, async () => ({ vendors: [] }));
  handle(IPC.invoke.providersOauthStart, async () => ({ loginId: "" }));
  handle(IPC.invoke.providersOauthRespond, async () => ({ ok: true }));
  handle(IPC.invoke.providersOauthCancel, async () => ({ ok: true }));
  handle(IPC.invoke.providersOauthDelete, async () => ({ ok: true }));
  handle(IPC.invoke.secretsSet, async () => ({ ok: true }));
  handle(IPC.invoke.secretsDelete, async () => ({ ok: true }));
  handle(IPC.invoke.secretsHas, async () => ({ has: false }));
}
