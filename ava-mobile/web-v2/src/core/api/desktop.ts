import type { RpcClient } from "../rpc-client";
import { runCommand } from "./terminal";

export interface DesktopStatus {
  display: string | null;
  vncRunning: boolean;
  canScreenshot: boolean;
  width: number;
  height: number;
}

/** Looks for a running X display / VNC server and a screenshot tool on the server. */
export async function readDesktopStatus(rpc: RpcClient): Promise<DesktopStatus> {
  const res = await runCommand(
    rpc,
    `D=$(ls /tmp/.X11-unix 2>/dev/null | head -1 | sed 's/X/:/'); echo "D=$D"; pgrep -f 'vnc|x11vnc' >/dev/null && echo VNC=1 || echo VNC=0; command -v ffmpeg >/dev/null && echo SHOT=1 || echo SHOT=0; echo SIZE=$(DISPLAY=$D xdotool getdisplaygeometry 2>/dev/null)`,
    "/",
  );
  const get = (k: string) => res.stdout.match(new RegExp(`${k}=(.*)`))?.[1]?.trim() ?? "";
  const [w, h] = get("SIZE").split(" ").map(Number);
  return { width: w || 1920, height: h || 1080, display: get("D") || null, vncRunning: get("VNC") === "1", canScreenshot: get("SHOT") === "1" };
}

/** Captures the current screen as a PNG data URL. */
export async function captureScreen(rpc: RpcClient, display: string, width: number, height: number): Promise<string> {
  const res = await runCommand(
    rpc,
    `F=/tmp/ava-shot.jpg; ffmpeg -loglevel error -y -f x11grab -video_size ${width}x${height} -i ${display} -frames:v 1 -vf scale=1280:-1 -q:v 5 $F && base64 -w0 $F`,
    "/",
  );
  if (res.exitCode !== 0 || !res.stdout) throw new Error(res.stderr || "Screenshot failed");
  return `data:image/jpeg;base64,${res.stdout.trim()}`;
}

/** Sends a click or key press using xdotool. */
export async function sendDesktopInput(rpc: RpcClient, display: string, input: { x: number; y: number } | { key: string } | { text: string }) {
  const esc = (s: string) => s.replace(/'/g, "'\\''");
  const cmd = "key" in input
    ? `xdotool key '${esc(input.key)}'`
    : "text" in input
      ? `xdotool type -- '${esc(input.text)}'`
      : `xdotool mousemove ${Math.round(input.x)} ${Math.round(input.y)} click 1`;
  const res = await runCommand(rpc, `export DISPLAY=${display}; ${cmd}`, "/");
  if (res.exitCode !== 0) throw new Error(res.stderr || "Input failed (is xdotool installed?)");
}
