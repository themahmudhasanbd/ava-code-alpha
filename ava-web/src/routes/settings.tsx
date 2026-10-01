import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings } from "lucide-react";

import { EmptyState, PageIntro, SkeletonRows, StatusDot, Surface } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP } from "@/config/app";
import { cleanUrl, decodeCredentials, verifyLogin } from "@/core/auth";
import type { ConnectionStatus } from "@/core/types";
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

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  online: "Online",
  connecting: "Connecting…",
  offline: "Offline",
};

function ConnectionSection() {
  const { auth, status, signIn } = useAva();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const beginEdit = () => {
    setUrl(auth?.serverUrl ?? "");
    setError(null);
    setEditing(true);
  };

  const commit = async () => {
    if (!auth || busy) return;
    const next = cleanUrl(url);
    if (next === cleanUrl(auth.serverUrl)) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // The stored token is Basic auth ("user:password" base64) — decode it in memory
      // so Boss can repoint the client at another server without retyping credentials.
      const { password } = decodeCredentials(auth.token);
      const nextAuth = await verifyLogin(next, auth.username, password);
      signIn(nextAuth);
      await qc.invalidateQueries();
      setEditing(false);
    } catch (e) {
      setError(
        (e as Error).message === "Failed to fetch"
          ? "Could not reach the server"
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Connection</h2>
        {!editing && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={beginEdit}>
            Change server
          </Button>
        )}
      </div>
      <Surface className="divide-y divide-border/50 p-1.5">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Status</span>
          <span className="flex items-center gap-1.5 font-medium">
            <StatusDot status={status} />
            {STATUS_LABEL[status]}
          </span>
        </div>
        {editing ? (
          <form
            className="space-y-2.5 px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              void commit();
            }}
          >
            <Label htmlFor="server-url">Server URL</Label>
            <Input
              id="server-url"
              inputMode="url"
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={APP.defaultServerUrl}
              className="rounded-xl"
              disabled={busy}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy || !url.trim()}>
                {busy && <Loader2 className="animate-spin" />}
                Connect
              </Button>
            </div>
          </form>
        ) : (
          <Row label="Server" value={auth?.serverUrl ?? "—"} />
        )}
        <Row label="Signed in as" value={auth?.username ?? "—"} />
        <Row label="App" value={`${APP.name} v${APP.version}`} />
        <Row label="Client" value={APP.clientName} />
      </Surface>
    </div>
  );
}

function SettingsPage() {
  const { modelId } = useAva();
  const { data, isLoading, error } = useServerConfig();

  return (
    <AppShell title="Settings">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-5">
        <PageIntro title="Settings" description="Read from your server's configuration." />

        <ConnectionSection />

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
