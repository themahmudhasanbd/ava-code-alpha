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
  ShieldCheck,
  Terminal,
  Timer,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";
import type { MessagePart } from "@/core/types";

export interface ToolDisplayInfo {
  isMcp: boolean;
  serverName?: string;
  toolName: string;
  displayTitle: string;
  chipLabel: string;
  subtitle: string;
  icon: LucideIcon;
}

/**
 * Checks if a given tool invocation is an MCP (Model Context Protocol) tool.
 */
export function isMcpTool(toolName?: string, meta?: MessagePart["meta"]): boolean {
  if (meta?.server && meta.server !== "builtin" && meta.server !== "core" && meta.server !== "terminal") {
    return true;
  }
  const raw = (toolName || "").toLowerCase().trim();
  if (!raw) return false;

  // Core non-MCP commands
  if (
    raw === "exec_command" ||
    raw === "write_stdin" ||
    raw === "read_file" ||
    raw === "apply_patch" ||
    raw === "view_image" ||
    raw === "terminal" ||
    raw === "shell" ||
    raw === "file change" ||
    raw === "file read" ||
    raw === "web search" ||
    raw === "browser"
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
 * Parses MCP server and tool name from toolName and meta.
 */
export function parseMcpDetails(
  rawToolName?: string,
  meta?: MessagePart["meta"]
): { server: string; tool: string } {
  let server = (meta?.server || "").trim();
  let tool = (rawToolName || "").trim();

  // Strip default_api: prefix
  tool = tool.replace(/^default_api:/i, "");

  // Check for custom connector prefix e.g. mcp_custom_E8Owa--execute_command
  const customMatch = tool.match(/^mcp_custom_[a-zA-Z0-9]+--(.*)$/);
  if (customMatch && customMatch[1]) {
    tool = customMatch[1];
    if (!server || /custom/i.test(server)) {
      server = "vps";
    }
  }

  // Resolve known server strings
  const lowerServer = server.toLowerCase();
  if (lowerServer.includes("vsy0r") || lowerServer.includes("21st")) {
    server = "21st.dev";
  } else if (lowerServer.includes("e8owa") || lowerServer.includes("vps")) {
    server = "vps";
  } else if (lowerServer.includes("cpanel")) {
    server = "cpanel";
  } else if (lowerServer.includes("cloudflare") || lowerServer.includes("cf")) {
    server = "cloudflare";
  } else if (lowerServer.includes("github")) {
    server = "github";
  } else if (lowerServer.includes("mysql")) {
    server = "mysql";
  } else if (lowerServer.includes("puppeteer")) {
    server = "puppeteer";
  } else if (lowerServer.includes("memory")) {
    server = "memory";
  } else if (server.startsWith("mcp_custom_") || server.startsWith("custom_")) {
    server = "vps";
  }

  // Clean tool sub-namespaces
  if (tool.startsWith("cpanel_")) {
    server = server || "cpanel";
    tool = tool.slice("cpanel_".length);
  } else if (tool.startsWith("cf_")) {
    server = server || "cloudflare";
    tool = tool.slice("cf_".length);
  } else if (tool.startsWith("cloudflare_")) {
    server = server || "cloudflare";
    tool = tool.slice("cloudflare_".length);
  } else if (tool.startsWith("mysql_")) {
    server = server || "mysql";
    tool = tool.slice("mysql_".length);
  } else if (tool.startsWith("github_")) {
    server = server || "github";
    tool = tool.slice("github_".length);
  } else if (tool.startsWith("memory_")) {
    server = server || "memory";
    tool = tool.slice("memory_".length);
  } else if (tool.startsWith("puppeteer_puppeteer_")) {
    server = server || "puppeteer";
    tool = tool.slice("puppeteer_puppeteer_".length);
  } else if (tool.startsWith("puppeteer_")) {
    server = server || "puppeteer";
    tool = tool.slice("puppeteer_".length);
  } else if (tool.startsWith("mcp_")) {
    tool = tool.slice("mcp_".length);
  }

  // Clean trailing punctuation
  server = server.replace(/[()]/g, "").trim() || "mcp";
  tool = tool.trim() || "tool";

  return { server, tool };
}

function extractSummaryFromObject(obj: any): string {
  if (!obj || typeof obj !== "object") return "";
  if (obj.path && typeof obj.path === "string") return obj.path.split("/").pop() || obj.path;
  if (obj.file && typeof obj.file === "string") return obj.file.split("/").pop() || obj.file;
  if (obj.query && typeof obj.query === "string") return `"${obj.query.slice(0, 40)}"`;
  if (obj.pattern && typeof obj.pattern === "string") return `"${obj.pattern.slice(0, 40)}"`;
  if (obj.domain && typeof obj.domain === "string") return obj.domain;
  if (obj.table && typeof obj.table === "string") return `table: ${obj.table}`;
  if (obj.database && typeof obj.database === "string") return `db: ${obj.database}`;
  if (obj.email && typeof obj.email === "string") return obj.email;
  if (obj.url && typeof obj.url === "string") return obj.url.slice(0, 45);
  if (obj.name && typeof obj.name === "string") return obj.name;
  return "";
}

/**
 * Returns a short, clean, human-readable subtitle for tool invocations (e.g. filename, query, domain).
 * STRICT: NEVER returns raw JSON or massive command dumps.
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
    // Don't show if it's super long or looks like raw script
    if (firstLine.length > 60 || firstLine.includes("<< 'EOF'")) return "";
    return firstLine;
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
    // If it's a plain string and short, return it
    if (trimmed.length < 50 && !trimmed.includes("\n") && !trimmed.includes("{")) {
      return trimmed;
    }
    return "";
  }

  if (typeof inp === "object") {
    return extractSummaryFromObject(inp);
  }

  return "";
}

/**
 * Comprehensive tool display info:
 * Guarantees proper MCP naming (server · tool), MCP icon, and NEVER leaks raw input to title.
 */
export function getToolDisplayInfo(partOrName: MessagePart | string, meta?: MessagePart["meta"]): ToolDisplayInfo {
  const part: Partial<MessagePart> = typeof partOrName === "string"
    ? { toolName: partOrName, meta }
    : partOrName;

  const rawToolName = part.toolName || "";
  const partMeta = part.meta || meta;
  const isMcp = isMcpTool(rawToolName, partMeta);
  const subtitle = part.kind ? getToolSubtitle(part as MessagePart) : "";

  if (isMcp) {
    const { server, tool } = parseMcpDetails(rawToolName, partMeta);
    return {
      isMcp: true,
      serverName: server,
      toolName: tool,
      displayTitle: `${server} · ${tool}`,
      chipLabel: `MCP · ${server}`,
      subtitle,
      icon: Plug,
    };
  }

  // Non-MCP standard tools
  const lower = rawToolName.toLowerCase().trim();

  if (
    lower === "terminal" ||
    lower === "exec_command" ||
    lower === "commandexecution" ||
    lower === "shell" ||
    lower === "exec" ||
    lower === "bash"
  ) {
    return {
      isMcp: false,
      toolName: "Terminal",
      displayTitle: "Terminal",
      chipLabel: "Terminal",
      subtitle,
      icon: Terminal,
    };
  }

  if (
    lower === "read_file" ||
    lower === "file read" ||
    lower === "get_file_contents" ||
    lower === "get_file_content"
  ) {
    return {
      isMcp: false,
      toolName: "Read File",
      displayTitle: "Read File",
      chipLabel: "File",
      subtitle,
      icon: FileText,
    };
  }

  if (
    lower === "apply_patch" ||
    lower === "file change" ||
    lower === "filechange" ||
    lower === "edit_file"
  ) {
    return {
      isMcp: false,
      toolName: "Edit File",
      displayTitle: "Edit File",
      chipLabel: "Diff",
      subtitle,
      icon: FileEdit,
    };
  }

  if (lower === "view_image" || lower === "image") {
    return {
      isMcp: false,
      toolName: "View Image",
      displayTitle: "View Image",
      chipLabel: "Image",
      subtitle,
      icon: Image,
    };
  }

  if (
    lower.includes("browser") ||
    lower.includes("navigate") ||
    lower.includes("puppeteer")
  ) {
    return {
      isMcp: false,
      toolName: "Browser",
      displayTitle: "Browser",
      chipLabel: "Browser",
      subtitle,
      icon: Globe,
    };
  }

  // Normalized name (strips :, _, -) to handle namespaced wire formats
  // e.g. "web:run", "webrun", "web_run" all -> "webrun"
  const norm = lower.replace(/[:_\-]/g, "");

  // --- Web Search (P0 fix: was unmapped) ---
  if (norm === "webrun" || norm === "websearch") {
    return {
      isMcp: false,
      toolName: "Web Search",
      displayTitle: "Web Search",
      chipLabel: "Search",
      subtitle,
      icon: Search,
    };
  }

  // --- Tool Search (P0 fix: was wrongly titled "Web Search") ---
  if (norm === "toolsearch") {
    return {
      isMcp: false,
      toolName: "Tool Search",
      displayTitle: "Tool Search",
      chipLabel: "Search",
      subtitle,
      icon: Search,
    };
  }

  // --- Memory tools (P1) ---
  if (
    norm === "memory" ||
    norm.startsWith("memories") ||
    norm === "remember" ||
    norm === "recall"
  ) {
    const isSearch = norm.includes("search");
    return {
      isMcp: false,
      toolName: "Memory",
      displayTitle: isSearch ? "Memory Search" : "Memory",
      chipLabel: "Memory",
      subtitle,
      icon: Database,
    };
  }

  // --- Multi-agent tools (P1) ---
  if (
    norm === "spawnagent" ||
    norm === "listagents" ||
    norm === "sendmessage" ||
    norm === "closeagent" ||
    norm === "interruptagent" ||
    norm === "resumeagent" ||
    norm === "waitagent" ||
    norm === "sendinput" ||
    norm === "followuptask" ||
    norm === "spawnsubagent"
  ) {
    return {
      isMcp: false,
      toolName: "Subagent",
      displayTitle: "Subagent",
      chipLabel: "Agent",
      subtitle,
      icon: Bot,
    };
  }

  // --- Tasks / Plan (P1) ---
  if (norm === "todowrite" || norm === "updateplan" || norm === "todo") {
    return {
      isMcp: false,
      toolName: "Plan",
      displayTitle: norm === "updateplan" ? "Update Plan" : "Tasks",
      chipLabel: "Plan",
      subtitle,
      icon: ListChecks,
    };
  }

  // --- Wait / Poll / Sleep (P1) ---
  if (
    norm === "waitforenvironment" ||
    norm === "sleep" ||
    norm === "clocksleep" ||
    norm === "wait" ||
    norm === "poll"
  ) {
    return {
      isMcp: false,
      toolName: "Wait",
      displayTitle: "Wait",
      chipLabel: "Wait",
      subtitle,
      icon: Timer,
    };
  }

  // --- User input / questions (P1) ---
  if (
    norm === "requestuserinput" ||
    norm === "requestuserinputasync" ||
    norm === "askuser" ||
    norm === "askquestion"
  ) {
    return {
      isMcp: false,
      toolName: "Question",
      displayTitle: "Question",
      chipLabel: "Ask",
      subtitle,
      icon: MessageSquare,
    };
  }

  if (norm === "sendmessagetouserasync" || norm === "sendmessage") {
    return {
      isMcp: false,
      toolName: "Message",
      displayTitle: "Message",
      chipLabel: "Msg",
      subtitle,
      icon: MessageSquare,
    };
  }

  // --- Image generation (P1) ---
  if (norm === "imagegen" || norm === "imagegenerate" || norm === "generateimage") {
    return {
      isMcp: false,
      toolName: "Generate Image",
      displayTitle: "Generate Image",
      chipLabel: "Image",
      subtitle,
      icon: Image,
    };
  }

  // --- Goals (P2) ---
  if (norm === "getgoal" || norm === "creategoal" || norm === "updategoal" || norm === "goal") {
    return {
      isMcp: false,
      toolName: "Goal",
      displayTitle: "Goal",
      chipLabel: "Goal",
      subtitle,
      icon: ListChecks,
    };
  }

  // --- Context window (P2) ---
  if (norm === "getcontextremaining" || norm === "newcontextwindow" || norm === "newcontext") {
    return {
      isMcp: false,
      toolName: "Context",
      displayTitle: "Context",
      chipLabel: "Ctx",
      subtitle,
      icon: Cpu,
    };
  }

  // --- Clock / time (P2) ---
  if (norm === "currtime" || norm === "clockcurrtime" || norm === "gettime" || norm === "time") {
    return {
      isMcp: false,
      toolName: "Time",
      displayTitle: "Current Time",
      chipLabel: "Time",
      subtitle,
      icon: Clock,
    };
  }

  // --- Permissions / plugins (P2) ---
  if (
    norm === "requestpermissions" ||
    norm === "requestplugininstall" ||
    norm === "listavailablepluginstoinstall"
  ) {
    return {
      isMcp: false,
      toolName: "Permissions",
      displayTitle: "Permissions",
      chipLabel: "Perm",
      subtitle,
      icon: ShieldCheck,
    };
  }

  // --- write_stdin -> Terminal (P2) ---
  if (norm === "writestdin" || norm === "stdin") {
    return {
      isMcp: false,
      toolName: "Terminal",
      displayTitle: "Terminal",
      chipLabel: "Terminal",
      subtitle,
      icon: Terminal,
    };
  }

  // --- Generic search fallback (only for true search tools) ---
  if (lower.includes("search") || lower.includes("find")) {
    return {
      isMcp: false,
      toolName: "Search",
      displayTitle: "Search",
      chipLabel: "Search",
      subtitle,
      icon: Search,
    };
  }

  // Fallback
  return {
    isMcp: false,
    toolName: rawToolName || "Tool",
    displayTitle: rawToolName ? rawToolName.replace(/_/g, " ") : "Tool",
    chipLabel: "Tool",
    subtitle,
    icon: Wrench,
  };
}

/**
 * Backward-compatible helper for code expecting a single string title.
 */
export function displayToolName(name?: string, meta?: MessagePart["meta"]): string {
  if (!name) return "Tool";
  const info = getToolDisplayInfo(name, meta);
  return info.displayTitle;
}

/**
 * Returns the appropriate icon. For all MCP tools, returns Plug as requested.
 */
export function getToolIcon(toolName?: string, meta?: MessagePart["meta"]): LucideIcon {
  if (isMcpTool(toolName, meta)) {
    return Plug;
  }
  const info = getToolDisplayInfo(toolName || "", meta);
  return info.icon;
}
