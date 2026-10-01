import type { RpcClient } from "../rpc-client";
import { readDirectory } from "./files";

export type MediaKind = "image" | "video" | "audio" | "other";

export interface MediaItem {
  name: string;
  path: string;
  kind: MediaKind;
}

const EXT: Record<string, MediaKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image",
  mp4: "video", webm: "video", mov: "video",
  mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio",
};

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4",
};

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export function mediaKind(name: string): MediaKind {
  return EXT[ext(name)] ?? "other";
}

/** Lists files in the shared media folder, including one level of subfolders. */
export async function listMedia(rpc: RpcClient, dir: string): Promise<MediaItem[]> {
  const entries = await readDirectory(rpc, dir);
  const nested = await Promise.all(
    entries.filter((e) => e.isDirectory).map((d) => readDirectory(rpc, d.path).catch(() => [])),
  );
  return [...entries, ...nested.flat()]
    .filter((e) => !e.isDirectory)
    .map((e) => ({ name: e.name, path: e.path, kind: mediaKind(e.name) }));
}

/** Reads a media file and returns a data URL for previewing it. */
export async function readMediaUrl(rpc: RpcClient, path: string): Promise<string> {
  const res = await rpc.call<{ dataBase64?: string }>("fs/readFile", { path });
  return `data:${MIME[ext(path)] ?? "application/octet-stream"};base64,${res.dataBase64 ?? ""}`;
}

export const removeMedia = (rpc: RpcClient, path: string) => rpc.call("fs/remove", { path });
