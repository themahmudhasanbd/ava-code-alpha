export function formatDuration(ms?: number): string {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60} sec`;
  return `${Math.floor(m / 60)} hr ${m % 60} min`;
}

export function formatTokens(n?: number): string {
  return n == null ? "" : n >= 1000 ? `${(n / 1000).toFixed(1)}k tokens` : `${n} tokens`;
}
