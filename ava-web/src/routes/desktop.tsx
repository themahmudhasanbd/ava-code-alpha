import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Keyboard, Monitor, Pause, Play } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, GlassIconButton, PageIntro, SkeletonRows, Surface } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCaptureScreen, useDesktopInput, useDesktopStatus } from "@/state/queries";

export const Route = createFileRoute("/desktop")({
  head: () => ({
    meta: [
      { title: "Remote desktop — AvA Code" },
      { name: "description", content: "See and control your server's desktop from AvA Code." },
      { property: "og:title", content: "Remote desktop — AvA Code" },
      { property: "og:description", content: "See and control your server's desktop from AvA Code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DesktopPage,
});

const KEYS = ["Return", "Escape", "Tab", "BackSpace", "ctrl+c", "ctrl+v", "super"];

function DesktopPage() {
  const { data: status, isLoading, error } = useDesktopStatus();
  const capture = useCaptureScreen();
  const input = useDesktopInput();
  const [shot, setShot] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [text, setText] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const display = status?.display ?? null;

  const refresh = async () => {
    if (!display) return;
    try {
      setShot(await capture.mutateAsync({ display, width: status!.width, height: status!.height }));
    } catch (e) {
      setLive(false);
      toast.error((e as Error).message);
    }
  };

  useEffect(() => {
    if (!live) return;
    const id = setInterval(refresh, 2500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, display]);

  const send = async (payload: Parameters<typeof input.mutateAsync>[0]["input"]) => {
    if (!display) return;
    try {
      await input.mutateAsync({ display, input: payload });
      setTimeout(refresh, 400);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = imgRef.current;
    if (!img) return;
    const r = img.getBoundingClientRect();
    send({ x: ((e.clientX - r.left) / r.width) * status!.width, y: ((e.clientY - r.top) / r.height) * status!.height });
  };

  return (
    <AppShell title="Remote desktop">
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 overflow-y-auto px-4 py-6">
        <PageIntro
          title="Remote desktop"
          description="Tap the screen to click. Type below to send keys."
          action={
            display && (
              <div className="flex gap-2">
                <GlassIconButton label="Capture" onClick={refresh} disabled={capture.isPending}><Camera className="size-4" /></GlassIconButton>
                <GlassIconButton label={live ? "Pause live view" : "Start live view"} onClick={() => setLive((v) => !v)}>
                  {live ? <Pause className="size-4" /> : <Play className="size-4" />}
                </GlassIconButton>
              </div>
            )
          }
        />
        {isLoading && <SkeletonRows count={2} />}
        {error && <EmptyState icon={Monitor} title="Could not check the desktop" description={(error as Error).message} />}
        {status && !display && (
          <EmptyState icon={Monitor} title="No desktop running" description="Start a desktop session (for example Xvfb or a VNC server) on your server, then come back." />
        )}
        {status && display && (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Display {display}</Badge>
              <Badge variant={status.vncRunning ? "default" : "secondary"}>{status.vncRunning ? "VNC running" : "VNC off"}</Badge>
              {!status.canScreenshot && <Badge variant="destructive">Screenshot tool missing</Badge>}
            </div>
            <Surface className="overflow-hidden p-1.5">
              {shot ? (
                <img ref={imgRef} src={shot} alt="Remote screen" onClick={onClick} className="w-full cursor-crosshair rounded-xl" />
              ) : (
                <button onClick={refresh} className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
                  {capture.isPending ? "Capturing…" : "Tap to capture the screen"}
                </button>
              )}
            </Surface>
            <Surface className="flex items-center gap-2 p-1.5">
              <Keyboard className="ml-2 size-4 shrink-0 text-muted-foreground" />
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && text) {
                    send({ text });
                    setText("");
                  }
                }}
                placeholder="Type text and press Enter"
                className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </Surface>
            <div className="flex flex-wrap gap-2">
              {KEYS.map((k) => (
                <button key={k} onClick={() => send({ key: k })} className="glass rounded-full px-3 py-1.5 font-mono text-xs">{k}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
