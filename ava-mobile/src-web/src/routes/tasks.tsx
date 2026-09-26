import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, GlassIconButton, PageIntro, SkeletonRows, Surface } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SCHEDULE_PRESETS, type ScheduledTask } from "@/core/api/schedule";
import { useDeleteTask, useRunTask, useSaveTask, useTasks } from "@/state/queries";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Scheduled tasks — AvA Code" },
      { name: "description", content: "Run commands on your server on a schedule." },
      { property: "og:title", content: "Scheduled tasks — AvA Code" },
      { property: "og:description", content: "Run commands on your server on a schedule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TasksPage,
});

type Draft = Omit<ScheduledTask, "id"> & { id?: string };
const EMPTY: Draft = { name: "", schedule: SCHEDULE_PRESETS[1]!.value, command: "", enabled: true };

function TaskForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const save = useSaveTask();
  const submit = async () => {
    try {
      await save.mutateAsync(d);
      toast.success("Task saved");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Surface className="space-y-3 p-4">
      <Input placeholder="Task name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
      <Input placeholder="Command, e.g. cd /var/www && git pull" className="font-mono text-xs" value={d.command} onChange={(e) => setD({ ...d, command: e.target.value })} />
      <Input placeholder="Cron schedule" className="font-mono text-xs" value={d.schedule} onChange={(e) => setD({ ...d, schedule: e.target.value })} />
      <div className="flex flex-wrap gap-2">
        {SCHEDULE_PRESETS.map((p) => (
          <Button key={p.value} size="sm" variant={d.schedule === p.value ? "default" : "ghost"} className="glass rounded-full" onClick={() => setD({ ...d, schedule: p.value })}>
            {p.label}
          </Button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </div>
    </Surface>
  );
}

function TaskRow({ task, onEdit }: { task: ScheduledTask; onEdit: () => void }) {
  const save = useSaveTask();
  const del = useDeleteTask();
  const run = useRunTask();
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
        <CalendarClock className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{task.name}</span>
        <span className="block truncate font-mono text-xs text-muted-foreground">{task.schedule} · {task.command}</span>
      </span>
      <Switch checked={task.enabled} onCheckedChange={(enabled) => save.mutate({ ...task, enabled })} aria-label="Enabled" />
      <GlassIconButton
        label="Run now"
        disabled={run.isPending}
        onClick={async () => {
          const r = await run.mutateAsync(task).catch((e: Error) => ({ exitCode: 1, stderr: e.message, stdout: "" }));
          r.exitCode === 0 ? toast.success("Ran successfully") : toast.error(r.stderr || `Exit ${r.exitCode}`);
        }}
      >
        <Play className="size-4" />
      </GlassIconButton>
      <GlassIconButton label="Edit" onClick={onEdit}><Pencil className="size-4" /></GlassIconButton>
      <GlassIconButton label="Delete" onClick={() => confirm(`Delete "${task.name}"?`) && del.mutate(task.id)}><Trash2 className="size-4" /></GlassIconButton>
    </div>
  );
}

function TasksPage() {
  const { data, isLoading, error } = useTasks();
  const [editing, setEditing] = useState<Draft | null>(null);

  return (
    <AppShell title="Scheduled tasks">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-6">
        <PageIntro
          title="Scheduled tasks"
          description="Commands that run automatically on your server."
          action={!editing && <Button className="rounded-full" onClick={() => setEditing(EMPTY)}><Plus className="size-4" /> New</Button>}
        />
        {editing && <TaskForm key={editing.id ?? "new"} initial={editing} onDone={() => setEditing(null)} />}
        {isLoading && <SkeletonRows count={3} />}
        {error && <EmptyState icon={CalendarClock} title="Could not load tasks" description={(error as Error).message} />}
        {data && data.length === 0 && !editing && <EmptyState icon={CalendarClock} title="No scheduled tasks" description="Create one to run a command every hour, day or week." />}
        {data && data.length > 0 && (
          <Surface className="p-1.5">
            {data.map((t) => <TaskRow key={t.id} task={t} onEdit={() => setEditing(t)} />)}
          </Surface>
        )}
      </div>
    </AppShell>
  );
}
