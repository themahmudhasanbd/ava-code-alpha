import { IPC } from "@pi-desktop/shared";
import type { HostProcess } from "../host-process";
import type { IpcRegistrar } from "./types";
import { executeScheduledTask } from "../runtime/scheduled-runner";
import type { ScheduledTask } from "@pi-desktop/shared";

export type ScheduledIpcDependencies = {
  registrar: IpcRegistrar;
  getHost: () => HostProcess | null;
  scheduledRunsBySession: Map<string, string>;
  invoke: (channel: string, args: readonly unknown[]) => Promise<unknown>;
  isQuitting: () => boolean;
};

/**
 * ava-core wire shapes (camelCase), mirroring ava-mobile/src/core/api/schedule.ts.
 * Field names must match the `schedule/*` protocol exactly
 * (ava-rs/app-server-protocol/src/protocol/v2/schedule.rs).
 */
type WireSchedule = {
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
  lastStatus?: "succeeded" | "failed" | null;
  nextRunAt?: number | null;
};

/**
 * A cron that never matches a real date (Feb 31). Used to represent the
 * desktop's "manual" cadence, which ava-core has no native concept for:
 * the task stays enabled and runnable on demand, but never auto-fires
 * (nextRunAt resolves to null server-side).
 */
const MANUAL_CRON = "0 0 31 2 *";

const isoFromUnix = (value?: number | null): string | undefined =>
  value == null ? undefined : new Date(value * 1000).toISOString();

/** cron day-of-week (Sun=0..Sat=6) -> desktop weekday (Mon=0..Sun=6). */
const cronDowToWeekday = (dow: number): number => (dow + 6) % 7;
/** desktop weekday (Mon=0..Sun=6) -> cron day-of-week (Sun=0..Sat=6). */
const weekdayToCronDow = (weekday: number): number => (weekday + 1) % 7;

function cronToCadenceSchedule(cron: string): {
  cadence: ScheduledTask["cadence"];
  schedule: ScheduledTask["schedule"];
} {
  if (cron === MANUAL_CRON) return { cadence: "manual", schedule: null };
  const parts = cron.trim().split(/\s+/);
  if (parts.length === 5) {
    const [minute, hour, dayOfMonth, , dayOfWeek] = parts;
    const m = Number(minute);
    const h = Number(hour);
    const validTime =
      Number.isInteger(m) && Number.isInteger(h) && m >= 0 && m < 60 && h >= 0 && h < 24;
    if (validTime) {
      if (dayOfWeek === "*") {
        if (minute === "0" && dayOfMonth === "*")
          return { cadence: "hourly", schedule: { hour: 0, minute: 0, weekday: 0 } };
        if (dayOfMonth === "*")
          return { cadence: "daily", schedule: { hour: h, minute: m, weekday: 0 } };
      } else {
        const dows = dayOfWeek
          .split(",")
          .map(Number)
          .filter((n) => Number.isInteger(n) && n >= 0 && n <= 7)
          .map((n) => (n === 7 ? 0 : n));
        if (dows.length > 0) {
          const weekdays = [...new Set(dows.map(cronDowToWeekday))].sort((a, b) => a - b);
          return {
            cadence: "weekly",
            schedule: { hour: h, minute: m, weekday: weekdays[0], weekdays },
          };
        }
      }
    }
  }
  // Cron the desktop editor cannot represent: surface as manual. The server
  // still reports nextRunAt, so the row shows the real next run.
  return { cadence: "manual", schedule: null };
}

function fromWire(wire: WireSchedule): ScheduledTask {
  const { cadence, schedule } = cronToCadenceSchedule(wire.cron);
  return {
    id: wire.id,
    title: wire.name,
    prompt: wire.prompt,
    cadence,
    // ava-core has no task mode; the desktop type requires one.
    mode: "agent",
    enabled: wire.enabled,
    createdAt: isoFromUnix(wire.createdAt) ?? new Date().toISOString(),
    updatedAt: isoFromUnix(wire.updatedAt) ?? new Date().toISOString(),
    lastRunAt: isoFromUnix(wire.lastRunAt),
    schedule,
    nextRunAt: isoFromUnix(wire.nextRunAt),
    workspacePath: wire.cwd ?? undefined,
  };
}

function cadenceToCron(
  cadence: ScheduledTask["cadence"] | undefined,
  schedule: ScheduledTask["schedule"],
): string {
  const hour = schedule?.hour ?? 9;
  const minute = schedule?.minute ?? 0;
  switch (cadence) {
    case "hourly":
      return "0 * * * *";
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekly": {
      const weekdays = schedule?.weekdays?.length ? schedule.weekdays : [schedule?.weekday ?? 0];
      const dows = [...new Set(weekdays.map(weekdayToCronDow))].sort((a, b) => a - b);
      return `${minute} ${hour} * * ${dows.join(",")}`;
    }
    case "manual":
    default:
      return MANUAL_CRON;
  }
}

type DesktopScheduleInput = {
  title?: string;
  prompt?: string;
  cadence?: ScheduledTask["cadence"];
  enabled?: boolean;
  schedule?: ScheduledTask["schedule"];
  workspacePath?: string;
};

function toCreateWire(input: DesktopScheduleInput): Record<string, unknown> {
  const name = String(input.title ?? "").trim();
  if (!name) throw new Error("task name required");
  const prompt = String(input.prompt ?? "").trim();
  if (!prompt) throw new Error("prompt required");
  return {
    name,
    cron: cadenceToCron(input.cadence, input.schedule),
    prompt,
    cwd: input.workspacePath?.trim() ? input.workspacePath.trim() : null,
    model: null,
    sandbox: null,
    enabled: input.enabled ?? true,
  };
}

function toUpdateWire(input: DesktopScheduleInput & { id: string }): Record<string, unknown> {
  const wire: Record<string, unknown> = { id: input.id };
  if (input.title !== undefined) {
    const name = input.title.trim();
    if (!name) throw new Error("task name required");
    wire.name = name;
  }
  if (input.prompt !== undefined) {
    const prompt = input.prompt.trim();
    if (!prompt) throw new Error("prompt required");
    wire.prompt = prompt;
  }
  if (input.cadence !== undefined) wire.cron = cadenceToCron(input.cadence, input.schedule);
  if (input.workspacePath !== undefined)
    wire.cwd = input.workspacePath?.trim() ? input.workspacePath.trim() : null;
  if (input.enabled !== undefined) wire.enabled = input.enabled;
  return wire;
}

export function registerScheduledIpc({
  registrar,
  getHost,
  isQuitting,
}: ScheduledIpcDependencies): void {
  registrar.handle(IPC.invoke.scheduledExecute, async (id: string, automatic = false) => {
    if (typeof id !== "string" || typeof automatic !== "boolean")
      throw new Error("invalid task request");
    const host = getHost();
    if (!host) throw new Error("host unavailable");
    return executeScheduledTask({
      host,
      id,
      isCurrent: () => !isQuitting() && getHost() === host,
    });
  });
  const handle = (channel: string, fn: (...args: any[]) => Promise<any>) => {
    registrar.handle(channel, async (...args) => fn(getHost(), ...args));
  };

  handle(IPC.invoke.scheduledList, async (host: HostProcess | null) => {
    if (!host) throw new Error("host unavailable");
    const result = await host.call<{ data?: WireSchedule[] }>("schedule/list", {});
    return { tasks: (result.data ?? []).map(fromWire) };
  });
  handle(IPC.invoke.scheduledCreate, async (host: HostProcess | null, input: any = {}) => {
    if (!host) throw new Error("host unavailable");
    const result = await host.call<{ schedule: WireSchedule }>(
      "schedule/create",
      toCreateWire(input),
    );
    return { task: fromWire(result.schedule) };
  });
  handle(IPC.invoke.scheduledUpdate, async (host: HostProcess | null, input: any = {}) => {
    if (!host) throw new Error("host unavailable");
    if (typeof input?.id !== "string" || !input.id) throw new Error("id required");
    const result = await host.call<{ schedule: WireSchedule }>(
      "schedule/update",
      toUpdateWire(input),
    );
    return { task: fromWire(result.schedule) };
  });
  handle(IPC.invoke.scheduledDelete, async (host: HostProcess | null, id: string) => {
    if (!host) throw new Error("host unavailable");
    if (typeof id !== "string" || !id) throw new Error("id required");
    return host.call("schedule/delete", { id });
  });
  handle(IPC.invoke.scheduledRun, async (host: HostProcess | null, id: string) => {
    if (!host) throw new Error("host unavailable");
    if (typeof id !== "string" || !id) throw new Error("id required");
    return host.call<{ threadId: string }>("schedule/run", { id });
  });
}
