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
  if (typeof err === "string") return err;
  if (err instanceof Error && !(err instanceof CoreError)) return err.message || fallback;
  const e = err.error && typeof err.error === "object" ? err.error : err;
  const message = text(e.message) || fallback;
  const info = e.codexErrorInfo ?? e.errorInfo ?? e.code;
  const extra = [
    info && typeof info === "object" ? Object.keys(info)[0] ?? text(info) : info ? String(info) : "",
    text(e.additionalDetails ?? e.details ?? (e instanceof CoreError ? e.details : e.data)),
  ].filter((s) => s && !message.includes(s));
  return extra.length ? `${message}\n${extra.join(" · ")}` : message;
}

export function toCoreError(err: Raw, fallback?: string) {
  return new CoreError(formatCoreError(err, fallback), err?.code);
}
