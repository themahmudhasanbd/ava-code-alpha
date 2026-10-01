import { shell } from "electron";
import {
  IPC,
  type AgentCapabilityQuery,
  type McpConnectionState,
  type McpOAuthLoginEvent,
  type McpServerInput,
  type McpServerRecord,
  type McpServerStatus,
  type MarketSource,
} from "@pi-desktop/shared";
import type { McpOAuthManager } from "../mcp-oauth";
import type { HostProcess } from "../host-process";
import type { McpRegistrySearchResult } from "../mcp-registry-catalog";
import type { UserMcpRuntime } from "../user-mcp";
import type { IpcRegistrar } from "./types";
import { parseAllowedExternalUrl } from "../safe-open-external";

export type McpIpcDependencies = {
  registrar: IpcRegistrar;
  getHost: () => HostProcess | null;
  userMcp: UserMcpRuntime;
  oauth?: McpOAuthManager;
  currentWorkspacePath: () => string | null;
  refreshUserMcp: (projectPath?: string | null) => Promise<McpServerRecord[]>;
  describeError: (error: unknown) => string;
  sendToRenderer: (channel: string, payload?: unknown) => void;
  searchMcpMarket: (
    query: string,
    sources: MarketSource[],
    options?: { more?: boolean },
  ) => Promise<McpRegistrySearchResult>;
};

/**
 * ava-core keeps a single global MCP server registry (`mcp_servers` in the
 * user config). There is no project-scoped registry, so project-level
 * operations either return empty (list) or fail loudly (mutations).
 */
const PROJECT_LEVEL_UNSUPPORTED =
  "Project-level MCP servers are not supported by ava-core. Manage MCP servers at the Global level.";

/** Raw JSON shapes from the ava-core wire protocol (camelCase). */
type WireMcpServerStatus = {
  name?: unknown;
  runtimeStatus?: unknown;
  runtime_status?: unknown;
  authStatus?: unknown;
  auth_status?: unknown;
  tools?: unknown;
  toolsError?: unknown;
  tools_error?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function mapRuntimeState(runtime: string | null): McpConnectionState {
  switch (runtime) {
    case "connected":
      return "ready";
    case "starting":
      return "connecting";
    case "failed":
      return "failed";
    default:
      // notStarted, authenticationRequired, cancelled, disabled, or unknown
      return "idle";
  }
}

function toMcpServerStatus(wire: unknown, serverId: string): McpServerStatus {
  const rec = asRecord(wire);
  const runtime = asString(rec.runtimeStatus ?? rec.runtime_status);
  const auth = asString(rec.authStatus ?? rec.auth_status);
  const toolNames = Object.keys(asRecord(rec.tools));
  const message = asString(rec.toolsError ?? rec.tools_error);
  return {
    serverId,
    state: mapRuntimeState(runtime),
    toolCount: toolNames.length,
    toolNames,
    message: message || undefined,
    updatedAt: Date.now(),
    hasOauth: auth === "oauth" || auth === "notLoggedIn",
    authRequired: runtime === "authenticationRequired",
  };
}

function cleanStringRecord(value: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === "string") out[key] = val;
  }
  return out;
}

/** Map one `mcp_servers.<name>` config entry to the desktop record shape. */
function toMcpServerRecord(name: string, config: unknown): McpServerRecord {
  const rec = asRecord(config);
  const now = new Date().toISOString();
  const url = asString(rec.url);
  const headers = asRecord(rec.http_headers);
  const env = asRecord(rec.env);
  const args = Array.isArray(rec.args)
    ? rec.args.filter((a): a is string => typeof a === "string")
    : [];
  return {
    id: name,
    label: name,
    level: "global",
    transport: url ? "http" : "stdio",
    command: asString(rec.command) ?? undefined,
    args: args.length ? args : undefined,
    env: Object.keys(env).length ? cleanStringRecord(env) : undefined,
    url: url ?? undefined,
    headers: Object.keys(headers).length ? cleanStringRecord(headers) : undefined,
    enabled: rec.enabled !== false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Quote one keyPath segment so server names containing dots (or quotes)
 * survive ava-core's config keyPath parsing.
 */
function quoteKeyPathSegment(segment: string): string {
  return `"${segment.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function serverKeyPath(name: string): string {
  return `mcp_servers.${quoteKeyPathSegment(name)}`;
}

function requireServerId(value: unknown): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id) throw new Error("MCP server id is required");
  return id;
}

function assertGlobalLevel(query: Partial<AgentCapabilityQuery> | undefined): void {
  if (query?.level === "project") throw new Error(PROJECT_LEVEL_UNSUPPORTED);
}

/** Read the effective `mcp_servers` table via `config/read`. */
async function readMcpServerConfigs(host: HostProcess): Promise<Record<string, unknown>> {
  const res = await host.call<{ config?: unknown }>("config/read", {});
  return asRecord(asRecord(res?.config).mcp_servers);
}

/** Live runtime statuses via `mcpServerStatus/list`. */
async function listWireStatuses(host: HostProcess): Promise<unknown[]> {
  const res = await host.call<{ data?: unknown }>("mcpServerStatus/list", {});
  return Array.isArray(res?.data) ? res.data : [];
}

/** Reload the MCP registry so config changes take effect. */
async function reloadMcpServers(host: HostProcess): Promise<void> {
  await host.call("config/mcpServer/reload", {});
}

async function requireExistingServer(
  host: HostProcess,
  id: string,
): Promise<Record<string, unknown>> {
  const configs = await readMcpServerConfigs(host);
  const config = configs[id];
  if (!config) throw new Error(`MCP server "${id}" is not configured`);
  return asRecord(config);
}

/** In-flight OAuth completion polls, keyed by loginId, so cancel stops them. */
const oauthPolls = new Map<string, { cancelled: boolean }>();

const OAUTH_POLL_INTERVAL_MS = 3000;
const OAUTH_POLL_TIMEOUT_MS = 5 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Watch `mcpServerStatus/list` until the server reports OAuth credentials
 * (or the timeout/cancel hits) and forward the outcome as renderer events the
 * settings page is already subscribed to.
 */
async function pollMcpOAuthCompletion(
  host: HostProcess,
  serverId: string,
  loginId: string,
  sendToRenderer: (channel: string, payload?: unknown) => void,
): Promise<void> {
  const state = { cancelled: false };
  oauthPolls.set(loginId, state);
  try {
    const deadline = Date.now() + OAUTH_POLL_TIMEOUT_MS;
    while (!state.cancelled && Date.now() < deadline) {
      await sleep(OAUTH_POLL_INTERVAL_MS);
      if (state.cancelled) break;
      let wire: unknown = null;
      try {
        const statuses = await listWireStatuses(host);
        wire = statuses.find((s) => asString(asRecord(s).name) === serverId) ?? null;
      } catch {
        continue; // transient failure: keep polling until the deadline
      }
      const auth = asString(asRecord(wire).authStatus ?? asRecord(wire).auth_status);
      if (auth === "oauth") {
        const event: McpOAuthLoginEvent = {
          loginId,
          serverId,
          kind: "done",
          status: toMcpServerStatus(wire, serverId),
        };
        sendToRenderer(IPC.event.mcpOauth, event);
        return;
      }
    }
    if (!state.cancelled) {
      const event: McpOAuthLoginEvent = {
        loginId,
        serverId,
        kind: "error",
        message:
          "Timed out waiting for OAuth completion. If you finished signing in, use Test to refresh the status.",
      };
      sendToRenderer(IPC.event.mcpOauth, event);
    }
  } finally {
    if (oauthPolls.get(loginId) === state) oauthPolls.delete(loginId);
  }
}

/** Register user-owned MCP server registry and runtime channels. */
export function registerMcpIpc({
  registrar,
  getHost,
  searchMcpMarket,
  sendToRenderer,
}: McpIpcDependencies): void {
  const handle = (
    channel: string,
    fn: (host: HostProcess | null, ...args: any[]) => Promise<any>,
  ) => {
    registrar.handle(channel, async (...args) => fn(getHost(), ...args));
  };

  registrar.handle(
    IPC.invoke.mcpMarketSearch,
    async ({
      query,
      sources,
      more,
    }: { query?: string; sources?: MarketSource[]; more?: boolean } = {}) =>
      searchMcpMarket(query ?? "", Array.isArray(sources) ? sources : [], { more: more === true }),
  );

  /**
   * List configured servers merged with live runtime statuses.
   * Config comes from `config/read` (`mcp_servers` table); statuses from
   * `mcpServerStatus/list`. Project level is always empty: ava-core has no
   * project-scoped MCP registry.
   */
  handle(IPC.invoke.mcpList, async (host, query: AgentCapabilityQuery = { level: "global" }) => {
    if (!host) throw new Error("host unavailable");
    if (query?.level === "project") return { servers: [], statuses: [] };
    const [configs, wireStatuses] = await Promise.all([
      readMcpServerConfigs(host),
      listWireStatuses(host),
    ]);
    const statusByName = new Map<string, unknown>();
    for (const wire of wireStatuses) {
      const name = asString(asRecord(wire).name);
      if (name) statusByName.set(name, wire);
    }
    const servers = Object.keys(configs)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => toMcpServerRecord(name, configs[name]));
    return {
      servers,
      statuses: servers.map((server) => toMcpServerStatus(statusByName.get(server.id), server.id)),
    };
  });

  /**
   * Create or replace a server via `config/batchWrite`, then
   * `config/mcpServer/reload` so the registry picks it up.
   * Fields the editor does not manage (e.g. bearer_token_env_var) are
   * preserved from the existing entry so an edit never drops them.
   */
  handle(IPC.invoke.mcpUpsert, async (host, server: McpServerInput) => {
    if (!host) throw new Error("host unavailable");
    if (!server || typeof server !== "object") throw new Error("server is required");
    assertGlobalLevel(server);
    const id = requireServerId(server?.id);
    const existing = asRecord((await readMcpServerConfigs(host))[id]);

    let value: Record<string, unknown>;
    if (server.transport === "http") {
      const url = server.url?.trim();
      if (!url) throw new Error("URL is required for HTTP transport");
      const headers =
        server.headers && Object.keys(server.headers).length ? { ...server.headers } : undefined;
      value = { url, ...(headers ? { http_headers: headers } : {}) };
    } else if (server.transport === "stdio") {
      const command = server.command?.trim();
      if (!command) throw new Error("Command is required for stdio transport");
      const env = server.env && Object.keys(server.env).length ? { ...server.env } : undefined;
      value = {
        command,
        args: Array.isArray(server.args) ? server.args : [],
        ...(env ? { env } : {}),
      };
    } else {
      throw new Error(`Unsupported MCP transport: ${String(server.transport)}`);
    }

    const bearerTokenEnvVar =
      asString(existing.bearer_token_env_var) ??
      asString((server as unknown as Record<string, unknown>).bearerTokenEnvVar);
    if (bearerTokenEnvVar) value.bearer_token_env_var = bearerTokenEnvVar;
    value.enabled = server.enabled ?? (existing.enabled !== false);

    await host.call("config/batchWrite", {
      edits: [{ keyPath: serverKeyPath(id), value, mergeStrategy: "replace" }],
      reloadUserConfig: true,
    });
    await reloadMcpServers(host);
    return { server: toMcpServerRecord(id, value) };
  });

  /** Delete a server from the config (`null` + replace removes the key), then reload. */
  handle(
    IPC.invoke.mcpRemove,
    async (host, payload: { id?: unknown } & Partial<AgentCapabilityQuery> = {}) => {
      if (!host) throw new Error("host unavailable");
      assertGlobalLevel(payload);
      const id = requireServerId(payload?.id);
      await requireExistingServer(host, id);
      await host.call("config/batchWrite", {
        edits: [{ keyPath: serverKeyPath(id), value: null, mergeStrategy: "replace" }],
        reloadUserConfig: true,
      });
      await reloadMcpServers(host);
      return { ok: true };
    },
  );

  /** Flip the server's `enabled` flag via `config/batchWrite`, then reload. */
  handle(
    IPC.invoke.mcpSetEnabled,
    async (
      host,
      payload: { id?: unknown; enabled?: unknown } & Partial<AgentCapabilityQuery> = {},
    ) => {
      if (!host) throw new Error("host unavailable");
      assertGlobalLevel(payload);
      const id = requireServerId(payload?.id);
      if (typeof payload?.enabled !== "boolean") throw new Error("enabled must be a boolean");
      await requireExistingServer(host, id);
      await host.call("config/batchWrite", {
        edits: [
          { keyPath: `${serverKeyPath(id)}.enabled`, value: payload.enabled, mergeStrategy: "upsert" },
        ],
        reloadUserConfig: true,
      });
      await reloadMcpServers(host);
      return { ok: true };
    },
  );

  /**
   * Force a registry reload (fresh handshake for every server) and report the
   * live status of the requested one.
   */
  handle(
    IPC.invoke.mcpTest,
    async (host, payload: { id?: unknown } & Partial<AgentCapabilityQuery> = {}) => {
      if (!host) throw new Error("host unavailable");
      assertGlobalLevel(payload);
      const id = requireServerId(payload?.id);
      await reloadMcpServers(host);
      const wire = (await listWireStatuses(host)).find(
        (s) => asString(asRecord(s).name) === id,
      );
      if (!wire) throw new Error(`MCP server "${id}" was not found after reload`);
      return { status: toMcpServerStatus(wire, id) };
    },
  );

  /**
   * Start the server-driven OAuth flow (`mcpServer/oauth/login`), open the
   * returned authorization URL in the system browser, and poll the server
   * status until the login completes. Completion (or timeout/cancel) is
   * forwarded as `mcpOauth` renderer events the settings page subscribes to.
   */
  handle(
    IPC.invoke.mcpOauthStart,
    async (host, payload: { id?: unknown } & Partial<AgentCapabilityQuery> = {}) => {
      if (!host) throw new Error("host unavailable");
      assertGlobalLevel(payload);
      const id = requireServerId(payload?.id);
      await requireExistingServer(host, id);
      const res = await host.call<{ authorizationUrl?: unknown; authorization_url?: unknown }>(
        "mcpServer/oauth/login",
        { name: id },
      );
      const rawUrl = asString(res?.authorizationUrl ?? res?.authorization_url);
      if (!rawUrl) throw new Error(`OAuth login for "${id}" did not return an authorization URL`);
      const url = parseAllowedExternalUrl(rawUrl);
      if (!url) throw new Error("OAuth server returned a disallowed authorization URL");
      const loginId = `mcp-oauth-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const authUrlEvent: McpOAuthLoginEvent = {
        loginId,
        serverId: id,
        kind: "authUrl",
        url,
        opened: true,
      };
      sendToRenderer(IPC.event.mcpOauth, authUrlEvent);
      await shell.openExternal(url);
      void pollMcpOAuthCompletion(host, id, loginId, sendToRenderer);
      return { ok: true, loginId };
    },
  );

  /** Stop the completion poll for an in-flight OAuth login. */
  handle(IPC.invoke.mcpOauthCancel, async (_host, payload: { loginId?: unknown } = {}) => {
    const loginId = asString(payload?.loginId);
    if (loginId) {
      const poll = oauthPolls.get(loginId);
      if (poll) {
        poll.cancelled = true;
        oauthPolls.delete(loginId);
      }
    }
    return { ok: true };
  });
}
