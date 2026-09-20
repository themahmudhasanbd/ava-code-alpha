import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach } from "@jest/globals";

const originalAvaHome = process.env.AVA_HOME || process.env.CODEX_HOME;
let currentAvaHome: string | undefined;

beforeEach(async () => {
  currentAvaHome = await fs.mkdtemp(path.join(os.tmpdir(), "ava-sdk-test-"));
  process.env.AVA_HOME = currentAvaHome;
  process.env.CODEX_HOME = currentAvaHome;
});

afterEach(async () => {
  const homeToDelete = currentAvaHome;
  currentAvaHome = undefined;

  if (originalAvaHome === undefined) {
    delete process.env.AVA_HOME;
    delete process.env.CODEX_HOME;
  } else {
    process.env.AVA_HOME = originalAvaHome;
    process.env.CODEX_HOME = originalAvaHome;
  }

  if (homeToDelete) {
    await fs.rm(homeToDelete, { recursive: true, force: true });
  }
});
