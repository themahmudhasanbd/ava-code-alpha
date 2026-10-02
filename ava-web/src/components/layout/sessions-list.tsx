import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, ChevronRight, Folder, MessageSquare, MoreHorizontal, Pencil, Pin, PinOff, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { EmptyState, SkeletonRows } from "@/components/kit";
import type { Session } from "@/core/types";
import { storage } from "@/core/storage";
import { useAva } from "@/state/ava-provider";
import { useDeleteSession, useRenameSession, useSessions } from "@/state/queries";
import { cn } from "@/lib/utils";

const PIN_KEY = "ava.workspace.pins";
const NAME_KEY = "ava.workspace.names";

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = storage.get(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function groupByProject(sessions: Session[]) {
  const map = new Map<string, Session[]>();
  for (const session of sessions) {
    const key = session.directory || "/";
    map.set(key, [...(map.get(key) ?? []), session]);
  }
  return [...map.entries()];
}

const projectName = (dir: string) => dir.split("/").filter(Boolean).pop() ?? "Root";

export function SessionsList({ onPick }: { onPick: () => void }) {
  const { activeSessionId, setActiveSessionId, workingSessionId, status } = useAva();
  const { data, isLoading, error } = useSessions();
  const del = useDeleteSession();
  const rename = useRenameSession();
  const navigate = useNavigate();
  const [pins, setPins] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [sessionDraft, setSessionDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setPins(readJson<string[]>(PIN_KEY, []));
    setNames(readJson<Record<string, string>>(NAME_KEY, {}));
  }, []);

  const activeDirectory = data?.find((session) => session.id === (workingSessionId ?? activeSessionId))?.directory;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((session) => session.title.toLowerCase().includes(q));
  }, [data, query]);
  const groups = useMemo(() => {
    const grouped = groupByProject(visible);
    return grouped.sort(([a], [b]) => {
      if (a === activeDirectory) return -1;
      if (b === activeDirectory) return 1;
      const ai = pins.indexOf(a);
      const bi = pins.indexOf(b);
      if (ai >= 0 || bi >= 0) return ai < 0 ? 1 : bi < 0 ? -1 : ai - bi;
      return projectName(a).localeCompare(projectName(b));
    });
  }, [visible, pins, activeDirectory]);

  useEffect(() => {
    if (activeDirectory) setExpanded((items) => (items.includes(activeDirectory) ? items : [...items, activeDirectory]));
  }, [activeDirectory]);

  const pick = async (id: string | null) => {
    setActiveSessionId(id);
    onPick();
    await navigate({ to: "/" });
  };

  const togglePin = (dir: string) => {
    setPins((current) => {
      const next = current.includes(dir) ? current.filter((item) => item !== dir) : [dir, ...current];
      storage.set(PIN_KEY, JSON.stringify(next));
      return next;
    });
  };

  const saveName = (dir: string) => {
    const value = draftName.trim();
    setNames((current) => {
      const next = { ...current };
      if (value) next[dir] = value;
      else delete next[dir];
      storage.set(NAME_KEY, JSON.stringify(next));
      return next;
    });
    setEditing(null);
  };

  const saveSessionName = (id: string) => {
    const value = sessionDraft.trim();
    if (value) rename.mutate({ id, name: value });
    setEditingSession(null);
  };

  const confirmDelete = (id: string) => {
    if (activeSessionId === id) setActiveSessionId(null);
    del.mutate(id);
    setConfirmDeleteId(null);
  };

  const deleteTarget = data?.find((session) => session.id === confirmDeleteId);

  return (
    <div>
      <Button variant="ghost" className="glass mb-4 h-10 w-full justify-start gap-2 rounded-xl" onClick={() => void pick(null)}>
        <Plus /> New session
      </Button>

      {data && data.length > 0 && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }}
            placeholder="Search sessions"
            aria-label="Search sessions"
            className="h-10 rounded-xl pl-9 pr-9"
          />
          {query !== "" && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2"
            >
              <X />
            </Button>
          )}
        </div>
      )}

      {status !== "online" && <p className="px-2 text-sm text-muted-foreground">Waiting for server connection…</p>}
      {isLoading && <SkeletonRows />}
      {error && <p className="px-2 text-sm text-destructive">Could not load sessions.</p>}
      {data && data.length === 0 && status === "online" && (
        <EmptyState
          icon={MessageSquare}
          title="No sessions yet"
          description="Start your first session to chat with AvA."
          action={
            <Button size="sm" onClick={() => void pick(null)}>
              <Plus /> New session
            </Button>
          }
        />
      )}

      {data && data.length > 0 && visible.length === 0 && query.trim() !== "" && (
        <p className="px-2 text-sm text-muted-foreground">No sessions match &ldquo;{query.trim()}&rdquo;.</p>
      )}

      <div className="space-y-2">
        {groups.map(([dir, sessions]) => {
          const isActiveWorkspace = dir === activeDirectory;
          const searching = query.trim() !== "";
          const isOpen = searching || isActiveWorkspace || expanded.includes(dir);
          const pinned = pins.includes(dir);
          return (
            <section key={dir} className={cn("rounded-xl", isActiveWorkspace && "bg-sidebar-accent/55")}> 
              <div className="flex min-w-0 items-center px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={isOpen}
                  onClick={() => setExpanded((items) => (isOpen ? items.filter((item) => item !== dir) : [...items, dir]))}
                  className="h-10 min-w-0 flex-1 justify-start gap-2 px-2 text-muted-foreground"
                >
                  {isOpen ? <ChevronDown /> : <ChevronRight />}
                  <Folder className={cn(isActiveWorkspace && "text-primary")} />
                  {editing === dir ? (
                    <Input
                      autoFocus
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") saveName(dir);
                        if (event.key === "Escape") setEditing(null);
                      }}
                      className="h-7 min-w-0 flex-1 px-2 text-sm"
                    />
                  ) : (
                    <span className="truncate">{names[dir] || projectName(dir)}</span>
                  )}
                  {workingSessionId && sessions.some((session) => session.id === workingSessionId) ? (
                    <span className="ml-auto size-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-label="Agent working" />
                  ) : (
                    <span className="ml-auto text-xs">{sessions.length}</span>
                  )}
                </Button>
                {editing === dir ? (
                  <div className="flex">
                    <Button variant="ghost" size="icon-sm" aria-label="Save workspace name" onClick={() => saveName(dir)}><Check /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Cancel rename" onClick={() => setEditing(null)}><X /></Button>
                  </div>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${names[dir] || projectName(dir)}`}><MoreHorizontal /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onSelect={() => togglePin(dir)}>{pinned ? <PinOff /> : <Pin />}{pinned ? "Unpin workspace" : "Pin workspace"}</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { setEditing(dir); setDraftName(names[dir] || projectName(dir)); }}><Pencil />Rename display name</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {isOpen && (
                <div className="ml-5 mr-1 space-y-0.5 border-l border-sidebar-border pl-3 pb-2">
                  {sessions.map((session) => (
                    <div key={session.id} className="group flex items-center">
                      {editingSession === session.id ? (
                        <>
                          <Input
                            autoFocus
                            value={sessionDraft}
                            onChange={(event) => setSessionDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") saveSessionName(session.id);
                              if (event.key === "Escape") setEditingSession(null);
                            }}
                            className="h-7 min-w-0 flex-1 px-2 text-sm"
                            aria-label="Session title"
                          />
                          <Button variant="ghost" size="icon-sm" aria-label="Save session title" onClick={() => saveSessionName(session.id)}><Check /></Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Cancel rename" onClick={() => setEditingSession(null)}><X /></Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            onClick={() => void pick(session.id)}
                            className={cn(
                              "h-auto min-h-9 min-w-0 flex-1 justify-start truncate rounded-lg px-2 py-2 text-left text-sm font-normal",
                              activeSessionId === session.id ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground",
                            )}
                          >
                            <span className="truncate">{session.title}</span>
                            {workingSessionId === session.id && <span className="ml-auto size-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Rename session"
                            className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                            onClick={() => { setEditingSession(session.id); setSessionDraft(session.title); }}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete session"
                            className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                            onClick={() => setConfirmDeleteId(session.id)}
                          >
                            <Trash2 />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `"${deleteTarget.title}"` : "This session"} will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmDeleteId) confirmDelete(confirmDeleteId); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}