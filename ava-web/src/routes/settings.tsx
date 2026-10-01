import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

import { EmptyState, PageIntro, SkeletonRows, Surface } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { APP } from "@/config/app";
import { useAva } from "@/state/ava-provider";
import { useServerConfig } from "@/state/queries";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AvA Code" },
      { name: "description", content: "Review the agent settings used by your AvA Code server." },
      { property: "og:title", content: "Settings — AvA Code" },
      { property: "og:description", content: "Review the agent settings used by your AvA Code server." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium">{value}</span>
    </div>
  );
}

function SettingsPage() {
  const { auth, modelId } = useAva();
  const { data, isLoading, error } = useServerConfig();

  return (
    <AppShell title="Settings">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-5">
        <PageIntro title="Settings" description="Read from your server's configuration." />

        <div>
          <h2 className="mb-2 text-sm font-semibold">Connection</h2>
          <Surface className="divide-y divide-border/50 p-1.5">
            <Row label="Server" value={auth?.serverUrl ?? "—"} />
            <Row label="Signed in as" value={auth?.username ?? "—"} />
            <Row label="App" value={`${APP.name} v${APP.version}`} />
            <Row label="Client" value={APP.clientName} />
          </Surface>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Agent</h2>
          {isLoading && <SkeletonRows count={3} />}
          {error && <EmptyState icon={Settings} title="Could not read settings" description={(error as Error).message} />}
          {data && (
            <Surface className="divide-y divide-border/50 p-1.5">
              <Row label="Selected model" value={modelId || data.model || "—"} />
              <Row label="Provider" value={data.provider ?? "—"} />
              <Row label="Thinking effort" value={data.reasoningEffort ?? "—"} />
              <Row label="Approvals" value={data.approvalPolicy ?? "—"} />
              <Row label="Sandbox" value={data.sandboxMode ?? "—"} />
              <Row label="Context window" value={data.contextWindow ? `${data.contextWindow.toLocaleString()} tokens` : "—"} />
            </Surface>
          )}
        </div>
      </div>
    </AppShell>
  );
}
