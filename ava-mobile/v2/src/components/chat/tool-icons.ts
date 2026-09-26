import {
  Activity,
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
  Image,
  ListChecks,
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
 * Clean and format backend tool names by stripping internal prefixes (e.g. vps_, mcp_, default_api:).
 */
export function displayToolName(name?: string): string {
  if (!name) return "Tool";
  let cleaned = name.trim();

  // Strip default_api:, mcp_, vps_, etc.
  cleaned = cleaned.replace(/^default_api:/i, "");
  cleaned = cleaned.replace(/^(?:vps|mcp)[_:\s-]+/i, "");
  cleaned = cleaned.replace(/^cf_/i, "cloudflare_");
  cleaned = cleaned.replace(/^cpanel_/i, "cpanel: ");
  cleaned = cleaned.replace(/^cloudflare_/i, "cloudflare: ");
  cleaned = cleaned.replace(/^github_/i, "github: ");
  cleaned = cleaned.replace(/^mysql_/i, "mysql: ");
  cleaned = cleaned.replace(/^mail_/i, "mail: ");
  cleaned = cleaned.replace(/^memory_/i, "memory: ");

  // Convert snake_case to Title Case words
  if (!cleaned.includes(" ")) {
    cleaned = cleaned
      .split("_")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Handle prefix styling like "Cpanel: List Files" -> "cPanel · List Files"
  cleaned = cleaned
    .replace(/^Cpanel:\s*/i, "cPanel · ")
    .replace(/^Cloudflare:\s*/i, "Cloudflare · ")
    .replace(/^Github:\s*/i, "GitHub · ")
    .replace(/^Mysql:\s*/i, "MySQL · ")
    .replace(/^Mail:\s*/i, "Mail · ")
    .replace(/^Memory:\s*/i, "Memory · ");

  if (cleaned.toLowerCase() === "exec command" || cleaned.toLowerCase() === "execute command") {
    return "Terminal Command";
  }

  return cleaned || "Tool";
}

export function getToolIcon(toolName?: string, meta?: MessagePart["meta"]): LucideIcon {
  if (meta?.server && meta.server !== "builtin" && meta.server !== "core") {
    const s = meta.server.toLowerCase();
    if (s.includes("mysql") || s.includes("db") || s.includes("postgres")) return Database;
    if (s.includes("git") || s.includes("github")) return GitBranch;
    if (s.includes("cpanel") || s.includes("vps") || s.includes("server")) return Server;
  }

  if (!toolName) return Wrench;
  const name = displayToolName(toolName).toLowerCase().trim();

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
    name.includes("grep") ||
    name.includes("search code") ||
    name.includes("find")
  ) {
    return FolderSearch;
  }

  // Images & Media
  if (name.includes("image") || name.includes("screenshot") || name === "view_image") {
    return Image;
  }

  // Web search & browser / Puppeteer
  if (
    name === "web search" ||
    name === "web_search" ||
    name.includes("fetch_web") ||
    name.includes("puppeteer") ||
    name.includes("browse") ||
    name.includes("navigate") ||
    name.includes("url")
  ) {
    return Globe;
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
    name.includes("memory") ||
    name.includes("cpu")
  ) {
    return Cpu;
  }

  // Time & Delays
  if (name.includes("time") || name.includes("sleep") || name.includes("wait")) {
    return Timer;
  }

  // MCP generic tools
  if (name.includes("mcp") || meta?.server) {
    return Plug;
  }

  // Default fallback
  return Wrench;
}
