import { useEffect, useState } from "react";
import { Download, FileAudio, FileQuestion, FileVideo, Image as ImageIcon, X } from "lucide-react";

import { mediaKind, type MediaKind } from "@/core/api/media";
import { useMediaUrl } from "@/state/queries";
import { cn } from "@/lib/utils";

export interface AttachmentRef {
  name: string;
  path: string;
}

export type TextSegment = { kind: "text"; text: string } | { kind: "attachment"; name: string; path: string };

const baseName = (p: string) => p.split("/").pop() || p;

/**
 * Matches `[Attachment: name (/path/to/file)]` lines (composer format) and
 * markdown images with local (non-http) sources: `![alt](/path/to/file)`.
 * Remote http(s)/data:/blob: images are left for the markdown renderer.
 */
const REF_RE =
  /\[Attachment:\s*([\s\S]+?)\s*\((\/[\s\S]+?)\)\]|!\[([^\]\n]*)\]\(\s*(?!https?:\/\/|data:|blob:)([^)]+?)\s*\)/g;

export function splitAttachmentSegments(text: string): TextSegment[] {
  const out: TextSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(REF_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ kind: "text", text: text.slice(last, idx) });
    if (m[1] !== undefined) {
      const path = m[2]!.trim();
      out.push({ kind: "attachment", name: m[1]!.trim() || baseName(path), path });
    } else {
      const path = (m[4] ?? "").trim();
      out.push({ kind: "attachment", name: (m[3] ?? "").trim() || baseName(path), path });
    }
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

const kindIcon: Record<MediaKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: FileVideo,
  audio: FileAudio,
  other: FileQuestion,
};

function Lightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      <img
        src={src}
        alt={name}
        className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="absolute bottom-4 left-1/2 max-w-[90vw] -translate-x-1/2 truncate text-xs text-white/70">{name}</p>
    </div>
  );
}

/** Renders one `[Attachment: name (path)]` reference as an image / video / audio / file card. */
export function AttachmentCard({ name, path }: AttachmentRef) {
  const { data, isLoading, isError } = useMediaUrl(path);
  const [zoom, setZoom] = useState(false);
  const kind = mediaKind(name);

  if (isLoading) {
    return (
      <div className={cn("my-2 w-64 max-w-full overflow-hidden rounded-xl ring-1 ring-foreground/10", kind === "audio" ? "h-16" : "h-44")}>
        <div className="size-full animate-pulse bg-foreground/10" />
      </div>
    );
  }

  if (isError || !data) {
    const Icon = kindIcon[kind];
    return (
      <div className="my-2 flex max-w-full items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1 ring-foreground/10">
        <Icon className="size-5 shrink-0 opacity-60" />
        <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
        <span className="shrink-0 text-xs opacity-50">preview unavailable</span>
      </div>
    );
  }

  if (kind === "image") {
    return (
      <>
        <button
          type="button"
          onClick={() => setZoom(true)}
          title={`${name} — click to enlarge`}
          className="group my-2 block max-w-full cursor-zoom-in overflow-hidden rounded-xl ring-1 ring-foreground/10"
        >
          <img
            src={data}
            alt={name}
            loading="lazy"
            className="max-h-80 w-auto max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.01]"
          />
        </button>
        {zoom && <Lightbox src={data} name={name} onClose={() => setZoom(false)} />}
      </>
    );
  }

  if (kind === "video") {
    return (
      <video src={data} controls preload="metadata" className="my-2 max-h-80 w-full max-w-lg rounded-xl bg-black ring-1 ring-foreground/10" />
    );
  }

  if (kind === "audio") {
    return (
      <div className="my-2 flex w-full max-w-md items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-foreground/10">
        <FileAudio className="size-5 shrink-0 opacity-60" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{name}</p>
          <audio src={data} controls preload="metadata" className="mt-1 h-8 w-full" />
        </div>
      </div>
    );
  }

  return (
    <a
      href={data}
      download={name}
      className="group my-2 flex max-w-full items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1 ring-foreground/10 transition-colors hover:bg-foreground/5"
    >
      <FileQuestion className="size-5 shrink-0 opacity-60" />
      <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
      <Download className="size-4 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
