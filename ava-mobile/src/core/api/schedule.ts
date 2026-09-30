import type { RpcClient } from "../rpc-client";

/**
 * Server-owned scheduled tasks.
 *
 * The app server persists schedules and triggers headless agent runs itself
 * (`schedule/*` RPC). No cron daemon, CLI invocation, or shell command is
 * involved. Threads started by the scheduler carry this thread source, which
 * the session list uses for the clock pill.
 */
export const SCHEDULED_THREAD_SOURCE = "scheduled-task";

export type ScheduleRunStatus = "succeeded" | "failed";

export interface ScheduledTask {
  id: string;
  name: string;
  /** Standard 5-field cron expression. */
  schedule: string;
  enabled: boolean;
  /** Agent instructions run on every trigger. */
  prompt: string;
  /** Working directory the agent runs in. Empty = server default. */
  workspace: string;
  /** Model id. Empty string = server default. */
  model: string;
  /** Sandbox policy id: read-only | workspace-write | danger-full-access. */
  sandbox: string;
  /** Unix seconds. */
  createdAt: number;
  /** Unix seconds. */
  updatedAt: number;
  /** Unix seconds of the last trigger, if any. */
  lastRunAt?: number | null;
  lastStatus?: ScheduleRunStatus | null;
  /** Unix seconds of the next planned trigger, if enabled. */
  nextRunAt?: number | null;
}

export type TaskDraft = Omit<
  ScheduledTask,
  "id" | "createdAt" | "updatedAt" | "lastRunAt" | "lastStatus" | "nextRunAt"
> & { id?: string };

export const SCHEDULE_PRESETS = [
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily at 03:00", value: "0 3 * * *" },
  { label: "Weekly (Mon)", value: "0 3 * * 1" },
];

export const DEFAULT_WORKSPACE = "/root";
export const DEFAULT_SANDBOX = "workspace-write";

interface WireTask {
  id: string;
  name: string;
  cron: string;
  prompt: string;
  cwd?: string | null;
  model?: string | null;
  sandbox?: string | null;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number | null;
  lastStatus?: ScheduleRunStatus | null;
  nextRunAt?: number | null;
}

function fromWire(w: WireTask): ScheduledTask {
  return {
    id: w.id,
    name: w.name,
    schedule: w.cron,
    enabled: w.enabled,
    prompt: w.prompt,
    workspace: w.cwd || "",
    model: w.model || "",
    sandbox: w.sandbox || DEFAULT_SANDBOX,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
    lastRunAt: w.lastRunAt ?? null,
    lastStatus: w.lastStatus ?? null,
    nextRunAt: w.nextRunAt ?? null,
  };
}

function toWire(draft: TaskDraft) {
  return {
    name: draft.name,
    cron: draft.schedule,
    prompt: draft.prompt,
    cwd: draft.workspace?.trim() ? draft.workspace.trim() : null,
    model: draft.model?.trim() ? draft.model.trim() : null,
    sandbox: draft.sandbox || null,
    enabled: draft.enabled,
  };
}

export async function listTasks(rpc: RpcClient): Promise<ScheduledTask[]> {
  const res = await rpc.call<{ data?: WireTask[] }>("schedule/list", {});
  return (res.data ?? []).map(fromWire);
}

export async function saveTask(rpc: RpcClient, draft: TaskDraft): Promise<ScheduledTask> {
  const name = draft.name.replace(/\s+/g, " ").trim();
  if (!name) throw new Error("Task name is required");
  if (draft.schedule.trim().split(/\s+/).length !== 5)
    throw new Error("Schedule needs 5 parts, e.g. */5 * * * *");
  if (!draft.prompt.trim()) throw new Error("Instructions are required");
  if (/[\n\r]/.test(draft.workspace)) throw new Error("Workspace must be a single path");
  const payload = { ...toWire(draft), name };
  if (draft.id) {
    const res = await rpc.call<{ schedule: WireTask }>("schedule/update", {
      id: draft.id,
      ...payload,
    });
    return fromWire(res.schedule);
  }
  const res = await rpc.call<{ schedule: WireTask }>("schedule/create", payload);
  return fromWire(res.schedule);
}

export async function deleteTask(rpc: RpcClient, id: string): Promise<void> {
  await rpc.call("schedule/delete", { id });
}

/** Triggers a run immediately; resolves with the new thread id. */
export async function runTaskNow(rpc: RpcClient, id: string): Promise<{ threadId: string }> {
  return rpc.call<{ threadId: string }>("schedule/run", { id });
}

/** Human-friendly relative description of a unix-seconds timestamp. */
export function formatNextRun(nextRunAt?: number | null): string | null {
  if (!nextRunAt) return null;
  const diffSec = nextRunAt - Math.floor(Date.now() / 1000);
  if (diffSec <= 0) return "due now";
  if (diffSec < 60) return `in ${diffSec}s`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

/** Absolute date-time for a unix-seconds timestamp, local timezone. */
export function formatRunAt(ts?: number | null): string {
  if (!ts) return "never";
  return new Date(ts * 1000).toLocaleString();
}
