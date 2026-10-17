import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronRight,
  Eye,
  FileAudio,
  FileCode,
  FileQuestion,
  FileText,
  FileVideo,
  Folder,
  FolderGit2,
  HardDrive,
  ImageIcon,
  Images,
  LayoutGrid,
  LayoutList,
  Loader2,
  RefreshCw,
  Search,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";

import { readDirectory } from "@/core/api/files";
import { readMediaUrl } from "@/core/api/media";
import { cn } from "@/lib/utils";
import { useAva } from "@/state/ava-provider";
import { APP } from "@/config/app";

type Kind = "image" | "video" | "audio" | "document" | "code" | "file";
type Category = "all" | "images" | "media" | "docs" | "code";
type ViewMode = "list" | "grid";

export interface ServerSelectedMedia {
  name: string;
  remotePath: string;
  kind: Kind;
}

const EXT_TO_KIND: Record<string, Kind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image", bmp: "image", ico: "image",
  mp4: "video", mov: "video", webm: "video", mkv: "video", avi: "video",
  mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio", flac: "audio", aac: "audio",
  ts: "code", tsx: "code", js: "code", jsx: "code", py: "code", rs: "code", json: "code", html: "code", css: "code", sh: "code", bash: "code", yaml: "code", yml: "code", sql: "code", php: "code", dart: "code", toml: "code",
  pdf: "document", txt: "document", md: "document", doc: "document", docx: "document", csv: "document", xlsx: "document",
  zip: "file", tar: "file", gz: "file", rar: "file", "7z": "file",
};

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "ico"];
const TEXT_EXTS = ["txt", "md", "json", "ts", "tsx", "js", "jsx", "py", "rs", "html", "css", "sh", "yaml", "yml", "log", "sql", "env", "toml", "bash", "php", "dart"];
const PREVIEW_MAX_BYTES = 10 * 1024 * 1024;

const fileExt = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const fileKind = (name: string): Kind => EXT_TO_KIND[fileExt(name)] ?? "file";

const KIND_ICON: Record<Kind, LucideIcon> = {
  image: ImageIcon, video: FileVideo, audio: FileAudio, document: FileText, code: FileCode, file: FileQuestion,
};

const KIND_COLOR: Record<Kind, string> = {
  image: "text-primary", video: "text-chart-2", audio: "text-chart-4", document: "text-destructive", code: "text-chart-3", file: "text-muted-foreground",
};

function formatSize(bytes?: number | null): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

interface Entry { name: string; path: string; isDirectory: boolean }

const SHORTCUTS = [
  { label: "Shared Media", path: APP.mediaDir, icon: Images },
  { label: "Workspace", path: APP.defaultCwd, icon: FolderGit2 },
  { label: "Root /", path: "/", icon: HardDrive },
  { label: "Temp", path: "/tmp", icon: Folder },
];

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All" }, { id: "images", label: "Images" }, { id: "media", label: "Media" }, { id: "docs", label: "Docs" }, { id: "code", label: "Code" },
];

/* ---------- Lazy image thumbnail (in-memory LRU, like mobile) ---------- */

const thumbCache = new Map<string, string>();
const THUMB_MAX = 60;

function Thumb({ path, name, rpc }: { path: string; name: string; rpc: NonNullable<ReturnType<typeof useAva>["rpc"]> }) {
  const ext = fileExt(name);
  const cacheable = IMAGE_EXTS.includes(ext);
  const [uri, setUri] = useState<string | null>(() => thumbCache.get(path) ?? null);

  useEffect(() => {
    let alive = true;
    if (uri || !cacheable) return;
    readMediaUrl(rpc, path)
      .then((url) => {
        if (!alive) return;
        thumbCache.delete(path);
        thumbCache.set(path, url);
        while (thumbCache.size > THUMB_MAX) thumbCache.delete(thumbCache.keys().next().value as string);
        setUri(url);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [path, uri, cacheable, rpc]);

  if (uri) return <img src={uri} alt={name} className="size-full rounded-lg object-cover" loading="lazy" />;
  const Icon = KIND_ICON[fileKind(name)];
  return <Icon className={cn("size-1/2", KIND_COLOR[fileKind(name)])} />;
}

/* ---------- File preview overlay (image / text / meta) ---------- */

interface PreviewItem { name: string; path: string; kind: Kind }

function PreviewOverlay({ item, rpc, onAttach, onClose }: { item: PreviewItem; rpc: NonNullable<ReturnType<typeof useAva>["rpc"]>; onAttach: (i: PreviewItem) => void; onClose: () => void }) {
  const ext = fileExt(item.name);
  const isImg = IMAGE_EXTS.includes(ext);
  const ext2 = fileExt(item.name);
  const isText = TEXT_EXTS.includes(ext2);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [binary, setBinary] = useState(false);
  const [size, setSize] = useState<number | null>(null);
  const [tooLarge, setTooLarge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setImageUrl(null); setText(null); setBinary(false); setTooLarge(false);
    (async () => {
      try {
        const meta = await rpc.call<{ size?: number }>("fs/getMetadata", { path: item.path });
        if (!alive) return;
        if (typeof meta.size === "number") {
          setSize(meta.size);
          if (meta.size > PREVIEW_MAX_BYTES && (isImg || isText)) { setTooLarge(true); setLoading(false); return; }
        }
      } catch { /* metadata optional */ }
      if (!isImg && !isText) { setLoading(false); return; }
      try {
        const res = await rpc.call<{ dataBase64?: string }>("fs/readFile", { path: item.path });
        if (!alive || !res.dataBase64) return;
        if (isImg) {
          const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
          setImageUrl(`data:${mime};base64,${res.dataBase64}`);
        } else {
          const raw = atob(res.dataBase64);
          const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
          const sample = bytes.subarray(0, 8192);
          const looksBinary = sample.includes(0);
          if (looksBinary) { setBinary(true); }
          else {
            const decoded = new TextDecoder().decode(bytes);
            let bad = 0; const check = decoded.slice(0, 4096);
            for (const ch of check) if (ch === "\uFFFD") bad++;
            if (check.length > 0 && bad / check.length > 0.05) setBinary(true);
            else setText(decoded);
          }
        }
      } catch { /* leave empty */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [item.path, isImg, isText, ext, rpc]);

  const KindIcon = KIND_ICON[item.kind];
  return (
    <div className="absolute inset-0 z-[60] flex flex-col rounded-2xl bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="truncate text-xs text-muted-foreground">{item.path}{size != null ? ` · ${formatSize(size)}` : ""}</p>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-1.5">
          {isImg && imageUrl && (
            <>
              <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground"><ZoomOut className="size-4" /></button>
              <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground"><ZoomIn className="size-4" /></button>
            </>
          )}
          <button type="button" aria-label="Attach file" onClick={() => onAttach(item)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"><Check className="size-3.5" /> Attach</button>
          <button type="button" aria-label="Close preview" onClick={onClose} className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground"><X className="size-4" /></button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading ? (
          <div className="grid h-full place-items-center"><Loader2 className="size-7 animate-spin text-primary" /></div>
        ) : tooLarge ? (
          <div className="grid h-full place-items-center text-center text-sm text-muted-foreground"><div><KindIcon className={cn("mx-auto size-10", KIND_COLOR[item.kind])} /><p className="mt-2">File is too large for inline preview ({formatSize(size)}).</p></div></div>
        ) : isImg && imageUrl ? (
          <div className="grid h-full place-items-center overflow-auto"><img src={imageUrl} alt={item.name} style={{ transform: `scale(${zoom})` }} className="max-h-full max-w-full rounded-lg object-contain transition-transform" /></div>
        ) : isText && text != null ? (
          <pre className="h-full overflow-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed">{text}</pre>
        ) : isText && binary ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Binary file — preview not available.</div>
        ) : (
          <div className="grid h-full place-items-center text-center"><div><KindIcon className={cn("mx-auto size-12", KIND_COLOR[item.kind])} /><p className="mt-3 text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.kind} · {formatSize(size)}</p></div></div>
        )}
      </div>
    </div>
  );
}

/* ---------- Main modal (portal z-[100], mirrors mobile ServerMediaModal) ---------- */

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (media: ServerSelectedMedia) => void;
  initialDirectory?: string;
}

export function ServerMediaPicker({ open, onClose, onSelect, initialDirectory = APP.mediaDir }: Props) {
  const { rpc } = useAva();
  const [dir, setDir] = useState(initialDirectory);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [refreshKey, setRefreshKey] = useState(0);
  const [preview, setPreview] = useState<PreviewItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setDir(initialDirectory); setPreview(null); } }, [open, initialDirectory]);

  useEffect(() => {
    if (!open || !rpc) return;
    let alive = true;
    setLoading(true);
    setError(null);
    readDirectory(rpc, dir)
      .then((res) => { if (alive) setEntries(res.map((e) => ({ name: e.name, path: e.path, isDirectory: e.isDirectory }))); })
      .catch(() => alive && setError("Could not read this directory."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [open, rpc, dir, refreshKey]);

  const filtered = useMemo(() => {
    let out = entries;
    const q = search.toLowerCase().trim();
    if (q) out = out.filter((e) => e.name.toLowerCase().includes(q));
    if (category !== "all") {
      out = out.filter((e) => {
        if (e.isDirectory) return true;
        const k = fileKind(e.name);
        if (category === "images") return k === "image";
        if (category === "media") return k === "image" || k === "video" || k === "audio";
        if (category === "docs") return k === "document";
        if (category === "code") return k === "code";
        return true;
      });
    }
    return out;
  }, [entries, search, category]);

  const folders = filtered.filter((e) => e.isDirectory);
  const files = filtered.filter((e) => !e.isDirectory);
  const canGoUp = dir !== "/" && dir.length > 1;
  const goUp = () => setDir(dir.replace(/\/+$/, "").split("/").slice(0, -1).join("/") || "/");
  const crumbs = dir.split("/").filter(Boolean);

  const attach = (item: PreviewItem) => {
    onSelect({ name: item.name, remotePath: item.path, kind: item.kind });
    onClose();
  };

  const openPreview = (e: Entry) => setPreview({ name: e.name, path: e.path, kind: fileKind(e.name) });

  const handleUpload = async (fl: FileList | null) => {
    if (!fl?.length || !rpc) return;
    setUploading(true);
    try {
      for (const file of Array.from(fl)) {
        const b64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => { const s = String(r.result ?? ""); res(s.includes(",") ? s.split(",")[1] ?? "" : s); };
          r.onerror = () => rej(r.error);
          r.readAsDataURL(file);
        });
        const clean = file.name.replace(/[^\w.\-() ]/g, "_").slice(0, 120) || "file";
        await rpc.call("fs/writeFile", { path: `${dir.replace(/\/+$/, "")}/${clean}`, dataBase64: b64 });
      }
      setRefreshKey((k) => k + 1);
    } catch { /* upload failed silently; refresh shows state */ }
    finally { setUploading(false); if (uploadRef.current) uploadRef.current.value = ""; }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {preview && rpc && <PreviewOverlay item={preview} rpc={rpc} onAttach={attach} onClose={() => setPreview(null)} />}

        {/* header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10"><Images className="size-4.5 text-primary" /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Select from Server</p>
            <p className="truncate text-xs text-muted-foreground">{dir} · {filtered.length} items</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted p-0.5">
            <button type="button" aria-label="List view" onClick={() => setViewMode("list")} className={cn("grid size-7 place-items-center rounded-md", viewMode === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}><LayoutList className="size-3.5" /></button>
            <button type="button" aria-label="Grid view" onClick={() => setViewMode("grid")} className={cn("grid size-7 place-items-center rounded-md", viewMode === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}><LayoutGrid className="size-3.5" /></button>
          </div>
          <input ref={uploadRef} type="file" multiple className="hidden" onChange={(e) => void handleUpload(e.target.files)} />
          <button type="button" aria-label="Upload here" disabled={uploading} onClick={() => uploadRef.current?.click()} className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50">{uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}</button>
          <button type="button" aria-label="Refresh" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading} className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground"><RefreshCw className={cn("size-3.5", loading && "animate-spin")} /></button>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground"><X className="size-4" /></button>
        </div>

        {/* shortcuts */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-border px-4 py-2">
          {SHORTCUTS.map((s) => (
            <button key={s.path} type="button" onClick={() => setDir(s.path)} className={cn("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition", dir === s.path ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:text-foreground")}>
              <s.icon className="size-3" />{s.label}
            </button>
          ))}
        </div>

        {/* search + category filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          <div className="relative min-w-40 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…" className="h-8 w-full rounded-lg border border-border bg-muted pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50" />
          </div>
          <div className="flex gap-1">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" onClick={() => setCategory(c.id)} className={cn("h-7 rounded-full px-2.5 text-xs font-medium transition", category === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>{c.label}</button>
            ))}
          </div>
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {canGoUp && (
            <button type="button" onClick={goUp} className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"><ArrowUp className="size-3" /> .. up one level</button>
          )}
          {loading ? (
            <div className="grid place-items-center py-10"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No files match.</p>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
              {[...folders, ...files].map((e) => (
                <button key={e.path} type="button" onClick={() => (e.isDirectory ? setDir(e.path) : openPreview(e))} className="group flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-border bg-muted/40 p-2 text-center transition hover:border-primary/40 hover:bg-muted">
                  {e.isDirectory ? <Folder className="size-8 text-primary" /> : <div className="grid size-10 place-items-center overflow-hidden rounded-lg"><Thumb path={e.path} name={e.name} rpc={rpc!} /></div>}
                  <span className="line-clamp-2 w-full break-all text-[11px] leading-tight text-muted-foreground group-hover:text-foreground">{e.name}</span>
                  {!e.isDirectory && <Eye className="size-3 shrink-0 text-muted-foreground/60" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {[...folders, ...files].map((e) => (
                <button key={e.path} type="button" onClick={() => (e.isDirectory ? setDir(e.path) : openPreview(e))} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-accent">
                  <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                    {e.isDirectory ? <Folder className="size-4 text-primary" /> : <Thumb path={e.path} name={e.name} rpc={rpc!} />}
                  </span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{e.name}</span><span className="block truncate text-xs text-muted-foreground">{e.isDirectory ? "Folder" : fileKind(e.name)}</span></span>
                  <Eye className="size-3.5 shrink-0 text-muted-foreground" />
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* footer breadcrumbs */}
        <div className="border-t border-border px-4 py-2">
          <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            <button type="button" onClick={() => setDir("/")} className="hover:text-foreground">/</button>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <button type="button" onClick={() => setDir("/" + crumbs.slice(0, i + 1).join("/"))} className="hover:text-foreground">{c}</button>
                {i < crumbs.length - 1 && <span>/</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
