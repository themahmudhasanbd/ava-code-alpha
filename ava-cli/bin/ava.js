#!/usr/bin/env node
// Unified entry point for the AvA Code Alpha CLI.

import { spawn } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "fs";
import { createRequire } from "node:module";
import path from "path";
import { fileURLToPath } from "url";

// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const packageRoot = realpathSync(path.join(__dirname, ".."));

const PLATFORM_PACKAGE_BY_TARGET = {
  "x86_64-unknown-linux-musl": "ava-code-alpha-linux-x64",
  "aarch64-unknown-linux-musl": "ava-code-alpha-linux-arm64",
  "x86_64-apple-darwin": "ava-code-alpha-darwin-x64",
  "aarch64-apple-darwin": "ava-code-alpha-darwin-arm64",
  "x86_64-pc-windows-msvc": "ava-code-alpha-win32-x64",
  "aarch64-pc-windows-msvc": "ava-code-alpha-win32-arm64",
};

const { platform, arch } = process;

let targetTriple = null;
switch (platform) {
  case "linux":
  case "android":
    switch (arch) {
      case "x64":
        targetTriple = "x86_64-unknown-linux-musl";
        break;
      case "arm64":
        targetTriple = "aarch64-unknown-linux-musl";
        break;
      default:
        break;
    }
    break;
  case "darwin":
    switch (arch) {
      case "x64":
        targetTriple = "x86_64-apple-darwin";
        break;
      case "arm64":
        targetTriple = "aarch64-apple-darwin";
        break;
      default:
        break;
    }
    break;
  case "win32":
    switch (arch) {
      case "x64":
        targetTriple = "x86_64-pc-windows-msvc";
        break;
      case "arm64":
        targetTriple = "aarch64-pc-windows-msvc";
        break;
      default:
        break;
    }
    break;
  default:
    break;
}

if (!targetTriple) {
  throw new Error(`Unsupported platform: ${platform} (${arch})`);
}

const platformPackage = PLATFORM_PACKAGE_BY_TARGET[targetTriple];

function findExecutable() {
  let vendorRoot;
  if (platformPackage) {
    try {
      const packageJsonPath = require.resolve(`${platformPackage}/package.json`);
      vendorRoot = path.join(path.dirname(packageJsonPath), "vendor");
    } catch {
      vendorRoot = path.join(__dirname, "..", "vendor");
    }
  } else {
    vendorRoot = path.join(__dirname, "..", "vendor");
  }

  const binaryNames =
    process.platform === "win32"
      ? ["ava.exe", "ava-alpha.exe"]
      : ["ava", "ava-alpha"];

  for (const name of binaryNames) {
    const candidate = path.join(vendorRoot, targetTriple, "bin", name);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  // Also check local target build directories if in development
  const localBuildCandidates = [
    path.join(__dirname, "..", "..", "ava-rs", "target", "release", "ava"),
    path.join(__dirname, "..", "..", "target", "release", "ava"),
    path.join(__dirname, "..", "..", "ava-rs", "target", "debug", "ava"),
  ];

  for (const candidate of localBuildCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `AvA executable not found for ${targetTriple}. Please build or install the native binary.`,
  );
}

const binaryPath = findExecutable();

// Automatically load Antigravity & other provider credentials from auth.json
try {
  if (!process.env.ANTIGRAVITY_API_KEY) {
    const authPaths = [
      path.join(process.env.HOME || "/root", ".config/ava/auth.json"),
      path.join(process.env.HOME || "/root", ".local/share/ava/auth.json"),
    ];
    for (const p of authPaths) {
      if (existsSync(p)) {
        const authData = JSON.parse(readFileSync(p, "utf-8"));
        if (authData?.antigravity?.access) {
          process.env.ANTIGRAVITY_API_KEY = authData.antigravity.access;
          break;
        }
      }
    }
  }
} catch (_) {}

const child = spawn(binaryPath, process.argv.slice(2), {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
