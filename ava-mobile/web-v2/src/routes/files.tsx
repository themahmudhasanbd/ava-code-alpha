import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, File, FileCode2, Folder, FolderOpen, RefreshCw, Search, X } from "lucide-react";
import type { BundledLanguage } from "shiki";

import { CodeBlockContent } from "@/components/ai-elements/code-block";
import { EmptyState, GlassIconButton, SkeletonRows } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP } from "@/config/app";
import type { FileEntry } from "@/core/types";
import { parentPath } from "@/core/api/files";
import { useDirectory, useFileContent } from "@/state/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/files")({
  head: () => ({
    meta: [
      { title: "Code — AvA Code" },
      { name: "description", content: "Browse and read workspace code on your AvA Code server." },
      { property: "og:title", content: "Code — AvA Code" },
      { property: "og:description", content: "Browse and read workspace code on your AvA Code server." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FilesPage,
});

const languageByExtension: Record<string, BundledLanguage> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", json: "json", css: "css", html: "html",
  md: "markdown", py: "python", rs: "rust", go: "go", sh: "bash", bash: "bash", yaml: "yaml", yml: "yaml",
  toml: "toml", sql: "sql", php: "php", java: "java", kt: "kotlin", dart: "dart", xml: "xml",
};

function fileLanguage(path: string): BundledLanguage {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return languageByExtension[extension] ?? "plaintext";
}

function TreeBranch({ path, depth, query, active, onOpen }: { path: string; depth: number; query: string; active: string | null; onOpen: (entry: FileEntry) => void }) {
  const { data, isLoading } = useDirectory(path);
  const [expanded, setExpanded] = useState<string[]>(depth === 0 ? [path] : []);
  const visible = useMemo(() => (data ?? []).filter((entry) => !query || entry.name.toLowerCase().includes(query.toLowerCase())), [data, query]);

  if (isLoading) return depth === 0 ? <div className="px-3 py-2"><SkeletonRows count={5} /></div> : null;
  return (
    <div>
      {visible.map((entry) => {
        const open = expanded.includes(entry.path);
        return (
          <div key={entry.path}>
            <Button
              variant="ghost"
              onClick={() => {
                if (entry.isDirectory) setExpanded((items) => open ? items.filter((item) => item !== entry.path) : [...items, entry.path]);
                else onOpen(entry);
              }}
              className={cn("h-10 w-full justify-start gap-2 rounded-lg px-2 font-normal", active === entry.path && "bg-accent text-accent-foreground")}
              style={{ paddingLeft: `${Math.min(depth, 8) * 14 + 8}px` }}
              title={entry.path}
            >
              {entry.isDirectory ? (open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />) : <span className="w-4" />}
              {entry.isDirectory ? (open ? <FolderOpen className="size-4 text-primary" /> : <Folder className="size-4 text-primary" />) : <FileCode2 className="size-4 text-muted-foreground" />}
              <span className="truncate">{entry.name}</span>
            </Button>
            {entry.isDirectory && open && <TreeBranch path={entry.path} depth={depth + 1} query={query} active={active} onOpen={onOpen} />}
          </div>
        );
      })}
    </div>
  );
}

function FileEditor({ path, onBack }: { path: string; onBack: () => void }) {
  const { data, isLoading, error } = useFileContent(path);
  const [copied, setCopied] = useState(false);
  const name = path.split("/").filter(Boolean).pop() ?? path;
  const copy = async () => {
    await navigator.clipboard.writeText(data?.text ?? "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  const download = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([data.text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-code text-code-foreground">
      <div className="flex h-14 shrink-0 items-center border-b border-code-border px-2">
        <Button variant="ghost" size="icon" aria-label="Back to files" onClick={onBack} className="text-code-muted hover:bg-code-muted hover:text-code-foreground"><ChevronLeft /></Button>
        <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold">{name}</h1>
        <Button variant="ghost" size="icon" aria-label="Show file folder" onClick={onBack} className="text-code-muted hover:bg-code-muted hover:text-code-foreground"><Folder /></Button>
      </div>
      <div className="flex h-12 shrink-0 border-b border-code-border">
        <div className="flex min-w-0 items-center gap-2 border-r border-code-border bg-code-active px-4 text-sm">
          <File className="size-4 text-code-muted" /><span className="truncate">{name}</span><X className="size-4 text-code-muted" />
        </div>
        <div className="ml-auto flex items-center border-l border-code-border px-1">
          <Button variant="ghost" size="sm" onClick={() => void copy()} className="gap-2 text-code-muted hover:bg-code-muted hover:text-code-foreground">{copied ? <Check /> : <Copy />}<span className="hidden sm:inline">Copy</span></Button>
          <Button variant="ghost" size="sm" onClick={download} className="gap-2 text-code-muted hover:bg-code-muted hover:text-code-foreground"><Download /><span>Download</span></Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading && <p className="p-4 text-sm text-code-muted">Opening…</p>}
        {error && <p className="p-4 text-sm text-destructive">{(error as Error).message}</p>}
        {data && <CodeBlockContent code={data.text || "(empty file)"} language={fileLanguage(path)} showLineNumbers />}
      </div>
    </section>
  );
}

function FilesPage() {
  const [root, setRoot] = useState<string>(APP.defaultCwd);
  const [query, setQuery] = useState("");
  const [openFile, setOpenFile] = useState<string | null>(null);
  const { refetch, isFetching, error } = useDirectory(root);

  return (
    <AppShell title="Code" actions={<GlassIconButton label="Refresh files" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={isFetching ? "animate-spin" : ""} /></GlassIconButton>}>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-3 pb-3 pt-3 sm:px-5 sm:pb-5">
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-code-border bg-code text-code-foreground shadow-xl">
          {openFile ? <FileEditor path={openFile} onBack={() => setOpenFile(null)} /> : (
            <section className="flex min-h-0 flex-1 flex-col">
              <div className="flex h-14 shrink-0 items-center border-b border-code-border px-3">
                {root !== "/" && <Button variant="ghost" size="icon" aria-label="Go to parent folder" onClick={() => setRoot(parentPath(root))} className="text-code-muted hover:bg-code-muted hover:text-code-foreground"><ChevronLeft /></Button>}
                <h1 className="flex-1 text-center text-lg font-semibold">Code</h1>
                <span className="size-10" />
              </div>
              <div className="border-b border-code-border p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-code-muted" />
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code" className="h-11 border-code-border bg-code pl-9 text-code-foreground placeholder:text-code-muted" />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
                {error ? <EmptyState icon={Folder} title="Could not open this folder" description={(error as Error).message} /> : <TreeBranch path={root} depth={0} query={query} active={openFile} onOpen={(entry) => setOpenFile(entry.path)} />}
              </div>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}