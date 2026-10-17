import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plug, RefreshCw, Search, Wrench, X } from "lucide-react";

import { EmptyState, GlassIconButton, PageIntro, SkeletonRows, Surface } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { McpServer } from "@/core/types";
import { useMcpServers, useReloadMcp } from "@/state/queries";

export const Route = createFileRoute("/mcp")({
  head: () => ({
    meta: [
      { title: "MCP Servers & Tools — AvA Code" },
      { name: "description", content: "Search and inspect MCP servers and tools connected to your AvA agent." },
      { property: "og:title", content: "MCP Servers & Tools — AvA Code" },
      { property: "og:description", content: "Search and inspect MCP servers and tools connected to your AvA agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: McpPage,
});

function ServerCard({ server, forceOpen, filterQuery }: { server: McpServer; forceOpen?: boolean; filterQuery?: string }) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;

  const tools = useMemo(() => {
    if (!filterQuery) return server.tools;
    const q = filterQuery.toLowerCase();
    return server.tools.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [server.tools, filterQuery]);

  return (
    <Surface className="p-1.5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent/60">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary"><Plug className="size-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{server.name}</span>
          <span className="block text-xs text-muted-foreground">
            {tools.length === server.tools.length
              ? `${server.tools.length} tools`
              : `${tools.length} of ${server.tools.length} tools matching`}
          </span>
        </span>
        <Badge variant="secondary" className="capitalize">{server.status}</Badge>
        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      {isOpen && (
        <ul className="space-y-1 px-3 pb-2 pt-1">
          {tools.length === 0 ? (
            <li className="py-2 text-center text-xs text-muted-foreground">No matching tools in this server</li>
          ) : (
            tools.map((t) => (
              <li key={t.name} className="flex gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-muted/50">
                <Wrench className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block font-mono text-xs font-semibold">{t.name}</span>
                  {t.description && <span className="line-clamp-2 text-xs text-muted-foreground">{t.description}</span>}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </Surface>
  );
}

function McpPage() {
  const { data, isLoading, error } = useMcpServers();
  const reload = useReloadMcp();
  const [query, setQuery] = useState("");

  const filteredServers = useMemo(() => {
    if (!data) return [];
    if (!query.trim()) return data;
    const q = query.toLowerCase().trim();
    return data.filter((s) => {
      const serverMatch = s.name.toLowerCase().includes(q);
      const toolMatch = s.tools.some(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
      return serverMatch || toolMatch;
    });
  }, [data, query]);

  const totalTools = useMemo(
    () => (data ?? []).reduce((acc, s) => acc + s.tools.length, 0),
    [data]
  );

  return (
    <AppShell
      title="MCP servers & tools"
      actions={
        <GlassIconButton label="Reload servers" onClick={() => reload.mutate()} disabled={reload.isPending}>
          <RefreshCw className={reload.isPending ? "animate-spin" : ""} />
        </GlassIconButton>
      }
    >
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-6">
        <PageIntro
          title="MCP servers & tools"
          description={`Browse and search ${totalTools} tools connected to your AvA agent across ${data?.length ?? 0} servers.`}
        />

        {/* Tool & Server Search Bar */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools or servers (e.g. browser, github, sql, email)..."
            className="h-11 rounded-xl pl-9 pr-9 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear tool search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {isLoading && <SkeletonRows />}
        {error && <EmptyState icon={Plug} title="Could not load servers" description={(error as Error).message} />}
        {!isLoading && data?.length === 0 && <EmptyState icon={Plug} title="No MCP servers configured" />}
        {!isLoading && data && data.length > 0 && filteredServers.length === 0 && (
          <EmptyState icon={Search} title="No tools match your search" description={`No tools or servers matching "${query}" were found.`} />
        )}
        {filteredServers.map((s) => (
          <ServerCard
            key={s.name}
            server={s}
            forceOpen={query.trim().length > 0}
            filterQuery={query.trim()}
          />
        ))}
      </div>
    </AppShell>
  );
}
