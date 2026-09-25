import type { RpcClient } from "../rpc-client";
import type { FileEntry, FileMetadata } from "../types";

/** Joins a directory and a name into a POSIX path. */
export function joinPath(dir: string, name: string) {
  return `${dir.replace(/\/+$/, "")}/${name}`;
}

/** Parent directory of a POSIX path ("/" stays "/"). */
export function parentPath(path: string) {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  return idx <= 0 ? "/" : trimmed.slice(0, idx);
}

/** Breadcrumb segments with their absolute paths. */
export function pathCrumbs(path: string) {
  const parts = path.split("/").filter(Boolean);
  let acc = "";
  return parts.map((name) => {
    acc += `/${name}`;
    return { name, path: acc };
  });
}

interface RawEntry {
  fileName?: string;
  isDirectory?: boolean;
  isFile?: boolean;
}

export async function readDirectory(rpc: RpcClient, path: string): Promise<FileEntry[]> {
  const res = await rpc.call<{ entries?: RawEntry[] }>("fs/readDirectory", { path });
  const entries: FileEntry[] = (res.entries ?? []).map((e) => ({
    name: e.fileName ?? "",
    path: joinPath(path, e.fileName ?? ""),
    isDirectory: !!e.isDirectory,
  }));
  return entries
    .filter((e) => e.name)
    .sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name));
}

function decodeBase64(data: string) {
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function readTextFile(rpc: RpcClient, path: string): Promise<string> {
  const res = await rpc.call<{ dataBase64?: string }>("fs/readFile", { path });
  return res.dataBase64 ? decodeBase64(res.dataBase64) : "";
}

export async function getMetadata(rpc: RpcClient, path: string): Promise<FileMetadata> {
  const res = await rpc.call<{ isDirectory?: boolean; isFile?: boolean; modifiedAtMs?: number }>("fs/getMetadata", { path });
  return {
    isDirectory: !!res.isDirectory,
    isFile: !!res.isFile,
    modifiedAt: res.modifiedAtMs,
  };
}
