import { useState, useMemo, useEffect } from "react";
import {
  Globe,
  ExternalLink,
  Camera,
  Smartphone,
  Monitor,
  Tablet,
  MousePointerClick,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Lock,
  Eye,
  Hourglass,
  ArrowUpDown,
  Code2,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MessagePart } from "@/core/types";
import { useAva } from "@/state/ava-provider";
import { GlassIconButton } from "@/components/kit";
import { Button } from "@/components/ui/button";

// Image preview helper using app-server fs/readFile
export function ImageViewPreview({ path }: { path?: string | undefined }) {
  const { rpc } = useAva();
  const [uri, setUri] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!path || !rpc) return;
    rpc
      .call<{ dataBase64?: string }>("fs/readFile", { path })
      .then((res) => {
        if (!alive || !res.dataBase64) return;
        const ext = path.split(".").pop()?.toLowerCase() ?? "";
        const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
        setUri(`data:${mime};base64,${res.dataBase64}`);
      })
      .catch(() => {
        if (alive) setErr(true);
      });
    return () => {
      alive = false;
    };
  }, [path, rpc]);

  if (!path) return null;
  if (err) return <p className="px-3 py-2 text-xs text-muted-foreground">Could not load image preview.</p>;
  if (!uri) {
    return (
      <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading image…
      </div>
    );
  }
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-black/40">
      <img
        src={uri}
        alt={path.split("/").pop() ?? "preview"}
        className="max-h-80 w-full object-contain transition-transform duration-200 group-hover:scale-[1.01]"
      />
      <div className="flex items-center justify-between gap-2 border-t border-border/40 bg-background/80 px-3 py-1.5 backdrop-blur-sm">
        <span className="truncate font-mono text-[11px] text-muted-foreground">{path.split("/").pop()}</span>
        <a
          href={uri}
          download={path.split("/").pop()}
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          Download
        </a>
      </div>
    </div>
  );
}

/** Icon and style resolver for browser actions */
function getActionMeta(action?: string) {
  const a = (action || "open").toLowerCase();
  switch (a) {
    case "open":
    case "navigate":
    case "goto":
      return {
        label: "NAVIGATE",
        icon: Globe,
        color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      };
    case "click":
      return {
        label: "CLICK",
        icon: MousePointerClick,
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      };
    case "type":
    case "fill":
      return {
        label: "INPUT",
        icon: Keyboard,
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      };
    case "screenshot":
      return {
        label: "SCREENSHOT",
        icon: Camera,
        color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      };
    case "viewport":
      return {
        label: "VIEWPORT",
        icon: Smartphone,
        color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
      };
    case "wait":
      return {
        label: "WAIT",
        icon: Hourglass,
        color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
      };
    case "scroll":
      return {
        label: "SCROLL",
        icon: ArrowUpDown,
        color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      };
    case "observe":
      return {
        label: "OBSERVE",
        icon: Eye,
        color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      };
    case "evaluate_js":
    case "eval":
      return {
        label: "EVAL JS",
        icon: Code2,
        color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      };
    default:
      return {
        label: a.toUpperCase().slice(0, 10),
        icon: Globe,
        color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      };
  }
}

/** Individual Browser Step Card rendered in the chat timeline */
export function BrowserToolCard({ part }: { part: MessagePart }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const m = part.meta ?? {};

  const action = (m.action || "open").toLowerCase();
  const actMeta = getActionMeta(action);
  const Icon = actMeta.icon;

  const url = m.url || (typeof part.input === "string" && part.input.startsWith("http") ? part.input : undefined);
  const domain = url ? url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] : undefined;

  let title = m.command || "Browser action";
  if (action === "open" && url) title = `Open ${url}`;
  else if (action === "viewport") title = `Set Viewport: ${m.viewport || "390x844"}`;
  else if (action === "click") title = `Click ${m.ref ? `@${m.ref}` : m.selector || "element"}`;
  else if (action === "screenshot") title = `Capture Screenshot`;

  const copyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group/card my-1 overflow-hidden rounded-2xl border transition-all duration-200",
        part.status === "running"
          ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/[0.06] to-background shadow-lg shadow-cyan-500/5 ring-1 ring-cyan-500/20"
          : part.status === "error"
            ? "border-destructive/30 bg-destructive/[0.04]"
            : "border-border/60 bg-card/60 backdrop-blur-md hover:border-border"
      )}
    >
      {/* Header bar */}
      <div
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 transition hover:bg-accent/40"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={cn("grid size-8 shrink-0 place-items-center rounded-xl border shadow-sm", actMeta.color)}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{title}</span>
              <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider", actMeta.color)}>
                {actMeta.label}
              </span>
              {m.viewport && (
                <span className="hidden items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
                  <Smartphone className="size-2.5" /> {m.viewport}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              {domain && <span className="font-mono text-[11px] text-primary/80">{domain}</span>}
              {m.durationMs ? <span>· {(m.durationMs / 1000).toFixed(1)}s</span> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {part.status === "running" && (
            <span className="flex items-center gap-1 text-xs text-cyan-500">
              <Loader2 className="size-3.5 animate-spin" />
              <span className="hidden sm:inline">Active</span>
            </span>
          )}
          {part.status === "done" && (
            <CheckCircle2 className="size-4 text-emerald-500" />
          )}
          {part.status === "error" && (
            <AlertCircle className="size-4 text-destructive" />
          )}

          {url && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              title="Open link in new tab"
              className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
            </button>
          )}

          <div className="text-muted-foreground">
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="space-y-3 border-t border-border/40 bg-muted/10 p-3.5">
          {/* Target URL bar */}
          {url && (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5">
              <Lock className="size-3.5 text-emerald-500 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground select-all">{url}</span>
              <button
                type="button"
                onClick={copyUrl}
                className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Copy URL"
              >
                {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              </button>
            </div>
          )}

          {/* Screenshot preview if available */}
          {m.screenshotPath && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Camera className="size-3" /> Captured Screenshot
              </p>
              <ImageViewPreview path={m.screenshotPath} />
            </div>
          )}

          {/* Page metadata if available */}
          {(m.pageTitle || m.elementsCount) && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {m.pageTitle && (
                <div className="rounded-xl border border-border/40 bg-background/40 p-2.5">
                  <span className="text-[10px] uppercase text-muted-foreground">Page Title</span>
                  <p className="mt-0.5 truncate font-medium text-foreground">{m.pageTitle}</p>
                </div>
              )}
              {m.elementsCount && (
                <div className="rounded-xl border border-border/40 bg-background/40 p-2.5">
                  <span className="text-[10px] uppercase text-muted-foreground">Interactive Elements</span>
                  <p className="mt-0.5 font-medium text-foreground">{m.elementsCount} refs mapped</p>
                </div>
              )}
            </div>
          )}

          {/* Parameters / Input */}
          {part.input && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Arguments</span>
              <pre className="max-h-36 overflow-auto rounded-xl border border-border/40 bg-background/80 p-2.5 font-mono text-[11px] text-muted-foreground">
                {typeof part.input === "string" ? part.input : JSON.stringify(part.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output / Result text */}
          {part.output && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Result Output</span>
              <pre className="max-h-40 overflow-auto rounded-xl border border-border/40 bg-background/80 p-2.5 font-mono text-[11px] text-muted-foreground">
                {part.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Live Browser Dock
 * Renders an interactive live iframe and snapshot preview at the bottom of the agent output
 * as long as the browser session was opened or is active.
 */
export function LiveBrowserDock({ parts, live = false }: { parts: MessagePart[]; live?: boolean }) {
  // Find all browser parts in this turn
  const browserParts = useMemo(() => {
    const list = parts.filter(
      (p) =>
        p.toolName?.toLowerCase() === "browser" ||
        p.meta?.isBrowser ||
        p.meta?.screenshotPath
    );
    if (list.length > 0) return list;

    // Check if turn mentions browser actions, screenshots, or opened URLs
    for (const p of parts) {
      const text = `${p.text || ""} ${typeof p.input === "string" ? p.input : ""} ${p.output || ""} ${p.meta?.command || ""}`;
      const lower = text.toLowerCase();
      const hasBrowserIntent =
        lower.includes("browser") ||
        lower.includes("screenshot") ||
        lower.includes("opened https://") ||
        lower.includes("navigated to") ||
        lower.includes("puppeteer") ||
        lower.includes("playwright");

      const urlMatch = text.match(/https?:\/\/[^\s"'<>\)]+/i);
      const shotMatch = text.match(/(?:\/[\w.-]+)+\.(?:png|jpg|jpeg|webp)/i);

      if (hasBrowserIntent && (urlMatch || shotMatch)) {
        return [
          {
            id: `${p.id}_synthesized_browser`,
            kind: "tool" as const,
            text: "",
            toolName: "Browser",
            status: "done" as const,
            input: urlMatch ? urlMatch[0] : "",
            output: text,
            meta: {
              isBrowser: true,
              action: shotMatch ? "screenshot" : "open",
              url: urlMatch ? urlMatch[0] : undefined,
              screenshotPath: shotMatch ? shotMatch[0] : undefined,
            },
          },
        ];
      }
    }
    return [];
  }, [parts]);

  // If no browser parts exist, don't show the dock
  if (browserParts.length === 0) return null;

  // Determine active URL
  const activeUrl = useMemo(() => {
    for (let i = browserParts.length - 1; i >= 0; i--) {
      const u = browserParts[i]?.meta?.url;
      if (u && u.startsWith("http")) return u;
      const inp = browserParts[i]?.input;
      if (typeof inp === "string" && inp.startsWith("http")) return inp;
      if (typeof inp === "object" && inp && "url" in inp && typeof (inp as any).url === "string") {
        return (inp as any).url;
      }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const text = `${parts[i]?.text || ""} ${parts[i]?.output || ""} ${parts[i]?.meta?.command || ""}`;
      const urlMatch = text.match(/https?:\/\/[^\s"'<>\)]+/i);
      if (urlMatch) return urlMatch[0];
    }
    return "https://www.veliqbd.com";
  }, [browserParts, parts]);

  // Determine active viewport profile
  const activeViewport = useMemo(() => {
    for (let i = browserParts.length - 1; i >= 0; i--) {
      const vp = browserParts[i]?.meta?.viewport;
      if (vp) return vp;
    }
    return "mobile";
  }, [browserParts]);

  // Collect all screenshots captured
  const screenshots = useMemo(() => {
    const list: string[] = [];
    const checkAndAdd = (path: string | undefined) => {
      if (path && /\.(?:png|jpg|jpeg|webp)$/i.test(path) && !list.includes(path)) {
        list.push(path);
      }
    };

    for (const p of browserParts) {
      checkAndAdd(p.meta?.screenshotPath);
    }
    for (const p of parts) {
      checkAndAdd(p.meta?.screenshotPath);
      const text = `${p.text || ""} ${typeof p.input === "string" ? p.input : ""} ${p.output || ""} ${p.meta?.command || ""}`;
      const allShots = [...text.matchAll(/(?:\/[\w.-]+)+\.(?:png|jpg|jpeg|webp)/gi)];
      for (const m of allShots) {
        checkAndAdd(m[0]);
      }
    }
    return list;
  }, [browserParts, parts]);

  // Is any browser step currently running?
  const isRunning = live && browserParts.some((p) => p.status === "running");

  // Local interactive controls
  const [viewportMode, setViewportMode] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [viewMode, setViewMode] = useState<"live" | "snapshot">("live");
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync viewportMode with agent's chosen viewport
  useEffect(() => {
    if (activeViewport.includes("390") || activeViewport.toLowerCase() === "mobile") {
      setViewportMode("mobile");
    } else if (activeViewport.includes("768") || activeViewport.toLowerCase() === "tablet") {
      setViewportMode("tablet");
    } else if (activeViewport.includes("1280") || activeViewport.toLowerCase() === "desktop") {
      setViewportMode("desktop");
    }
  }, [activeViewport]);

  // Sync latest screenshot if available
  useEffect(() => {
    if (screenshots.length > 0) {
      setSelectedSnapshot(screenshots[screenshots.length - 1]!);
    }
  }, [screenshots]);

  const copyUrl = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const domain = activeUrl ? activeUrl.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] : "";

  return (
    <div
      className={cn(
        "my-4 overflow-hidden rounded-3xl border bg-card/80 shadow-2xl backdrop-blur-xl transition-all duration-300",
        isRunning
          ? "border-cyan-500/50 shadow-cyan-500/10 ring-2 ring-cyan-500/30"
          : "border-border/70 shadow-black/20"
      )}
    >
      {/* Top Browser Chrome Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/60 bg-muted/40 px-4 py-2.5">
        {/* Left: Window controls & Live beacon */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-red-500/80 shadow-sm" />
            <span className="size-3 rounded-full bg-amber-500/80 shadow-sm" />
            <span className="size-3 rounded-full bg-emerald-500/80 shadow-sm" />
          </div>

          <div className="flex items-center gap-1.5 pl-1.5">
            <span className="relative flex size-2.5">
              {isRunning ? (
                <>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-cyan-500" />
                </>
              ) : (
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              )}
            </span>
            <span className="text-xs font-semibold tracking-wide text-foreground">
              {isRunning ? "LIVE BROWSER SESSION" : "BROWSER SESSION"}
            </span>
            {isRunning && (
              <span className="hidden items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-400 sm:inline-flex">
                <Loader2 className="size-2.5 animate-spin" /> Interacting
              </span>
            )}
          </div>
        </div>

        {/* Center: Viewport Switcher Buttons */}
        <div className="flex items-center rounded-xl border border-border/60 bg-background/60 p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setViewportMode("mobile")}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition",
              viewportMode === "mobile"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Mobile Viewport (390×844)"
          >
            <Smartphone className="size-3" />
            <span>390px</span>
          </button>
          <button
            type="button"
            onClick={() => setViewportMode("tablet")}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition",
              viewportMode === "tablet"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Tablet Viewport (768×1024)"
          >
            <Tablet className="size-3" />
            <span>768px</span>
          </button>
          <button
            type="button"
            onClick={() => setViewportMode("desktop")}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition",
              viewportMode === "desktop"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Desktop Viewport (Full Width)"
          >
            <Monitor className="size-3" />
            <span>Desktop</span>
          </button>
        </div>

        {/* Right: Mode & Actions */}
        <div className="flex items-center gap-1.5">
          {screenshots.length > 0 && (
            <div className="flex items-center rounded-xl border border-border/60 bg-background/60 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("live")}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition",
                  viewMode === "live" ? "bg-secondary text-foreground" : "text-muted-foreground"
                )}
              >
                <Globe className="size-3" /> Live
              </button>
              <button
                type="button"
                onClick={() => setViewMode("snapshot")}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition",
                  viewMode === "snapshot" ? "bg-secondary text-foreground" : "text-muted-foreground"
                )}
              >
                <Camera className="size-3" /> Snapshots ({screenshots.length})
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            title={collapsed ? "Expand browser" : "Collapse browser"}
          >
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        </div>
      </div>

      {/* Address Bar */}
      {!collapsed && (
        <div className="flex items-center gap-2 border-b border-border/40 bg-background/70 px-4 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 shadow-inner">
            <Lock className="size-3.5 text-emerald-500 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground select-all">{activeUrl}</span>
            {domain && (
              <span className="hidden rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                {domain}
              </span>
            )}
          </div>

          <GlassIconButton label="Copy URL" onClick={copyUrl}>
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </GlassIconButton>
          <GlassIconButton label="Reload" onClick={() => setReloadKey((k) => k + 1)}>
            <RotateCw className="size-3.5" />
          </GlassIconButton>
          <GlassIconButton
            label="Open in new tab"
            onClick={() => window.open(activeUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="size-3.5" />
          </GlassIconButton>
        </div>
      )}

      {/* Viewport Content */}
      {!collapsed && (
        <div className="bg-gradient-to-b from-muted/20 to-muted/40 p-3 sm:p-5">
          {viewMode === "live" ? (
            <div className="flex justify-center">
              <div
                className={cn(
                  "relative overflow-hidden transition-all duration-300",
                  viewportMode === "mobile" &&
                    "h-[640px] w-[390px] max-w-full rounded-[2.5rem] border-[6px] border-border/80 bg-background shadow-2xl",
                  viewportMode === "tablet" &&
                    "h-[560px] w-[768px] max-w-full rounded-2xl border-4 border-border/80 bg-background shadow-2xl",
                  viewportMode === "desktop" &&
                    "h-[520px] w-full rounded-xl border-2 border-border/80 bg-background shadow-xl"
                )}
              >
                {/* Mobile Dynamic Island / Notch */}
                {viewportMode === "mobile" && (
                  <div className="pointer-events-none absolute left-1/2 top-2 z-20 h-4 w-24 -translate-x-1/2 rounded-full bg-black/80 backdrop-blur-sm" />
                )}

                {/* Live iframe */}
                <iframe
                  key={reloadKey}
                  src={activeUrl}
                  title="Live browser viewport"
                  className="size-full border-0 bg-background"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                />
              </div>
            </div>
          ) : (
            /* Snapshot View Mode */
            <div className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  viewportMode === "mobile" && "w-[390px] max-w-full",
                  viewportMode === "tablet" && "w-[768px] max-w-full",
                  viewportMode === "desktop" && "w-full"
                )}
              >
                {selectedSnapshot ? (
                  <ImageViewPreview path={selectedSnapshot} />
                ) : (
                  <div className="grid h-64 place-items-center rounded-2xl border border-dashed text-xs text-muted-foreground">
                    No snapshots captured yet.
                  </div>
                )}
              </div>

              {/* Snapshot thumbnail pills */}
              {screenshots.length > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {screenshots.map((s, idx) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSnapshot(s)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition",
                        selectedSnapshot === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      Snapshot #{idx + 1} ({s.split("/").pop()})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom helper notice */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3 text-cyan-400" />
              <span>AvA Headless Engine: CDP Chrome Live Session</span>
            </span>
            <span>
              If embedding is restricted by site headers, switch to{" "}
              <button
                type="button"
                onClick={() => setViewMode("snapshot")}
                className="font-medium text-primary underline"
              >
                Snapshot View
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
