import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CornerDownLeft, Eraser, Loader2, TerminalSquare } from "lucide-react";

import { GlassIconButton, PageIntro, Surface } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP } from "@/config/app";
import { useRunCommand } from "@/state/queries";

export const Route = createFileRoute("/terminal")({
  head: () => ({
    meta: [
      { title: "Terminal — AvA Code" },
      { name: "description", content: "Run shell commands on your AvA Code server." },
      { property: "og:title", content: "Terminal — AvA Code" },
      { property: "og:description", content: "Run shell commands on your AvA Code server." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TerminalPage,
});

const PRESETS = ["ls -la", "git status", "uptime", "df -h", "ps aux | head -15"];

interface Entry {
  id: number;
  command: string;
  output: string;
  exitCode: number;
}

function TerminalPage() {
  const [cwd, setCwd] = useState<string>(APP.defaultCwd);
  const [command, setCommand] = useState("");
  const [log, setLog] = useState<Entry[]>([]);
  const run = useRunCommand();

  const exec = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed || run.isPending) return;
    setCommand("");
    try {
      const res = await run.mutateAsync({ command: trimmed, cwd });
      setLog((l) => [...l, { id: Date.now(), command: trimmed, output: [res.stdout, res.stderr].filter(Boolean).join("\n"), exitCode: res.exitCode }]);
    } catch (err) {
      setLog((l) => [...l, { id: Date.now(), command: trimmed, output: (err as Error).message, exitCode: 1 }]);
    }
  };

  return (
    <AppShell
      title="Terminal"
      actions={
        <GlassIconButton label="Clear output" onClick={() => setLog([])} disabled={!log.length}>
          <Eraser />
        </GlassIconButton>
      }
    >
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-hidden px-4 py-4">
        <PageIntro title="Terminal" description="Commands run on your server in the folder below." />

        <Surface className="flex items-center gap-2 px-3 py-2">
          <span className="text-xs text-muted-foreground">Folder</span>
          <Input value={cwd} onChange={(e) => setCwd(e.target.value)} aria-label="Working folder" className="h-8 rounded-lg border-0 bg-transparent px-1 font-mono text-xs shadow-none focus-visible:ring-0" />
        </Surface>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {PRESETS.map((p) => (
            <Button key={p} variant="secondary" size="sm" onClick={() => exec(p)} disabled={run.isPending} className="glass shrink-0 rounded-full font-mono text-xs">
              {p}
            </Button>
          ))}
        </div>

        <Surface className="min-h-0 flex-1 overflow-y-auto bg-foreground/[0.04] p-3 font-mono text-xs">
          {!log.length && !run.isPending && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <TerminalSquare className="size-4" /> Output appears here.
            </p>
          )}
          {log.map((e) => (
            <div key={e.id} className="mb-3">
              <p className="text-primary">$ {e.command}</p>
              {e.output && <pre className={`mt-1 whitespace-pre-wrap ${e.exitCode === 0 ? "" : "text-destructive"}`}>{e.output}</pre>}
              <p className="mt-0.5 text-[10px] text-muted-foreground">exit {e.exitCode}</p>
            </div>
          ))}
          {run.isPending && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> running…
            </p>
          )}
        </Surface>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void exec(command);
          }}
          className="glass flex items-center gap-2 rounded-2xl px-2 py-1.5"
        >
          <span className="pl-2 font-mono text-sm text-muted-foreground">$</span>
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Type a command"
            aria-label="Command"
            className="h-9 border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="icon-sm" disabled={!command.trim() || run.isPending} className="rounded-xl">
            {run.isPending ? <Loader2 className="animate-spin" /> : <CornerDownLeft />}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
