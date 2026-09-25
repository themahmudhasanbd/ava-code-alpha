import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plug, RefreshCw, Wrench } from "lucide-react";

import { EmptyState, GlassIconButton, PageIntro, SkeletonRows, Surface } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import type { McpServer } from "@/core/types";
import { useMcpServers, useReloadMcp } from "@/state/queries";

export const Route = createFileRoute("/mcp")({
  head: () => ({
    meta: [
      { title: "MCP Servers — AvA Code" },
      { name: "description", content: "See the MCP servers and tools connected to your AvA agent." },
      { property: "og:title", content: "MCP Servers — AvA Code" },
      { property: "og:description", content: "See the MCP servers and tools connected to your AvA agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: McpPage,
});

function ServerCard({ server }: { server: McpServer }) {
  const [open, setOpen] = useState(false);
  return (
    <Surface className="p-1.5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent/60">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary"><Plug className="size-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{server.name}</span>
          <span className="block text-xs text-muted-foreground">{server.tools.length} tools</span>
        </span>
        <Badge variant="secondary" className="capitalize">{server.status}</Badge>
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      {open && (
        <ul className="space-y-1 px-3 pb-2 pt-1">
          {server.tools.map((t) => (
            <li key={t.name} className="flex gap-2 rounded-lg px-2 py-1.5 text-sm">
              <Wrench className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block font-mono text-xs">{t.name}</span>
                {t.description && <span className="line-clamp-2 text-xs text-muted-foreground">{t.description}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

function McpPage() {
  const { data, isLoading, error } = useMcpServers();
  const reload = useReloadMcp();
  return (
    <AppShell
      title="MCP servers"
      actions={
        <GlassIconButton label="Reload servers" onClick={() => reload.mutate()} disabled={reload.isPending}>
          <RefreshCw className={reload.isPending ? "animate-spin" : ""} />
        </GlassIconButton>
      }
    >
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 overflow-y-auto px-4 py-6">
        <PageIntro title="MCP servers" description="Tools your agent can use on the server." />
        {isLoading && <SkeletonRows />}
        {error && <EmptyState icon={Plug} title="Could not load servers" description={(error as Error).message} />}
        {data?.length === 0 && <EmptyState icon={Plug} title="No MCP servers configured" />}
        {data?.map((s) => <ServerCard key={s.name} server={s} />)}
      </div>
    </AppShell>
  );
}
