export type ConnectionStatus = "offline" | "connecting" | "online";

export interface Session {
  id: string;
  title: string;
  directory: string;
  model?: string | undefined;
  updatedAt?: number | undefined;
}

export type PartKind = "text" | "reasoning" | "tool" | "plan" | "notice";

export interface PlanStep {
  text: string;
  status: "pending" | "active" | "done";
}

export interface PartMeta {
  command?: string | undefined;
  cwd?: string | undefined;
  exitCode?: number | undefined;
  durationMs?: number | undefined;
  server?: string | undefined;
  files?: { path: string; kind: string }[] | undefined;
  steps?: PlanStep[] | undefined;
  tone?: "info" | "warning" | "error" | undefined;
}

export interface MessagePart {
  id: string;
  kind: PartKind;
  text: string;
  toolName?: string | undefined;
  input?: unknown | undefined;
  output?: string | undefined;
  status: "running" | "done" | "error";
  meta?: PartMeta | undefined;
}

export interface TurnStats {
  startedAt?: number | undefined;
  durationMs?: number | undefined;
  totalTokens?: number | undefined;
  outputTokens?: number | undefined;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  stats?: TurnStats | undefined;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string | undefined;
  provider?: string | undefined;
  supportsImages: boolean;
  reasoningEfforts: string[];
  isDefault?: boolean | undefined;
}

export interface McpTool {
  name: string;
  description: string;
}

export interface McpServer {
  name: string;
  status: string;
  tools: McpTool[];
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface FileMetadata {
  isDirectory: boolean;
  isFile: boolean;
  modifiedAt?: number | undefined;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ServerGauge {
  name: string;
  value: number;
}

export interface ServerDiagnostics {
  processId?: number | undefined;
  memoryBytes?: number | undefined;
  gauges: ServerGauge[];
}

export interface ServerConfig {
  model?: string | undefined;
  provider?: string | undefined;
  reasoningEffort?: string | undefined;
  approvalPolicy?: string | undefined;
  sandboxMode?: string | undefined;
  contextWindow?: number | undefined;
}
