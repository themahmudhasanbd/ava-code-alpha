import { createReadStream } from "node:fs";
import fs, { type FileHandle } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { readNdjsonLines } from "@pi-desktop/shared";
import type {
  ExternalSessionSummary,
  ImportedSession,
  ImportedUiMessage,
  SessionImporter,
} from "./types";
import { importedSessionId, toIso, truncateTitle } from "./types";

const AVA_CODE_SESSIONS_DIR = path.join(os.homedir(), ".ava-code", "sessions");
const SESSIONS_DIR = path.join(os.homedir(), ".ava", "sessions");

function readLfJsonl(
  stream: Readable,
  onLine: (line: string) => boolean | void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      reader.close();
      stream.off("error", onError);
      stream.off("end", onEnd);
      if (error !== undefined) reject(error);
      else resolve();
    };
    const onError = (error: Error) => finish(error);
    const onEnd = () => finish();
    const reader = readNdjsonLines(stream, (line) => {
      try {
        if (onLine(line) === false) finish();
      } catch (error) {
        finish(error);
      }
    });
    stream.once("error", onError);
    stream.once("end", onEnd);
  });
}

interface CodexItem {
  type?: string;
  role?: string;
  content?: Array<Record<string, any>>;
  name?: string;
  arguments?: string;
  call_id?: string;
  output?: string;
}

interface ParsedCodexFile {
  externalId: string;
  cwd: string | null;
  startedAt: string | null;
  lastAt: string | null;
  items: Array<{ item: CodexItem; timestamp: string | null }>;
}

function itemText(item: CodexItem): string {
  if (!Array.isArray(item.content)) return "";
  return item.content
    .filter(
      (c) =>
        (c.type === "input_text" || c.type === "output_text" || c.type === "text") &&
        typeof c.text === "string",
    )
    .map((c) => c.text)
    .join("\n")
    .trim();
}

const SYNTHETIC_USER_PREFIXES = [
  "<",
  "# AGENTS.md",
  "# Context from my IDE setup",
  "# In app browser:",
  "# Browser comments:",
  "# Files mentioned by the user:",
  "# Diff comments:",
  "# Selected text:",
  "# Review findings:",
  "You are Codex",
  "You are AvA",
];

function isSyntheticUserText(text: string): boolean {
  return SYNTHETIC_USER_PREFIXES.some((prefix) => text.startsWith(prefix));
}

async function parseFile(filePath: string): Promise<ParsedCodexFile | null> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  const parsed: ParsedCodexFile = {
    externalId: "",
    cwd: null,
    startedAt: null,
    lastAt: null,
    items: [],
  };
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: Record<string, any>;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (obj.type === "session_meta" && obj.payload) {
      parsed.externalId = obj.payload.id ?? parsed.externalId;
      parsed.cwd = obj.payload.cwd ?? parsed.cwd;
      parsed.startedAt = obj.payload.timestamp ?? obj.timestamp ?? parsed.startedAt;
      continue;
    }
    if (obj.type === "response_item" && obj.payload) {
      parsed.items.push({ item: obj.payload, timestamp: obj.timestamp ?? null });
      if (obj.timestamp) parsed.lastAt = obj.timestamp;
      continue;
    }
    if (!parsed.externalId && obj.id && obj.timestamp && !obj.type) {
      parsed.externalId = obj.id;
      parsed.startedAt = obj.timestamp;
      parsed.cwd = obj.cwd ?? null;
      continue;
    }
    if (
      obj.type === "message" ||
      obj.type === "function_call" ||
      obj.type === "function_call_output"
    ) {
      parsed.items.push({ item: obj, timestamp: obj.timestamp ?? null });
      if (obj.timestamp) parsed.lastAt = obj.timestamp;
    }
  }
  if (!parsed.externalId) {
    parsed.externalId = path.basename(filePath, ".jsonl");
  }
  return parsed.items.length > 0 ? parsed : null;
}

export const CODEX_SCAN_FULL_PARSE_MAX_BYTES = 5 * 1024 * 1024;
export const CODEX_SCAN_MAX_FILES = 250;
const CODEX_SCAN_HEAD_BYTES = 1024 * 1024;
const CODEX_SCAN_TAIL_BYTES = 256 * 1024;

async function listSessionFiles(
  dir: string = AVA_CODE_SESSIONS_DIR,
  maxFiles: number = CODEX_SCAN_MAX_FILES,
): Promise<{ files: string[]; truncated: boolean }> {
  const out: string[] = [];
  let truncated = false;
  const walk = async (targetDir: string, depth: number) => {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(targetDir);
    } catch {
      return;
    }
    entries.sort().reverse();
    for (const entry of entries) {
      if (out.length >= maxFiles) {
        truncated = true;
        return;
      }
      const full = path.join(targetDir, entry);
      if (entry.endsWith(".jsonl")) {
        out.push(full);
      } else if (depth < 3) {
        await walk(full, depth + 1);
      }
    }
  };
  await walk(dir, 0);
  if (dir === AVA_CODE_SESSIONS_DIR && out.length < maxFiles) {
    await walk(SESSIONS_DIR, 0);
  }
  return { files: out, truncated };
}

interface CodexScanMeta {
  externalId: string;
  cwd: string | null;
  startedAt: string | null;
  lastAt: string | null;
  mtimeMs: number | null;
  itemCount: number | null;
  sawItem: boolean;
  firstUserText: string | null;
}

function newScanMeta(): CodexScanMeta {
  return {
    externalId: "",
    cwd: null,
    startedAt: null,
    lastAt: null,
    mtimeMs: null,
    itemCount: 0,
    sawItem: false,
    firstUserText: null,
  };
}

function applyCodexLine(line: string, meta: CodexScanMeta): void {
  const trimmed = line.trim();
  if (!trimmed) return;
  let obj: Record<string, any>;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return;
  }
  if (obj.type === "session_meta" && obj.payload) {
    meta.externalId = obj.payload.id ?? meta.externalId;
    meta.cwd = obj.payload.cwd ?? meta.cwd;
    meta.startedAt = obj.payload.timestamp ?? obj.timestamp ?? meta.startedAt;
    return;
  }
  if (obj.type === "response_item" && obj.payload) {
    if (meta.itemCount !== null) meta.itemCount += 1;
    meta.sawItem = true;
    if (obj.timestamp) meta.lastAt = obj.timestamp;
    if (meta.firstUserText === null) {
      const item = obj.payload as CodexItem;
      if (item.type === "message" && item.role === "user") {
        const text = itemText(item);
        if (text && !isSyntheticUserText(text)) meta.firstUserText = text;
      }
    }
    return;
  }
  if (!meta.externalId && obj.id && obj.timestamp && !obj.type) {
    meta.externalId = obj.id;
    meta.startedAt = obj.timestamp;
    meta.cwd = obj.cwd ?? null;
    return;
  }
  if (
    obj.type === "message" ||
    obj.type === "function_call" ||
    obj.type === "function_call_output"
  ) {
    if (meta.itemCount !== null) meta.itemCount += 1;
    meta.sawItem = true;
    if (obj.timestamp) meta.lastAt = obj.timestamp;
    if (meta.firstUserText === null && obj.type === "message" && obj.role === "user") {
      const text = itemText(obj as CodexItem);
      if (text && !isSyntheticUserText(text)) meta.firstUserText = text;
    }
  }
}

async function readTailTimestamp(
  handle: fs.FileHandle,
  size: number,
): Promise<string | null> {
  const start = Math.max(0, size - CODEX_SCAN_TAIL_BYTES);
  const length = size - start;
  const buf = Buffer.alloc(length);
  const read = await handle.read(buf, 0, length, start);
  let from = 0;
  if (start > 0) {
    const firstNewline = buf.indexOf(0x0a);
    if (firstNewline === -1) return null;
    from = firstNewline + 1;
  }
  const text = buf.toString("utf8", from, read.bytesRead);
  let last: string | null = null;
  for (const line of text.split("\n")) {
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      if (typeof obj.timestamp === "string" && obj.timestamp) {
        last = obj.timestamp;
      }
    } catch {}
  }
  return last;
}

async function scanLargeFile(
  filePath: string,
  size: number,
  handle: fs.FileHandle,
): Promise<CodexScanMeta | null> {
  const meta = newScanMeta();
  meta.itemCount = null;

  const headLength = Math.min(CODEX_SCAN_HEAD_BYTES, size);
  const headBuf = Buffer.alloc(headLength);
  const head = await handle.read(headBuf, 0, headLength, 0);
  const headLastNewline = headBuf.lastIndexOf(0x0a, head.bytesRead - 1);
  const headBytes = headLastNewline === -1 ? head.bytesRead : headLastNewline + 1;
  for (const line of headBuf.toString("utf8", 0, headBytes).split("\n")) {
    applyCodexLine(line, meta);
  }

  if (meta.firstUserText === null) {
    const stream = createReadStream(filePath, {
      start: headLastNewline === -1 ? 0 : headBytes,
      encoding: "utf8",
    });
    try {
      await readLfJsonl(stream, (line) => {
        applyCodexLine(line, meta);
        if (meta.firstUserText !== null) return false;
      });
    } finally {
      stream.destroy();
    }
  }

  if (meta.startedAt !== null && headBytes < size) {
    const tail = await readTailTimestamp(handle, size);
    if (tail !== null) meta.lastAt = tail;
  }
  if (!meta.sawItem) return null;
  if (!meta.externalId) meta.externalId = path.basename(filePath, ".jsonl");
  return meta;
}

async function scanFile(filePath: string): Promise<CodexScanMeta | null> {
  let handle: fs.FileHandle;
  let stats: Awaited<ReturnType<typeof handle.stat>>;
  try {
    handle = await fs.open(filePath, "r");
    stats = await handle.stat();
  } catch {
    return null;
  }
  try {
    if (stats.size <= CODEX_SCAN_FULL_PARSE_MAX_BYTES) {
      const meta = newScanMeta();
      meta.mtimeMs = stats.mtimeMs;
      const stream = createReadStream(filePath, { encoding: "utf8" });
      try {
        await readLfJsonl(stream, (line) => {
          applyCodexLine(line, meta);
        });
      } finally {
        stream.destroy();
      }
      if (!meta.sawItem) return null;
      if (!meta.externalId) meta.externalId = path.basename(filePath, ".jsonl");
      return meta;
    }
    const meta = await scanLargeFile(filePath, stats.size, handle);
    if (meta) meta.mtimeMs = stats.mtimeMs;
    return meta;
  } catch {
    return null;
  } finally {
    await handle.close();
  }
}

export interface CodexScanResult {
  sessions: ExternalSessionSummary[];
  truncated: boolean;
}

export async function scanCodexSessionsResult(
  dir: string = AVA_CODE_SESSIONS_DIR,
  maxFiles: number = CODEX_SCAN_MAX_FILES,
): Promise<CodexScanResult> {
  const { files, truncated } = await listSessionFiles(dir, maxFiles);
  const sessions: ExternalSessionSummary[] = [];
  for (const filePath of files) {
    const meta = await scanFile(filePath);
    if (!meta || meta.firstUserText === null) continue;
    const fileTime = toIso(meta.mtimeMs);
    sessions.push({
      source: "codex",
      externalId: meta.externalId,
      title: truncateTitle(meta.firstUserText) || meta.externalId,
      projectPath: meta.cwd,
      model: null,
      createdAt: toIso(meta.startedAt, fileTime),
      updatedAt: toIso(meta.lastAt, toIso(meta.startedAt, fileTime)),
      messageCount: meta.itemCount,
      filePath,
    });
  }
  return { sessions, truncated };
}

export async function scanCodexSessions(
  dir: string = AVA_CODE_SESSIONS_DIR,
  maxFiles: number = CODEX_SCAN_MAX_FILES,
): Promise<ExternalSessionSummary[]> {
  return (await scanCodexSessionsResult(dir, maxFiles)).sessions;
}

export const codexImporter: SessionImporter = {
  source: "codex",

  async scan(): Promise<ExternalSessionSummary[]> {
    return scanCodexSessions();
  },

  async convert(summary: ExternalSessionSummary): Promise<ImportedSession> {
    const parsed = await parseFile(summary.filePath);
    const messages: ImportedUiMessage[] = [];
    const pendingCalls = new Map<string, { name: string; args: unknown }>();

    for (const { item, timestamp } of parsed?.items ?? []) {
      const createdAt = toIso(timestamp, summary.createdAt);
      if (item.type === "message") {
        const text = itemText(item);
        if (!text || (item.role === "user" && isSyntheticUserText(text))) continue;
        messages.push({
          id: crypto.randomUUID(),
          role: item.role === "user" ? "user" : "assistant",
          content: text,
          createdAt,
          status: item.role === "assistant" ? "complete" : undefined,
        });
      } else if (item.type === "function_call" && item.call_id) {
        let args: unknown = item.arguments;
        try {
          args = JSON.parse(item.arguments ?? "");
        } catch {}
        pendingCalls.set(item.call_id, { name: item.name ?? "tool", args });
      } else if (item.type === "function_call_output" && item.call_id) {
        const pending = pendingCalls.get(item.call_id);
        pendingCalls.delete(item.call_id);
        const output = typeof item.output === "string" ? item.output : JSON.stringify(item.output);
        messages.push({
          id: crypto.randomUUID(),
          role: "tool",
          content: output,
          createdAt,
          toolName: pending?.name,
          toolCallId: item.call_id,
          toolStatus: "success",
          toolArgs: pending?.args,
          toolResult: output,
          status: "complete",
        });
      }
    }

    return {
      session: {
        id: importedSessionId("codex", summary.externalId),
        title: summary.title,
        projectPath: summary.projectPath,
        modelId: summary.model,
        providerId: null,
        mode: "agent",
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
      },
      messages,
    };
  },
};
