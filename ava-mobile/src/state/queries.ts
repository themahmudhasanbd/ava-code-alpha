import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listMcpServers, listModels, reloadMcpServers } from "@/core/api/catalog";
import { getMetadata, readDirectory, readTextFile } from "@/core/api/files";
import { deleteSession, listSessions, readSession, renameSession, startSession } from "@/core/api/sessions";
import { readDiagnostics, readServerConfig } from "@/core/api/system";
import { runCommand } from "@/core/api/terminal";
import { useAva } from "./ava-provider";

export const keys = {
  sessions: ["sessions"] as const,
  session: (id: string) => ["session", id] as const,
  models: ["models"] as const,
  mcp: ["mcp"] as const,
  dir: (path: string) => ["dir", path] as const,
  file: (path: string) => ["file", path] as const,
  diagnostics: ["diagnostics"] as const,
  serverConfig: ["server-config"] as const,
};

export function useDirectory(path: string) {
  const { rpc, status } = useAva();
  return useQuery({ queryKey: keys.dir(path), queryFn: () => readDirectory(rpc!, path), enabled: !!rpc && status === "online" });
}

export function useFileContent(path: string | null) {
  const { rpc, status } = useAva();
  return useQuery({
    queryKey: keys.file(path ?? ""),
    queryFn: async () => ({ text: await readTextFile(rpc!, path!), meta: await getMetadata(rpc!, path!) }),
    enabled: !!rpc && !!path && status === "online",
  });
}

export function useRunCommand() {
  const { rpc } = useAva();
  return useMutation({ mutationFn: (v: { command: string; cwd: string }) => runCommand(rpc!, v.command, v.cwd) });
}

export function useDiagnostics() {
  const { rpc, status } = useAva();
  return useQuery({
    queryKey: keys.diagnostics,
    queryFn: () => readDiagnostics(rpc!),
    enabled: !!rpc && status === "online",
    refetchInterval: 10_000,
  });
}

export function useServerConfig() {
  const { rpc, status } = useAva();
  return useQuery({ queryKey: keys.serverConfig, queryFn: () => readServerConfig(rpc!), enabled: !!rpc && status === "online" });
}

export function useSessions() {
  const { rpc, status } = useAva();
  return useQuery({
    queryKey: keys.sessions,
    queryFn: () => listSessions(rpc!),
    enabled: !!rpc && status === "online",
    refetchInterval: status === "online" ? 3000 : false,
  });
}

export function useSessionHistory(id: string | null) {
  const { rpc, status } = useAva();
  return useQuery({
    queryKey: keys.session(id ?? ""),
    queryFn: () => readSession(rpc!, id!),
    enabled: !!rpc && !!id && status === "online",
    // Live streaming is handled directly by chatStore via WebSocket RPC.
    // Relaxed periodic sync (15s) avoids aggressive 1.5s polling while keeping state fresh.
    refetchInterval: status === "online" ? 15000 : false,
  });
}

export function useModels() {
  const { rpc, status } = useAva();
  return useQuery({ queryKey: keys.models, queryFn: () => listModels(rpc!), enabled: !!rpc && status === "online", staleTime: 300_000 });
}

export function useMcpServers() {
  const { rpc, status } = useAva();
  return useQuery({ queryKey: keys.mcp, queryFn: () => listMcpServers(rpc!), enabled: !!rpc && status === "online" });
}

export function useReloadMcp() {
  const { rpc } = useAva();
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => reloadMcpServers(rpc!), onSuccess: () => qc.invalidateQueries({ queryKey: keys.mcp }) });
}

export function useStartSession() {
  const { rpc, modelId } = useAva();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cwd: string) => startSession(rpc!, { cwd, ...(modelId ? { model: modelId } : {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.sessions }),
  });
}

export function useDeleteSession() {
  const { rpc } = useAva();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => deleteSession(rpc!, id), onSuccess: () => qc.invalidateQueries({ queryKey: keys.sessions }) });
}

export function useRenameSession() {
  const { rpc } = useAva();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; name: string }) => renameSession(rpc!, v.id, v.name),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.sessions }),
  });
}

// ---- Media, schedules, desktop -------------------------------------------
import { listMedia, readMediaUrl, removeMedia } from "@/core/api/media";
import { deleteTask, listTasks, runTaskNow, saveTask, type ScheduledTask } from "@/core/api/schedule";
import { captureScreen, readDesktopStatus, sendDesktopInput } from "@/core/api/desktop";

export function useMedia(dir: string) {
  const { rpc, status } = useAva();
  return useQuery({ queryKey: ["media", dir], queryFn: () => listMedia(rpc!, dir), enabled: !!rpc && status === "online" });
}

export function useMediaUrl(path: string | null) {
  const { rpc, status } = useAva();
  return useQuery({ queryKey: ["media-url", path], queryFn: () => readMediaUrl(rpc!, path!), enabled: !!rpc && !!path && status === "online", staleTime: Infinity });
}

export function useRemoveMedia() {
  const { rpc } = useAva();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (path: string) => removeMedia(rpc!, path), onSuccess: () => qc.invalidateQueries({ queryKey: ["media"] }) });
}

export function useTasks() {
  const { rpc, status } = useAva();
  return useQuery({ queryKey: ["tasks"], queryFn: () => listTasks(rpc!), enabled: !!rpc && status === "online" });
}

export function useSaveTask() {
  const { rpc } = useAva();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (t: Omit<ScheduledTask, "id"> & { id?: string }) => saveTask(rpc!, t), onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }) });
}

export function useDeleteTask() {
  const { rpc } = useAva();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => deleteTask(rpc!, id), onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }) });
}

export function useRunTask() {
  const { rpc } = useAva();
  return useMutation({ mutationFn: (t: ScheduledTask) => runTaskNow(rpc!, t) });
}

export function useDesktopStatus() {
  const { rpc, status } = useAva();
  return useQuery({ queryKey: ["desktop"], queryFn: () => readDesktopStatus(rpc!), enabled: !!rpc && status === "online" });
}

export function useCaptureScreen() {
  const { rpc } = useAva();
  return useMutation({ mutationFn: (v: { display: string; width: number; height: number }) => captureScreen(rpc!, v.display, v.width, v.height) });
}

export function useDesktopInput() {
  const { rpc } = useAva();
  return useMutation({ mutationFn: (v: { display: string; input: Parameters<typeof sendDesktopInput>[2] }) => sendDesktopInput(rpc!, v.display, v.input) });
}
