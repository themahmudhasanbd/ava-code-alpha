import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { IPC } from "@pi-desktop/shared";
import type { HostProcess } from "../host-process";
import type { IpcRegistrar } from "./types";

export type SettingsIpcDependencies = {
  registrar: IpcRegistrar;
  getHost: () => HostProcess | null;
  getSidecar?: () => any;
  dataDir: string;
  normalizeSettings?: (settings: unknown) => unknown;
  validateSettingsWrite?: (settings: unknown) => any;
  testNetworkProxy?: (settings: unknown) => Promise<unknown>;
  applyNetworkProxyFromAppSettings?: (settings: unknown) => Promise<unknown>;
  currentNetworkProxy?: () => unknown;
  applyApplicationMenuSettings?: (settings?: any) => void;
  applyDeveloperMode?: (settings?: any) => void;
  resolveEffectiveCommandShell?: () => Promise<unknown>;
};

function getSettingsPath(dataDir: string): string {
  return join(dataDir, "desktop-settings.json");
}

function loadDesktopSettings(dataDir: string): any {
  const p = getSettingsPath(dataDir);
  const defaults = {
    theme: "system",
    language: "en",
    defaultProviderId: "omniroute",
    defaultModelId: "powerful-coding-combo",
    developerMode: false,
  };
  if (existsSync(p)) {
    try {
      const data = JSON.parse(readFileSync(p, "utf8"));
      return { ...defaults, ...data };
    } catch {
      return defaults;
    }
  }
  return defaults;
}

function saveDesktopSettings(dataDir: string, settings: any): void {
  const p = getSettingsPath(dataDir);
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(p, JSON.stringify(settings, null, 2), "utf8");
}

export function registerSettingsIpc({
  registrar,
  getHost,
  dataDir,
  applyApplicationMenuSettings,
  applyDeveloperMode,
}: SettingsIpcDependencies): void {
  let host: HostProcess | null = null;
  const handle = (channel: string, fn: (...args: any[]) => Promise<any>) => {
    registrar.handle(channel, async (...args) => {
      host = getHost();
      return fn(...args);
    });
  };

  handle(IPC.invoke.settingsGet, async () => {
    return loadDesktopSettings(dataDir);
  });

  handle(IPC.invoke.networkProxyTest, async () => ({ ok: true }));

  handle(IPC.invoke.settingsSet, async (settings: any) => {
    const current = loadDesktopSettings(dataDir);
    const updated = { ...current, ...(settings || {}) };
    saveDesktopSettings(dataDir, updated);

    if (applyApplicationMenuSettings) {
      applyApplicationMenuSettings(updated);
    }
    if (applyDeveloperMode) {
      applyDeveloperMode(updated);
    }
    return updated;
  });

  handle(IPC.invoke.commandShellList, async () => [
    { id: "bash", name: "Bash", path: "/bin/bash" },
    { id: "sh", name: "Sh", path: "/bin/sh" },
  ]);
}
