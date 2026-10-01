import React, { useEffect, useState } from "react";
import { Image as RNImage } from "react-native";
import {
  File as FileIcon,
  FileAudio,
  FileCode,
  FileQuestion,
  FileText,
  FileVideo,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react-native";
import { useAva } from "@/state/ava-provider";
import { useTheme } from "@/theme/colors";
import type { ColorTokens } from "@/theme/palette";

export interface ServerSelectedMedia {
  id: string;
  name: string;
  remotePath: string;
  kind: "image" | "video" | "audio" | "document" | "code" | "file";
  size?: number;
}

export interface PreviewItem {
  name: string;
  path: string;
  kind: ServerSelectedMedia["kind"];
}

export type MediaFilterCategory = "all" | "images" | "media" | "docs" | "code";
export type ViewMode = "list" | "grid";

const EXT_TO_KIND: Record<string, ServerSelectedMedia["kind"]> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  ico: "image",
  mp4: "video",
  mov: "video",
  webm: "video",
  mkv: "video",
  avi: "video",
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  m4a: "audio",
  flac: "audio",
  aac: "audio",
  ts: "code",
  tsx: "code",
  js: "code",
  jsx: "code",
  py: "code",
  rs: "code",
  json: "code",
  html: "code",
  css: "code",
  sh: "code",
  bash: "code",
  yaml: "code",
  yml: "code",
  sql: "code",
  php: "code",
  dart: "code",
  toml: "code",
  pdf: "document",
  txt: "document",
  md: "document",
  doc: "document",
  docx: "document",
  csv: "document",
  xlsx: "document",
  zip: "file",
  tar: "file",
  gz: "file",
};

export function getFileKind(fileName: string): ServerSelectedMedia["kind"] {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return EXT_TO_KIND[ext] || "file";
}

export function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

export function getKindColor(
  kind: ServerSelectedMedia["kind"],
  colors: ColorTokens,
): string {
  // Matches the kindColor mapping established in MediaPreviewOverlay (run #19):
  // image -> primary, video -> mascot, audio -> warning,
  // document -> destructive, code + generic files -> accentForeground.
  switch (kind) {
    case "image":
      return colors.primary;
    case "video":
      return colors.mascot;
    case "audio":
      return colors.warning;
    case "code":
      return colors.accentForeground;
    case "document":
      return colors.destructive;
    default:
      return colors.accentForeground;
  }
}

export function getKindIcon(kind: ServerSelectedMedia["kind"]): LucideIcon {
  switch (kind) {
    case "image":
      return ImageIcon;
    case "video":
      return FileVideo;
    case "audio":
      return FileAudio;
    case "code":
      return FileCode;
    case "document":
      return FileText;
    default:
      return FileQuestion;
  }
}

/** Extensions that render as a bitmap image preview (SVG excluded: RN Image can't render it). */
export const IMAGE_PREVIEW_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "ico"];

/** Extensions that render as a text/code preview. */
export const TEXT_PREVIEW_EXTS = [
  "txt", "md", "json", "ts", "tsx", "js", "jsx", "py", "rs", "html",
  "css", "sh", "yaml", "yml", "log", "sql", "env", "toml", "bash", "php", "dart",
];

/** Files larger than this are not loaded into memory for preview. */
export const PREVIEW_MAX_BYTES = 10 * 1024 * 1024;

export function formatFileSize(bytes?: number | null): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

/**
 * Decode base64 file content as UTF-8 text for preview.
 * Returns { binary: true } when the content looks binary (null bytes or a
 * high ratio of U+FFFD replacement characters), so callers never show raw
 * base64 to the user.
 */
export function decodePreviewText(dataBase64: string): { text: string } | { binary: true } {
  try {
    const binaryStr = atob(dataBase64);
    const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
    const sampleLen = Math.min(bytes.length, 8192);
    for (let i = 0; i < sampleLen; i++) {
      if (bytes[i] === 0) return { binary: true };
    }
    const text = new TextDecoder().decode(bytes);
    let bad = 0;
    const checkLen = Math.min(text.length, 4096);
    for (let i = 0; i < checkLen; i++) {
      if (text.charCodeAt(i) === 0xfffd) bad++;
    }
    if (checkLen > 0 && bad / checkLen > 0.05) return { binary: true };
    return { text };
  } catch {
    return { binary: true };
  }
}

// In-memory LRU cache for loaded image thumbnails (bounded to avoid leaks)
const THUMBNAIL_CACHE_MAX = 50;
const imageThumbnailCache = new Map<string, string>();

export function getCachedThumbnail(path: string): string | null {
  const uri = imageThumbnailCache.get(path);
  if (uri) {
    // Refresh recency
    imageThumbnailCache.delete(path);
    imageThumbnailCache.set(path, uri);
  }
  return uri ?? null;
}

export function cacheThumbnail(path: string, uri: string): void {
  if (imageThumbnailCache.has(path)) imageThumbnailCache.delete(path);
  imageThumbnailCache.set(path, uri);
  while (imageThumbnailCache.size > THUMBNAIL_CACHE_MAX) {
    const oldest = imageThumbnailCache.keys().next();
    if (oldest.done) break;
    imageThumbnailCache.delete(oldest.value);
  }
}

/** Lazy thumbnail loader for images (SVG excluded — shown as an icon instead). */
export function LazyImageThumbnail({
  filePath,
  fileName,
  size = 48,
}: {
  filePath: string;
  fileName: string;
  size?: number;
}) {
  const { rpc } = useAva();
  const { colors } = useTheme();
  const [base64Uri, setBase64Uri] = useState<string | null>(() => getCachedThumbnail(filePath));

  useEffect(() => {
    let isMounted = true;
    if (base64Uri) return;

    const ext = getFileExtension(fileName);
    if (!IMAGE_PREVIEW_EXTS.includes(ext)) {
      return;
    }

    if (rpc && rpc.status === "online") {
      rpc
        .call<{ dataBase64?: string }>("fs/readFile", { path: filePath })
        .then((res) => {
          if (isMounted && res.dataBase64) {
            const mime = `image/${ext === "jpg" ? "jpeg" : ext}`;
            const uri = `data:${mime};base64,${res.dataBase64}`;
            cacheThumbnail(filePath, uri);
            setBase64Uri(uri);
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [filePath, fileName, rpc, base64Uri]);

  if (base64Uri) {
    return (
      <RNImage
        source={{ uri: base64Uri }}
        style={{ width: size, height: size, borderRadius: 8 }}
        resizeMode="cover"
      />
    );
  }

  return <ImageIcon size={size * 0.55} color={colors.success} />;
}
