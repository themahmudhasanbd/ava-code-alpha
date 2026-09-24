import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  IPC,
  type AgentCapabilityQuery,
  type UserSkillRecord,
} from "@pi-desktop/shared";
import type { HostProcess } from "../host-process";
import type { Logger } from "../logger";
import {
  searchSkillMarket,
  fetchSkillMarketDocument,
} from "../skill-market-catalog";
import type { IpcRegistrar } from "./types";

export type SkillsIpcDependencies = {
  registrar: IpcRegistrar;
  getHost: () => HostProcess | null;
  optionalWorkspaceRoot: () => Promise<string | null>;
  activeUserSubagentDocuments: (projectPath: string | undefined) => Promise<any[]>;
  disabledBuiltinSubagents: () => Promise<string[]>;
  stripWinLongPrefix: (path: string) => string;
  sendToRenderer: (channel: string, payload?: unknown) => void;
  searchSkillMarket: (query: string, sources: { id: string; name: string; url: string }[]) => Promise<any>;
  fetchSkillMarketDocument: (entry: { id: string; name: string; url: string }) => Promise<any>;
  logger: Pick<Logger, "app">;
};

function loadSkillsFromDisk(): UserSkillRecord[] {
  const baseDir = "/root/.ava-code/skills";
  const results: UserSkillRecord[] = [];
  const dirs = [baseDir, join(baseDir, ".system")];
  const now = new Date().toISOString();

  for (const d of dirs) {
    if (!existsSync(d)) continue;
    try {
      const items = readdirSync(d);
      for (const item of items) {
        if (item.startsWith(".")) continue;
        const fullPath = join(d, item);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          const skillFile = join(fullPath, "SKILL.md");
          let size = 0;
          let desc = `Builtin capability: ${item}`;
          if (existsSync(skillFile)) {
            const fileStat = statSync(skillFile);
            size = fileStat.size;
            try {
              const content = readFileSync(skillFile, "utf8");
              const m = content.match(/description:\s*(.+)$/m);
              if (m) desc = m[1].trim();
            } catch {}
          }
          results.push({
            id: item,
            name: item.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
            level: "global",
            description: desc,
            enabled: true,
            source: "created",
            path: existsSync(skillFile) ? skillFile : fullPath,
            sizeBytes: size,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    } catch {}
  }
  return results;
}

export function registerSkillsIpc({
  registrar,
  searchSkillMarket: searchMarket,
  fetchSkillMarketDocument: fetchMarketDoc,
}: SkillsIpcDependencies): void {
  registrar.handle(
    IPC.invoke.skillMarketSearch,
    async ({ query, sources }: { query?: string; sources?: { id: string; name: string; url: string }[] } = {}) => {
      return searchMarket(query ?? "", Array.isArray(sources) ? sources : []);
    },
  );

  registrar.handle(
    IPC.invoke.skillMarketFetch,
    async ({ entry }: { entry: { id: string; name: string; url: string } }) => {
      return fetchMarketDoc(entry);
    },
  );

  const handle = (channel: string, fn: (...args: any[]) => Promise<any>) => {
    registrar.handle(channel, async (...args) => {
      return fn(...args);
    });
  };

  handle(IPC.invoke.skillList, async (_query: Partial<AgentCapabilityQuery> = {}) => {
    const skills = loadSkillsFromDisk();
    return { skills };
  });

  handle(IPC.invoke.skillCreate, async ({ skill }: any) => {
    return { skill };
  });

  handle(IPC.invoke.skillImport, async () => ({ canceled: true }));
  handle(IPC.invoke.skillUpdate, async ({ id, ...skill }: any) => ({ id, ...skill }));
  handle(IPC.invoke.skillRead, async (payload: any) => {
    const id = typeof payload === "string" ? payload : payload?.id;
    const skills = loadSkillsFromDisk();
    const skill = skills.find((s) => s.id === id) || null;
    return { skill };
  });
  handle(IPC.invoke.skillRemove, async () => ({ ok: true }));
  handle(IPC.invoke.skillSetEnabled, async () => ({ ok: true }));
  handle(IPC.invoke.skillSetScope, async () => ({ ok: true }));
  handle(IPC.invoke.skillTransfer, async () => ({ ok: true }));
  handle(IPC.invoke.skillReveal, async () => ({ ok: true }));

  handle(IPC.invoke.subagentList, async () => ({ agents: [] }));
  handle(IPC.invoke.subagentCatalog, async () => ({
    subagents: [],
    builtins: [],
    diagnostics: [],
    projectPath: null,
  }));
  handle(IPC.invoke.subagentCreate, async () => ({ ok: true }));
  handle(IPC.invoke.subagentUpdate, async () => ({ ok: true }));
  handle(IPC.invoke.subagentRead, async () => ({ subagent: null }));
  handle(IPC.invoke.subagentRemove, async () => ({ ok: true }));
  handle(IPC.invoke.subagentSetEnabled, async () => ({ ok: true }));
  handle(IPC.invoke.subagentSetBuiltinEnabled, async () => ({ ok: true }));
  handle(IPC.invoke.subagentSetScope, async () => ({ ok: true }));
  handle(IPC.invoke.subagentReveal, async () => ({ ok: true }));
}
