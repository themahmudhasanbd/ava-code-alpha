import fs from "node:fs";
import path from "node:path";

import { Ava } from "../src/ava";
import type { AvaConfigObject } from "../src/avaOptions";

function resolveBinaryPath(): string {
  if (process.env.AVA_EXEC_PATH) return process.env.AVA_EXEC_PATH;
  if (process.env.CODEX_EXEC_PATH) return process.env.CODEX_EXEC_PATH;

  const debugCandidate = path.join(process.cwd(), "..", "..", "codex-rs", "target", "debug", "codex");
  if (fs.existsSync(debugCandidate)) return debugCandidate;

  const vendorCandidate = path.join(
    process.cwd(),
    "..",
    "..",
    "ava-cli",
    "vendor",
    "x86_64-unknown-linux-musl",
    "bin",
    "codex",
  );
  if (fs.existsSync(vendorCandidate)) return vendorCandidate;

  return debugCandidate;
}

export const avaExecPath = resolveBinaryPath();

type CreateTestClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  config?: AvaConfigObject;
  configOverrides?: string[];
  env?: Record<string, string>;
  inheritEnv?: boolean;
};

export type TestClient = {
  cleanup: () => void;
  client: Ava;
};

export function createMockClient(url: string): TestClient {
  return createTestClient({
    config: {
      model_provider: "mock",
      model_providers: {
        mock: {
          name: "Mock provider for test",
          base_url: url,
          wire_api: "responses",
          supports_websockets: false,
        },
      },
    },
  });
}

export function createTestClient(options: CreateTestClientOptions = {}): TestClient {
  const env =
    options.inheritEnv === false ? { ...options.env } : { ...getCurrentEnv(), ...options.env };

  return {
    cleanup: () => {},
    client: new Ava({
      avaPathOverride: avaExecPath,
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      config: mergeTestConfig(options.baseUrl, options.config),
      configOverrides: options.configOverrides,
      env,
    }),
  };
}

function mergeTestConfig(
  baseUrl: string | undefined,
  config: AvaConfigObject | undefined,
): AvaConfigObject | undefined {
  const mergedConfig: AvaConfigObject | undefined =
    !baseUrl || hasExplicitProviderConfig(config)
      ? config
      : {
          ...config,
          model_provider: "mock",
          model_providers: {
            mock: {
              name: "Mock provider for test",
              base_url: baseUrl,
              wire_api: "responses",
              supports_websockets: false,
            },
          },
        };
  const featureOverrides = mergedConfig?.features;

  return {
    ...mergedConfig,
    features:
      featureOverrides && typeof featureOverrides === "object" && !Array.isArray(featureOverrides)
        ? { ...featureOverrides, plugins: false }
        : { plugins: false },
  };
}

function hasExplicitProviderConfig(config: AvaConfigObject | undefined): boolean {
  return config?.model_provider !== undefined || config?.model_providers !== undefined;
}

function getCurrentEnv(): Record<string, string> {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (key === "AVA_INTERNAL_ORIGINATOR_OVERRIDE" || key === "CODEX_INTERNAL_ORIGINATOR_OVERRIDE") {
      continue;
    }
    if (value !== undefined) {
      env[key] = value;
    }
  }

  return env;
}
