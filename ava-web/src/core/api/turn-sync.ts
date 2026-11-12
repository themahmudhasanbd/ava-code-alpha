/** Poll snapshots independently of chat renders; never replay a user prompt. */
export function historyPollInterval(running: boolean): number {
  return running ? 2000 : 5000;
}

/** Cached/failed reads cannot terminate a newer local turn. */
export function canFinishFromSnapshot(
  snapshot:
    | {
        isTurnRunning: boolean;
        latestTurnId?: string | undefined;
        latestTurnStatus?: string | undefined;
      }
    | undefined,
  activeTurnId: string | null,
  updatedAt: number,
  startedAt: number
): boolean {
  if (!snapshot || snapshot.isTurnRunning || !activeTurnId || updatedAt <= startedAt) return false;
  return (
    snapshot.latestTurnId === activeTurnId &&
    ["completed", "failed", "interrupted", "done"].includes(snapshot.latestTurnStatus ?? "")
  );
}

/** Retain streamed fields when an older snapshot contains the same item. */
export function mergeLiveParts<
  T extends {
    id: string;
    text: string;
    output?: string | undefined;
    status?: string | undefined;
  }
>(server: T[], local: T[]): T[] {
  const byId = new Map(local.map((part) => [part.id, part]));
  const merged: T[] = server.map((part): T => {
    const live = byId.get(part.id);
    if (!live) return part;
    byId.delete(part.id);
    if (part.status !== "running" && live.status === "running") return part;
    const output = (part.output?.length ?? 0) > (live.output?.length ?? 0) ? part.output : live.output;
    return {
      ...part,
      ...live,
      text: part.text.length > live.text.length ? part.text : live.text,
      ...(output !== undefined ? { output } : {}),
    };
  });
  return [...merged, ...Array.from(byId.values())];
}
