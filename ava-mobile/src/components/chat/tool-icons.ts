import {
  Activity,
  AlertCircle,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Code2,
  Compass,
  Cpu,
  Database,
  FileCode2,
  FileEdit,
  FilePlus,
  FileSearch,
  FileText,
  FolderOpen,
  FolderSearch,
  FolderTree,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Globe,
  HardDrive,
  Image,
  ListChecks,
  Mail,
  MessageSquare,
  PlayCircle,
  Plug,
  RefreshCw,
  Search,
  Server,
  Terminal,
  Timer,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";
import type { MessagePart } from "@/core/types";

/**
 * Checks if a given tool invocation is an MCP (Model Context Protocol) tool.
 */
export function isMcpTool(toolName?: string, meta?: MessagePart["meta"]): boolean {
  if (!toolName && !meta?.server) return false;
  if (meta?.server && meta.server !== "builtin" && meta.server !== "core" && meta.server !== "terminal") {
    return true;
  }
  const raw = (toolName || "").toLowerCase().trim();

  // Core non-MCP commands
  if (
    raw === "exec_command" ||
    raw === "write_stdin" ||
    raw === "read_file" ||
    raw === "apply_patch" ||
    raw === "view_image" ||
    raw === "terminal" ||
    raw === "shell"
  ) {
    return false;
  }

  return (
    raw.startsWith("mcp_") ||
    raw.startsWith("mcp-") ||
    raw.startsWith("mcp:") ||
    raw.startsWith("default_api:mcp_") ||
    raw.startsWith("default_api:") ||
    raw.startsWith("cf_") ||
    raw.startsWith("cloudflare_") ||
    raw.startsWith("cpanel_") ||
    raw.startsWith("github_") ||
    raw.startsWith("mysql_") ||
    raw.startsWith("mail_") ||
    raw.startsWith("memory_") ||
    raw.startsWith("mem_") ||
    raw.startsWith("meta_") ||
    raw.startsWith("puppeteer_") ||
    raw.includes("mcp")
  );
}

/**
 * Clean and format backend tool names by stripping internal prefixes and formatting server names.
 */
export function displayToolName(name?: string): string {
  if (!name) return "Tool";
  let cleaned = name.trim();

  // Strip default_api:, mcp_, vps_, etc.
  cleaned = cleaned.replace(/^default_api:/i, "");
  cleaned = cleaned.replace(/^mcp_puppeteer_puppeteer_/i, "puppeteer: ");
  cleaned = cleaned.replace(/^mcp_puppeteer_/i, "puppeteer: ");
  cleaned = cleaned.replace(/^(?:vps|mcp)[_:-]+/i, "");
  cleaned = cleaned.replace(/^puppeteer_puppeteer_/i, "puppeteer: ");
  cleaned = cleaned.replace(/^puppeteer_/i, "puppeteer: ");
  cleaned = cleaned.replace(/^browser_/i, "browser: ");
  cleaned = cleaned.replace(/^omniroute_web_search/i, "web search");
  cleaned = cleaned.replace(/^cf_/i, "cloudflare_");
  cleaned = cleaned.replace(/^cpanel_/i, "cpanel: ");
  cleaned = cleaned.replace(/^cloudflare_/i, "cloudflare: ");
  cleaned = cleaned.replace(/^github_/i, "github: ");
  cleaned = cleaned.replace(/^mysql_/i, "mysql: ");
  cleaned = cleaned.replace(/^mail_/i, "mail: ");
  cleaned = cleaned.replace(/^memory_/i, "memory: ");
  cleaned = cleaned.replace(/^mem_/i, "memory: ");
  cleaned = cleaned.replace(/^meta_ads_meta_/i, "meta: ");
  cleaned = cleaned.replace(/^meta_facebook_instagram_meta_/i, "meta: ");
  cleaned = cleaned.replace(/^meta_/i, "meta: ");

  // Convert snake_case to Title Case words
  if (!cleaned.includes(" ")) {
    cleaned = cleaned
      .split("_")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Handle prefix styling for nice badges
  cleaned = cleaned
    .replace(/^Cpanel:\s*/i, "cPanel · ")
    .replace(/^Cloudflare:\s*/i, "Cloudflare · ")
    .replace(/^Github:\s*/i, "GitHub · ")
    .replace(/^Mysql:\s*/i, "MySQL · ")
    .replace(/^Mail:\s*/i, "Mail · ")
    .replace(/^Memory:\s*/i, "Memory · ")
    .replace(/^Meta:\s*/i, "Meta · ")
    .replace(/^Puppeteer:\s*/i, "Puppeteer · ")
    .replace(/^Browser:\s*/i, "Browser · ");

  if (
    cleaned.toLowerCase() === "exec command" ||
    cleaned.toLowerCase() === "execute command" ||
    cleaned.toLowerCase() === "exec" ||
    cleaned.toLowerCase() === "terminal" ||
    cleaned.toLowerCase() === "shell"
  ) {
    return "Terminal";
  }

  if (
    cleaned.toLowerCase() === "read file" ||
    cleaned.toLowerCase() === "get file contents" ||
    cleaned.toLowerCase() === "get file content"
  ) {
    return "Read File";
  }

  if (cleaned.toLowerCase() === "view image") {
    return "View Image";
  }

  if (
    cleaned.toLowerCase() === "apply patch" ||
    cleaned.toLowerCase() === "file change"
  ) {
    return "File Change";
  }

  return cleaned || "Tool";
}

function extractSummaryFromObject(obj: any): string {
  if (!obj || typeof obj !== "object") return "";
  if (obj.path && typeof obj.path === "string") return obj.path.split("/").pop() || obj.path;
  if (obj.file && typeof obj.file === "string") return obj.file.split("/").pop() || obj.file;
  if (obj.query && typeof obj.query === "string") return `"${obj.query.slice(0, 45)}"`;
  if (obj.pattern && typeof obj.pattern === "string") return `"${obj.pattern.slice(0, 45)}"`;
  if (obj.domain && typeof obj.domain === "string") return obj.domain;
  if (obj.table && typeof obj.table === "string") return `table: ${obj.table}`;
  if (obj.database && typeof obj.database === "string") return `db: ${obj.database}`;
  if (obj.email && typeof obj.email === "string") return obj.email;
  if (obj.url && typeof obj.url === "string") return obj.url.slice(0, 50);
  if (obj.cmd && typeof obj.cmd === "string") {
    const firstLine = obj.cmd.trim().split("\n")[0] || obj.cmd;
    return firstLine.length > 50 ? firstLine.slice(0, 47) + "…" : firstLine;
  }
  if (obj.name && typeof obj.name === "string") return obj.name;
  return "";
}

/**
 * Returns a short, clean, human-readable subtitle for tool invocations (e.g. filename, query, domain).
 * Avoids dumping raw JSON objects or huge payloads into single-line headers.
 */
export function getToolSubtitle(part: MessagePart): string {
  if (part.meta?.files && part.meta.files.length > 0) {
    const f = part.meta.files[0];
    const path = f.path.split("/").pop() || f.path;
    return part.meta.files.length > 1 ? `${path} (+${part.meta.files.length - 1} more)` : path;
  }

  if (part.meta?.command) {
    const cmd = part.meta.command.trim();
    const firstLine = cmd.split("\n")[0] || cmd;
    return firstLine.length > 60 ? firstLine.slice(0, 57) + "…" : firstLine;
  }

  const inp = part.input;
  if (!inp) return "";

  if (typeof inp === "string") {
    const trimmed = inp.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const obj = JSON.parse(trimmed);
        return extractSummaryFromObject(obj);
      } catch {
        return "";
      }
    }
    const firstLine = trimmed.split("\n")[0] || trimmed;
    return firstLine.length > 60 ? firstLine.slice(0, 57) + "…" : firstLine;
  }

  if (typeof inp === "object") {
    return extractSummaryFromObject(inp);
  }

  return "";
}

export function getToolIcon(toolName?: string, meta?: MessagePart["meta"]): LucideIcon {
  if (meta?.server && meta.server !== "builtin" && meta.server !== "core") {
    const s = meta.server.toLowerCase();
    if (s.includes("mysql") || s.includes("db") || s.includes("postgres")) return Database;
    if (s.includes("git") || s.includes("github")) return GitBranch;
    if (s.includes("cpanel") || s.includes("vps") || s.includes("server")) return Server;
    if (s.includes("mail") || s.includes("smtp") || s.includes("postfix")) return Mail;
    if (s.includes("cloudflare") || s.includes("cf") || s.includes("dns")) return Globe;
    if (s.includes("memory") || s.includes("mem")) return Brain;
    if (s.includes("puppeteer") || s.includes("browser") || s.includes("playwright") || s.includes("web")) return Globe;
    return Plug;
  }

  if (!toolName) return Wrench;
  const raw = toolName.toLowerCase().trim();
  const name = displayToolName(toolName).toLowerCase().trim();

  // Browser, Puppeteer & Web Tools
  if (
    raw.includes("puppeteer") ||
    raw.includes("browser") ||
    raw.includes("playwright") ||
    raw.includes("navigate") ||
    raw.includes("web_search") ||
    raw.includes("omniroute_web_search") ||
    name.includes("puppeteer") ||
    name.includes("browser") ||
    name.includes("web search") ||
    name.includes("navigate") ||
    name.includes("fetch web") ||
    name.includes("browse")
  ) {
    if (raw.includes("screenshot") && !raw.includes("puppeteer") && !raw.includes("browser")) {
      return Image;
    }
    return Globe;
  }

  // MCP specific tool checks
  if (raw.includes("mysql") || name.includes("mysql")) return Database;
  if (raw.includes("cpanel") || name.includes("cpanel")) return Server;
  if (raw.includes("mail") || name.includes("mail")) return Mail;
  if (raw.includes("memory") || name.includes("memory") || raw.includes("mem_")) return Brain;
  if (raw.includes("cloudflare") || name.includes("cloudflare")) return Globe;

  // Terminal & command execution
  if (
    name === "terminal" ||
    name === "execute_command" ||
    name === "terminal command" ||
    name === "shell" ||
    name === "exec" ||
    name === "bash" ||
    name === "unified_exec" ||
    name.includes("command") ||
    name.includes("shell") ||
    name.includes("exec")
  ) {
    return Terminal;
  }

  // File patch and editing
  if (
    name === "apply_patch" ||
    name === "file change" ||
    name.includes("patch") ||
    name.includes("edit file") ||
    name.includes("replace file") ||
    name.includes("save file")
  ) {
    return FileEdit;
  }

  // File reading & inspection
  if (
    name === "read_file" ||
    name === "get_file_contents" ||
    name === "get_file_content" ||
    name.includes("read file") ||
    name.includes("file read") ||
    name.includes("cat")
  ) {
    return FileText;
  }

  // File creation & folder creation
  if (
    name === "write_file" ||
    name === "create_file" ||
    name.includes("create dir") ||
    name.includes("mkdir")
  ) {
    return FilePlus;
  }

  // File search, grep & directory listing
  if (
    name === "search_files" ||
    name === "list_directory" ||
    name === "list_files" ||
    name === "search" ||
    name.includes("grep") ||
    name.includes("search code") ||
    name.includes("find") ||
    name.includes("list files") ||
    name.includes("list dir")
  ) {
    return FolderSearch;
  }

  // Images & Media
  if (name.includes("image") || name.includes("screenshot") || name === "view_image") {
    return Image;
  }

  // Git & Version Control
  if (name.includes("git") || name.includes("pr") || name.includes("commit") || name.includes("branch")) {
    if (name.includes("pr") || name.includes("pull request")) return GitPullRequest;
    if (name.includes("commit")) return GitCommit;
    return GitBranch;
  }

  // Database / SQL / MySQL
  if (
    name.includes("mysql") ||
    name.includes("database") ||
    name.includes("sql") ||
    name.includes("query") ||
    name.includes("table")
  ) {
    return Database;
  }

  // Planning & Steps
  if (name.includes("plan") || name === "spec_plan" || name.includes("step") || name.includes("todo")) {
    return ListChecks;
  }

  // Multi-agent & subagents
  if (name.includes("agent") || name.includes("subagent") || name.includes("delegate")) {
    return Bot;
  }

  // User input / communication
  if (name.includes("user input") || name.includes("message to user") || name.includes("ask user")) {
    return MessageSquare;
  }

  // Tests & Verification
  if (name.includes("test") || name.includes("verify") || name.includes("check")) {
    return CheckCircle2;
  }

  // System & Diagnostics
  if (
    name.includes("system") ||
    name.includes("disk") ||
    name.includes("process") ||
    name.includes("cpu")
  ) {
    return Cpu;
  }

  // Time & Delays
  if (name.includes("time") || name.includes("sleep") || name.includes("wait")) {
    return Timer;
  }

  // MCP generic tools & extensions
  if (name.includes("mcp") || name.includes("extension") || meta?.server) {
    return Plug;
  }

  // Default fallback
  return Wrench;
}
