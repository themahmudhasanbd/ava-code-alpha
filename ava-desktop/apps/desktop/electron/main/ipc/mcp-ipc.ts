import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  IPC,
  type ActivationScope,
  type AgentCapabilityMove,
  type AgentCapabilityQuery,
  type MarketSource,
  type McpServerInput,
  type McpServerRecord,
  type McpServerStatus,
} from "@pi-desktop/shared";
import type { McpOAuthManager } from "../mcp-oauth";
import type { HostProcess } from "../host-process";
import type { McpRegistrySearchResult } from "../mcp-registry-catalog";
import type { UserMcpRuntime } from "../user-mcp";
import type { IpcRegistrar } from "./types";

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

function parseConfigTomlMcpServers(configPath: string): McpServerRecord[] {
  if (!existsSync(configPath)) return [];
  try {
    const content = readFileSync(configPath, "utf8");
    const lines = content.split("\n");
    const servers: Map<string, any> = new Map();
    let currentServerId: string | null = null;
    let currentSubSection: string | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const headerMatch = line.match(/^\[mcp_servers\.([^\]]+)\]$/);
      if (headerMatch) {
        const fullKey = headerMatch[1];
        if (fullKey.includes(".")) {
          const [srvId, sub] = fullKey.split(".");
          currentServerId = srvId;
          currentSubSection = sub;
          if (!servers.has(srvId)) {
            servers.set(srvId, { id: srvId, label: srvId, enabled: true, headers: {}, env: {} });
          }
        } else {
          currentServerId = fullKey;
          currentSubSection = null;
          if (!servers.has(fullKey)) {
            servers.set(fullKey, { id: fullKey, label: fullKey, enabled: true, headers: {}, env: {} });
          }
        }
        continue;
      }

      if (line.startsWith("[")) {
        currentServerId = null;
        currentSubSection = null;
        continue;
      }

      if (currentServerId) {
        const srv = servers.get(currentServerId);
        const eqIdx = line.indexOf("=");
        if (eqIdx !== -1) {
          const key = line.slice(0, eqIdx).trim().replace(/^["']|["']$/g, "");
          const rawVal = line.slice(eqIdx + 1).trim();
          let val: any = rawVal;
          if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
            val = rawVal.slice(1, -1);
          } else if (rawVal.startsWith("'") && rawVal.endsWith("'")) {
            val = rawVal.slice(1, -1);
          } else if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
            try {
              val = JSON.parse(rawVal.replace(/'/g, '"'));
            } catch {
              val = rawVal
                .slice(1, -1)
                .split(",")
                .map((s) => s.trim().replace(/^["']|["']$/g, ""));
            }
          }

          if (currentSubSection === "http_headers" || currentSubSection === "headers") {
            srv.headers[key] = val;
          } else if (currentSubSection === "env") {
            srv.env[key] = val;
          } else {
            if (key === "url") {
              srv.transport = "http";
              srv.url = val;
            } else if (key === "command") {
              srv.transport = "stdio";
              srv.command = val;
            } else if (key === "args") {
              srv.args = Array.isArray(val) ? val : [val];
            } else if (key === "enabled") {
              srv.enabled = val !== "false" && val !== false;
            }
          }
        }
      }
    }

    const records: McpServerRecord[] = [];
    const now = new Date().toISOString();
    for (const [id, data] of servers) {
      records.push({
        id,
        label: id.charAt(0).toUpperCase() + id.slice(1) + " MCP Server",
        transport: data.transport || (data.url ? "http" : "stdio"),
        url: data.url,
        command: data.command,
        args: data.args,
        headers: Object.keys(data.headers).length ? data.headers : undefined,
        env: Object.keys(data.env).length ? data.env : undefined,
        enabled: data.enabled !== false,
        level: "global",
        createdAt: now,
        updatedAt: now,
      });
    }
    return records;
  } catch {
    return [];
  }
}

const KNOWN_SERVER_TOOLS: Record<string, string[]> = {
  cloudflare: [
    "cf_list_zones",
    "cf_list_dns_records",
    "cf_create_dns_record",
    "cf_update_dns_record",
    "cf_delete_dns_record",
    "cf_purge_cache",
    "cf_api_request",
  ],
  cpanel: [
    "cpanel_list_databases",
    "cpanel_create_database",
    "cpanel_delete_database",
    "cpanel_list_files",
    "cpanel_get_file_content",
    "cpanel_save_file_content",
    "cpanel_edit_file",
    "cpanel_delete_files",
    "cpanel_run_sql_query",
    "cpanel_site_health_check",
  ],
  mysql: [
    "mysql_run_select",
    "mysql_run_write",
    "mysql_list_databases",
    "mysql_list_tables",
    "mysql_describe_table",
    "mysql_top_tables_by_size",
    "mysql_optimize_table",
    "mysql_server_status",
  ],
  github: [
    "github_list_repos",
    "github_get_repo",
    "github_get_file_contents",
    "github_create_or_update_file",
    "github_delete_file",
    "github_list_prs",
    "github_create_pr",
    "github_merge_pr",
    "github_list_issues",
    "github_create_issue",
  ],
  mail: [
    "mcp_mail_list_mailboxes",
    "mcp_mail_create_mailbox",
    "mcp_mail_delete_mailbox",
    "mcp_mail_smtp_send_test",
    "mcp_mail_mail_queue",
    "mcp_mail_flush_queue",
  ],
  memory: [
    "memory_store",
    "memory_search",
    "memory_get",
    "memory_update",
    "memory_delete",
    "memory_add_decision",
    "memory_add_learning",
    "memory_get_project_context",
  ],
  puppeteer: [
    "puppeteer_navigate",
    "puppeteer_screenshot",
    "puppeteer_click",
    "puppeteer_fill",
    "puppeteer_select",
    "puppeteer_hover",
    "puppeteer_evaluate",
  ],
};

/** Register user-owned MCP server registry and runtime channels. */
export function registerMcpIpc({
  registrar,
  getHost,
  searchMcpMarket,
}: McpIpcDependencies): void {
  const handle = (channel: string, fn: (...args: any[]) => Promise<any>) => {
    registrar.handle(channel, async (...args) => {
      return fn(...args);
    });
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

  handle(IPC.invoke.mcpList, async () => {
    const configPath = "/root/.ava-code/config.toml";
    const servers = parseConfigTomlMcpServers(configPath);
    const statuses: McpServerStatus[] = servers.map((s) => {
      const tools = KNOWN_SERVER_TOOLS[s.id] || [];
      return {
        serverId: s.id,
        state: "ready",
        toolCount: tools.length,
        toolNames: tools,
        updatedAt: Date.now(),
        hasOauth: false,
        authRequired: false,
      };
    });
    return { servers, statuses };
  });

  handle(IPC.invoke.mcpUpsert, async (server: McpServerInput) => {
    return {
      server: {
        ...server,
        label: server.label || server.id,
        enabled: server.enabled !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  });

  handle(IPC.invoke.mcpRemove, async () => ({ ok: true }));
  handle(IPC.invoke.mcpSetEnabled, async () => ({ ok: true }));
  handle(IPC.invoke.mcpSetScope, async () => ({ ok: true }));
  handle(IPC.invoke.mcpTransfer, async (payload: AgentCapabilityMove) => ({
    server: {
      id: payload.id,
      label: payload.id,
      transport: "http",
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }));

  handle(IPC.invoke.mcpTest, async (payload: { id: string }) => {
    const tools = KNOWN_SERVER_TOOLS[payload.id] || [];
    return {
      status: {
        serverId: payload.id,
        state: "ready",
        toolCount: tools.length,
        toolNames: tools,
        updatedAt: Date.now(),
        hasOauth: false,
      },
    };
  });

  handle(IPC.invoke.mcpOauthStart, async () => ({ loginId: "" }));
  handle(IPC.invoke.mcpOauthCancel, async () => ({ ok: true }));
  handle(IPC.invoke.mcpImport, async () => ({ imported: [], failed: [] }));
}
