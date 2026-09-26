// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

/** Error that keeps the exact details the AvA core sent. */
export class CoreError extends Error {
  constructor(message: string, public code?: number | string, public details?: string) {
    super(message);
    this.name = "CoreError";
  }
}

const text = (v: unknown) => (v == null ? "" : typeof v === "string" ? v : JSON.stringify(v));

/** Turns any core error shape (JSON-RPC error, turn error, error event) into one exact, readable string. */
export function formatCoreError(err: Raw, fallback = "Something went wrong"): string {
  if (!err) return fallback;
  if (typeof err === "string") return friendly(err);
  if (err instanceof Error && !(err instanceof CoreError)) return friendly(err.message || fallback);
  const e = err.error && typeof err.error === "object" ? err.error : err;
  const message = friendly(text(e.message) || fallback);
  const info = e.codexErrorInfo ?? e.errorInfo ?? e.code;
  const extra = [
    info && typeof info === "object" ? Object.keys(info)[0] ?? text(info) : info ? String(info) : "",
    text(e.additionalDetails ?? e.details ?? (e instanceof CoreError ? e.details : e.data)),
  ].filter((s) => s && !message.includes(s));
  return extra.length ? `${message}\n${extra.join(" · ")}` : message;
}

/** Maps low-level transport errors to messages a person can act on. */
function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m === "not connected" || m === "connection closed" || m.includes("could not reach"))
    return "Lost connection to the AvA server. Reconnecting…";
  if (m.endsWith("timed out")) return `${msg} — the server did not answer in time. Please try again.`;
  return msg;
}

/** True for failures that go away once the socket reconnects. */
export function isTransientError(err: Raw): boolean {
  const m = formatCoreError(err, "").toLowerCase();
  return m.includes("lost connection") || m.includes("timed out");
}

export function toCoreError(err: Raw, fallback?: string) {
  return new CoreError(formatCoreError(err, fallback), err?.code);
}
