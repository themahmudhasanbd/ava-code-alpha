import { createFileRoute } from "@tanstack/react-router";
import { Activity, RefreshCw } from "lucide-react";

import { EmptyState, GlassIconButton, PageIntro, SkeletonRows, StatusDot, Surface } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useDiagnostics, useServerConfig } from "@/state/queries";

export const Route = createFileRoute("/system")({
  head: () => ({
    meta: [
      { title: "System health — AvA Code" },
      { name: "description", content: "Live health, memory and activity of your AvA Code server." },
      { property: "og:title", content: "System health — AvA Code" },
      { property: "og:description", content: "Live health, memory and activity of your AvA Code server." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SystemPage,
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </Surface>
  );
}

const GAUGE_LABELS: Record<string, string> = {
  "app.requests.in_flight": "Requests in flight",
  "app.requests.queued": "Queued requests",
  "core.threads.live": "Live sessions",
  "core.turns.active": "Active replies",
  "mcp.connections.live": "MCP connections",
};

function SystemPage() {
  const { status, auth } = useAva();
  const diag = useDiagnostics();
  const config = useServerConfig();

  const memory = diag.data?.memoryBytes ? `${(diag.data.memoryBytes / 1024 / 1024).toFixed(0)} MB` : "—";

  return (
    <AppShell
      title="System health"
      actions={
        <GlassIconButton label="Refresh health" onClick={() => void diag.refetch()} disabled={diag.isFetching}>
          <RefreshCw className={diag.isFetching ? "animate-spin" : ""} />
        </GlassIconButton>
      }
    >
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-5">
        <PageIntro title="System health" description="Updates every few seconds." />

        <Surface className="flex items-center gap-2.5 px-3 py-3">
          <StatusDot status={status} />
          <span className="text-sm font-medium capitalize">{status}</span>
          <span className="ml-auto truncate text-xs text-muted-foreground">{auth?.serverUrl}</span>
        </Surface>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="App version" value={`v${APP.version}`} />
          <Stat label="Server memory" value={memory} />
          <Stat label="Process" value={diag.data?.processId ? String(diag.data.processId) : "—"} />
          <Stat label="Model" value={config.data?.model ?? "—"} />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Activity</h2>
          {diag.isLoading && <SkeletonRows count={3} />}
          {diag.error && <EmptyState icon={Activity} title="Could not read health" description={(diag.error as Error).message} />}
          {!!diag.data?.gauges.length && (
            <Surface className="divide-y divide-border/50 p-1.5">
              {diag.data.gauges.map((g) => (
                <div key={g.name} className="flex items-center justify-between px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">{GAUGE_LABELS[g.name] ?? g.name}</span>
                  <span className="font-semibold">{g.value}</span>
                </div>
              ))}
            </Surface>
          )}
        </div>
      </div>
    </AppShell>
  );
}
