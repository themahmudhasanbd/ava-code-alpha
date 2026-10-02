export type ConnectionStatus = "offline" | "connecting" | "online";

export interface Session {
  id: string;
  title: string;
  directory: string;
  model?: string | undefined;
  updatedAt?: number | undefined;
}

export type PartKind = "text" | "reasoning" | "tool" | "plan" | "notice" | "question";

export interface PlanStep {
  text: string;
  status: "pending" | "active" | "done" | "cancelled";
}

export interface AgentQuestion {
  id?: string | undefined;
  title: string;
  options?: string[] | undefined;
  requestId?: number | string | undefined;
  /** RPC method for server-initiated approval/elicitation requests (e.g. "item/commandExecution/requestApproval"). */
  method?: string | undefined;
  /** Raw server params for the request (used to build approval responses). */
  params?: unknown;
  /** Set when the question was answered via the sticky approval card. */
  answered?: boolean | undefined;
}

/** One selectable option of an elicitation form field. */
export interface ElicitationFieldOption {
  label: string;
  /** Value sent back to the server (string for enums, boolean for booleans). */
  value: string | boolean;
}

/**
 * One input field of an MCP elicitation form (mcpServer/elicitation/request,
 * form mode). Mirrors the desktop TUI's form-field model: text inputs for
 * strings, selects for enums/booleans, required validation before submit.
 */
export interface ElicitationField {
  id: string;
  label: string;
  description?: string | undefined;
  required: boolean;
  kind: "text" | "select";
  /** Render as a password input (e.g. string format "password"). */
  secret?: boolean | undefined;
  options?: ElicitationFieldOption[] | undefined;
  /** Preselected option value / prefilled text from the schema default. */
  defaultValue?: string | boolean | undefined;
}

/** A pending server approval shown as a sticky card above the composer. */
export interface PendingApproval {
  id: string;
  method: string;
  title: string;
  detail?: string | undefined;
  params?: unknown;
  requestId?: number | string | undefined;
  /**
   * Parsed elicitation form fields (mcpServer/elicitation/request, form mode).
   * When present and non-empty the card renders the fillable form (submit /
   * dismiss) instead of the plain Allow/Deny buttons.
   */
  form?: ElicitationField[] | undefined;
}

export interface QueuedPrompt {
  id: string;
  text: string;
  createdAt?: number | undefined;
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
  questions?: AgentQuestion[] | undefined;
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
