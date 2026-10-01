type Host = { call<T>(method: string, params?: Record<string, unknown>): Promise<T> };

/** Minimal wire shape for due-discovery; full shapes live in ../ipc/scheduled-ipc.ts. */
type DueSchedule = { id: string; enabled: boolean; nextRunAt?: number | null };

/**
 * Triggers a schedule run immediately via ava-core (`schedule/run`).
 * ava-core runs the schedule's prompt as a headless turn itself and returns
 * the new thread id — there is no local prompt step and no run bookkeeping
 * (ava-core has no `scheduled.finishRun` equivalent).
 */
export async function executeScheduledTask(options: {
  host: Host;
  isCurrent: () => boolean;
  id: string;
}): Promise<{ threadId: string }> {
  const { host, id, isCurrent } = options;
  if (!isCurrent()) throw new Error("scheduled runtime stopped");
  return host.call<{ threadId: string }>("schedule/run", { id });
}

export function createScheduledRunner(options: {
  getHost: () => Host | null;
  execute: (id: string) => Promise<unknown>;
  report: (error: unknown) => void;
}) {
  let stopped = false;
  let polling = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const dispatches = new Map<string, { host: Host }>();
  const tick = async () => {
    if (stopped || polling) return;
    const host = options.getHost();
    if (!host) return;
    polling = true;
    try {
      // ava-core has no `scheduled.due`: discover due schedules from
      // `schedule/list`, mirroring the server's own due filter
      // (enabled && nextRunAt <= now). The server also auto-triggers due
      // schedules; its in-flight guard rejects a duplicate trigger.
      const nowSec = Math.floor(Date.now() / 1000);
      const { data } = await host.call<{ data?: DueSchedule[] }>("schedule/list", {
        limit: 100,
      });
      const ids = (data ?? [])
        .filter((task) => task.enabled && task.nextRunAt != null && task.nextRunAt <= nowSec)
        .map((task) => task.id);
      for (const id of ids) {
        if (stopped || options.getHost() !== host) break;
        if (dispatches.get(id)?.host === host) continue;
        const owner = { host };
        dispatches.set(id, owner);
        // Polling owns admission requests, not the duration of the run setup.
        // Host remains authoritative for enabled/due/overlap checks. Keep a
        // local owner until setup settles so another poll cannot dispatch the
        // same task while its admission request is still in flight.
        void (async () => {
          try {
            await options.execute(id);
          } catch (error) {
            options.report(error);
          } finally {
            if (dispatches.get(id) === owner) dispatches.delete(id);
          }
        })();
      }
    } catch (error) {
      options.report(error);
    } finally {
      polling = false;
    }
  };
  return {
    tick,
    start() {
      if (timer || stopped) return;
      timer = setInterval(() => void tick(), 30_000);
      timer.unref();
      void tick();
    },
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = undefined;
    },
  };
}
