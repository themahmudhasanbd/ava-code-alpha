import type { RpcClient } from "../rpc-client";
import type { CommandResult } from "../types";

/** Runs a shell command on the AvA server and returns its full output. */
export async function runCommand(rpc: RpcClient, command: string, cwd: string): Promise<CommandResult> {
  const res = await rpc.call<{ exitCode?: number; stdout?: string; stderr?: string }>("command/exec", {
    command: ["bash", "-lc", command],
    cwd,
    timeoutMs: 60000,
  });
  return {
    exitCode: res.exitCode ?? 0,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}
