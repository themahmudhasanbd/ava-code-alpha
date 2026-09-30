import type { RpcClient } from "../rpc-client";
import type { CommandResult } from "../types";

// Monotonic counter so every command/exec call carries a unique process id.
let processSeq = 0;

/** Runs a shell command on the AvA server and returns its full output. */
export async function runCommand(
  rpc: RpcClient,
  command: string,
  cwd: string,
  opts?: { processId?: string }
): Promise<CommandResult> {
  // Generate a unique process id when the caller doesn't supply one so the
  // command can later be cancelled via command/exec/terminate.
  const processId = opts?.processId ?? `term-${Date.now()}-${(processSeq += 1)}`;
  const res = await rpc.call<{ exitCode?: number; stdout?: string; stderr?: string }>("command/exec", {
    command: ["bash", "-lc", command],
    cwd,
    timeoutMs: 120000,
    processId,
  }, { timeoutMs: 130000 });
  return {
    exitCode: res.exitCode ?? 0,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

/** Ask the server to terminate a running command started via runCommand. */
export async function cancelCommand(rpc: RpcClient, processId: string): Promise<void> {
  await rpc.call("command/exec/terminate", { processId });
}
