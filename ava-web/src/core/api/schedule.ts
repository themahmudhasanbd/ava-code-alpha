import type { RpcClient } from "../rpc-client";
import { runCommand } from "./terminal";

/** Tasks live in their own system cron file, so AvA never edits other cron jobs. */
const FILE = "/etc/cron.d/ava-tasks";
const RUN_AS = "root";
const TAG = "# ava-task:";

export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
}

export const SCHEDULE_PRESETS = [
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily at 03:00", value: "0 3 * * *" },
  { label: "Weekly (Mon)", value: "0 3 * * 1" },
];

function parse(line: string): ScheduledTask | null {
  const idx = line.indexOf(TAG);
  if (idx < 0) return null;
  const [id, ...nameParts] = line.slice(idx + TAG.length).trim().split(" ");
  let body = line.slice(0, idx).trim();
  const enabled = !body.startsWith("#");
  if (!enabled) body = body.replace(/^#\s*/, "");
  const parts = body.split(/\s+/);
  return { id: id ?? "", name: nameParts.join(" ") || id || "Task", schedule: parts.slice(0, 5).join(" "), command: parts.slice(6).join(" "), enabled };
}

async function readCrontab(rpc: RpcClient) {
  const res = await runCommand(rpc, `cat ${FILE} 2>/dev/null || true`, "/");
  return res.stdout.split("\n");
}

async function writeCrontab(rpc: RpcClient, lines: string[]) {
  const content = lines.filter((l, i, a) => l.trim() || i < a.length - 1).join("\n") + "\n";
  const b64 = btoa(unescape(encodeURIComponent(content)));
  const res = await runCommand(rpc, `echo '${b64}' | base64 -d > ${FILE} && chmod 644 ${FILE}`, "/");
  if (res.exitCode !== 0) throw new Error(res.stderr || "Could not save schedule");
}

const line = (t: ScheduledTask) => `${t.enabled ? "" : "# "}${t.schedule} ${RUN_AS} ${t.command} ${TAG}${t.id} ${t.name}`;

export async function listTasks(rpc: RpcClient): Promise<ScheduledTask[]> {
  return (await readCrontab(rpc)).map(parse).filter((t): t is ScheduledTask => !!t);
}

export async function saveTask(rpc: RpcClient, task: Omit<ScheduledTask, "id"> & { id?: string }) {
  if (task.schedule.trim().split(/\s+/).length !== 5) throw new Error("Schedule needs 5 parts, e.g. */5 * * * *");
  if (/[\n\r]/.test(task.command) || !task.command.trim()) throw new Error("Command must be a single line");
  const full: ScheduledTask = { ...task, id: task.id || Date.now().toString(36), name: task.name.replace(/\s+/g, " ").trim() };
  const lines = await readCrontab(rpc);
  const i = lines.findIndex((l) => parse(l)?.id === full.id);
  if (i >= 0) lines[i] = line(full);
  else lines.push(line(full));
  await writeCrontab(rpc, lines);
}

export async function deleteTask(rpc: RpcClient, id: string) {
  await writeCrontab(rpc, (await readCrontab(rpc)).filter((l) => parse(l)?.id !== id));
}

export async function runTaskNow(rpc: RpcClient, task: ScheduledTask) {
  return runCommand(rpc, task.command, "/");
}
