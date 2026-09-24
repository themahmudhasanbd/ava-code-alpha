import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  HostProcess as RuntimeHostProcess,
  type DiagnosedHostFailure,
  type StderrHandler,
} from "@pi-desktop/host-runtime";
import { ErrorCodes } from "@pi-desktop/shared";
import {
  GlibcUnsupportedError,
  glibcMissingSymbol,
} from "./linux-glibc";
import { DbSchemaTooNewError, parseSchemaTooNew } from "./host-boot-diagnostics";
import { redactValue } from "./logger";

export type {
  HostNotificationHandler,
  ProcessExitHandler,
  StderrHandler,
} from "@pi-desktop/host-runtime";

function resolveHostBinary(): string {
  if (process.env.CODEX_APP_SERVER_BIN && existsSync(process.env.CODEX_APP_SERVER_BIN)) {
    return process.env.CODEX_APP_SERVER_BIN;
  }
  if (process.env.PI_DESKTOP_HOST_BIN && existsSync(process.env.PI_DESKTOP_HOST_BIN)) {
    return process.env.PI_DESKTOP_HOST_BIN;
  }
  const exe = process.platform === "win32" ? ".exe" : "";
  const candidates = [
    // packaged resources
    join(process.resourcesPath || "", `bin/codex-app-server${exe}`),
    join(process.resourcesPath || "", `bin/pi-desktop-host-core${exe}`),
    // ava-rs builds
    join(__dirname, `../../../../ava-rs/target/debug/codex-app-server${exe}`),
    join(__dirname, `../../../../ava-rs/target/release/codex-app-server${exe}`),
    join(__dirname, `../../../../../ava-rs/target/debug/codex-app-server${exe}`),
    join(__dirname, `../../../../../ava-rs/target/release/codex-app-server${exe}`),
    "/var/www/ava-code/ava-rs/target/debug/codex-app-server",
    "/var/www/ava-code/ava-rs/target/release/codex-app-server",
    "/root/.cargo/bin/codex-app-server",
    "/usr/local/bin/codex-app-server",
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  throw new Error(
    "codex-app-server binary not found. Please ensure ava-rs target/debug/codex-app-server exists.",
  );
}

function resolveBuiltinPluginsDir(): string | null {
  const candidates = [
    join(process.resourcesPath || "", "plugins"),
    join(__dirname, "../../resources/plugins"),
    join(__dirname, "../../../resources/plugins"),
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
}

export function diagnoseHostFailure({
  lastStderr,
  message,
}: {
  lastStderr: string;
  message: string;
}): DiagnosedHostFailure | null {
  const schema = parseSchemaTooNew(lastStderr) ?? parseSchemaTooNew(message);
  if (schema) {
    return Object.assign(new DbSchemaTooNewError(schema), {
      errorCode: ErrorCodes.HOST_UNAVAILABLE,
    });
  }
  if (glibcMissingSymbol(lastStderr) || glibcMissingSymbol(message)) {
    return Object.assign(new GlibcUnsupportedError(), {
      errorCode: ErrorCodes.HOST_UNAVAILABLE,
    });
  }
  return null;
}

function fallbackStderrLogger(text: string): void {
  console.error(
    `[host/runtime] ${JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      channel: "host",
      category: "runtime",
      event: "child.process.stderr",
      message: "child process stderr",
      data: { output: redactValue(text.trimEnd()) },
    })}`,
  );
}

export class HostProcess extends RuntimeHostProcess {
  constructor(dataDir: string, onStderr?: StderrHandler) {
    const builtinPlugins = resolveBuiltinPluginsDir();
    super({
      binaryPath: resolveHostBinary(),
      dataDir,
      args: ["--listen", "stdio://"],
      env: {
        AVA_CODE_HOME: dataDir,
        AVA_HOME: dataDir,
        PI_DESKTOP_DATA_DIR: dataDir,
        ...(builtinPlugins ? { PI_DESKTOP_BUILTIN_PLUGINS_DIR: builtinPlugins } : {}),
      },
      onStderr: onStderr ?? fallbackStderrLogger,
      diagnoseFailure: diagnoseHostFailure,
    });
  }
}
