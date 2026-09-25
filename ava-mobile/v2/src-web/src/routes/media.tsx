import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileAudio, FileQuestion, FileVideo, Image as ImageIcon, RotateCw, Trash2, X } from "lucide-react";

import { EmptyState, GlassIconButton, PageIntro, SkeletonRows, Surface } from "@/components/kit";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { APP } from "@/config/app";
import type { MediaItem, MediaKind } from "@/core/api/media";
import { cn } from "@/lib/utils";
import { useMedia, useMediaUrl, useRemoveMedia } from "@/state/queries";

export const Route = createFileRoute("/media")({
  head: () => ({
    meta: [
      { title: "Media — AvA Code" },
      { name: "description", content: "Images, videos and audio shared with your AvA agent." },
      { property: "og:title", content: "Media — AvA Code" },
      { property: "og:description", content: "Images, videos and audio shared with your AvA agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MediaPage,
});

const FILTERS: { id: MediaKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
  { id: "audio", label: "Audio" },
];

const kindIcon = { image: ImageIcon, video: FileVideo, audio: FileAudio, other: FileQuestion };

function Thumb({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
  const { data } = useMediaUrl(item.kind === "image" ? item.path : null);
  const Icon = kindIcon[item.kind];
  return (
    <button onClick={onOpen} className="glass group flex aspect-square flex-col overflow-hidden rounded-2xl text-left">
      <span className="flex min-h-0 flex-1 items-center justify-center bg-muted/40">
        {data ? <img src={data} alt={item.name} className="size-full object-cover" loading="lazy" /> : <Icon className="size-7 text-muted-foreground" />}
      </span>
      <span className="truncate px-2.5 py-2 text-xs font-medium">{item.name}</span>
    </button>
  );
}

function Viewer({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const { data, isLoading } = useMediaUrl(item.path);
  const remove = useRemoveMedia();
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/80 p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</p>
        <GlassIconButton
          label="Delete"
          onClick={async () => {
            if (confirm(`Delete ${item.name}?`)) {
              await remove.mutateAsync(item.path);
              onClose();
            }
          }}
        >
          <Trash2 className="size-4" />
        </GlassIconButton>
        <GlassIconButton label="Close" onClick={onClose}><X className="size-4" /></GlassIconButton>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center py-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data && item.kind === "image" && <img src={data} alt={item.name} className="max-h-full max-w-full rounded-2xl object-contain" />}
        {data && item.kind === "video" && <video src={data} controls className="max-h-full max-w-full rounded-2xl" />}
        {data && item.kind === "audio" && <audio src={data} controls />}
        {data && item.kind === "other" && <EmptyState icon={FileQuestion} title="No preview for this file type" />}
      </div>
    </div>
  );
}

function MediaPage() {
  const [filter, setFilter] = useState<MediaKind | "all">("all");
  const [open, setOpen] = useState<MediaItem | null>(null);
  const { data, isLoading, error, refetch } = useMedia(APP.mediaDir);
  const items = (data ?? []).filter((m) => filter === "all" || m.kind === filter);

  return (
    <AppShell title="Media">
      <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 overflow-y-auto px-4 py-6">
        <PageIntro
          title="Media"
          description={`Shared files in ${APP.mediaDir}`}
          action={<GlassIconButton label="Refresh" onClick={() => refetch()}><RotateCw className="size-4" /></GlassIconButton>}
        />
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "ghost"} className={cn("rounded-full", filter !== f.id && "glass")} onClick={() => setFilter(f.id)}>
              {f.label}
            </Button>
          ))}
        </div>
        {isLoading && <SkeletonRows count={4} />}
        {error && <EmptyState icon={ImageIcon} title="Could not open media folder" description={(error as Error).message} />}
        {data && items.length === 0 && <EmptyState icon={ImageIcon} title="Nothing here yet" description="Files the agent saves to the shared media folder show up here." />}
        {items.length > 0 && (
          <Surface className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((m) => <Thumb key={m.path} item={m} onOpen={() => setOpen(m)} />)}
          </Surface>
        )}
      </div>
      {open && <Viewer item={open} onClose={() => setOpen(null)} />}
    </AppShell>
  );
}
