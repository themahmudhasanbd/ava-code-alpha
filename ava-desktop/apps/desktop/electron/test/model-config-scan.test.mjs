import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(join(here, "..", "..", "test", "helpers", "ts-import-hooks.mjs")));
const { scanModelConfigs } = await import("../main/importers/model-config.ts");

test("model discovery reads AvA configuration but never the native harness home", async () => {
  const root = await mkdtemp(join(tmpdir(), "ava-model-config-scan-"));
  const home = join(root, "home");
  try {
    const avaConfig = join(home, ".ava-code", "config.toml");
    const harnessConfig = join(home, ".codex", "config.toml");
    await mkdir(dirname(avaConfig), { recursive: true });
    await mkdir(dirname(harnessConfig), { recursive: true });
    await writeFile(
      avaConfig,
      [
        'model = "ava-model"',
        "[model_providers.ava]",
        'name = "AvA"',
        'base_url = "https://ava.example.test/v1"',
        'api_key = "ava-key"',
      ].join("\n"),
    );
    await writeFile(
      harnessConfig,
      [
        'model = "harness-model"',
        "[model_providers.harness]",
        'name = "Native Harness"',
        'base_url = "https://harness.example.test/v1"',
        'api_key = "harness-key"',
      ].join("\n"),
    );

    const drafts = await scanModelConfigs({ homeDir: home, env: {} });

    assert.deepEqual(drafts.map((draft) => draft.externalId), ["ava"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
