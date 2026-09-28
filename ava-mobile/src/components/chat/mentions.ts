import {
  Brain,
  Code2,
  Cpu,
  Database,
  Eye,
  FileCode,
  FileQuestion,
  FileText,
  FileVideo,
  Folder,
  FolderGit2,
  FolderOpen,
  GitBranch,
  GitCommit,
  Globe,
  Image as ImageIcon,
  Plug,
  Server,
  type LucideIcon,
} from "lucide-react-native";
import type { FileEntry } from "@/core/types";

export interface MentionItem {
  id: string;
  name: string;
  insertText: string;
  description: string;
  category: "file" | "folder" | "mcp" | "context";
  icon: LucideIcon;
  isDirectory?: boolean;
  relativePath?: string;
}

export const STATIC_CONTEXT_MENTIONS: MentionItem[] = [
  {
    id: "git",
    name: "git",
    insertText: "@git",
    description: "Current git branch, commit status & uncommitted changes",
    category: "context",
    icon: GitBranch,
  },
  {
    id: "diff",
    name: "diff",
    insertText: "@diff",
    description: "Full git diff across workspace files",
    category: "context",
    icon: GitCommit,
  },
  {
    id: "workspace",
    name: "workspace",
    insertText: "@workspace",
    description: "Current workspace root & active project tree",
    category: "context",
    icon: FolderGit2,
  },
  {
    id: "diagnostics",
    name: "diagnostics",
    insertText: "@diagnostics",
    description: "Server CPU, resident memory & system health",
    category: "context",
    icon: Cpu,
  },
  {
    id: "memory",
    name: "memory",
    insertText: "@memory",
    description: "Persistent project memory & architectural context",
    category: "mcp",
    icon: Brain,
  },
  {
    id: "cloudflare",
    name: "cloudflare",
    insertText: "@cloudflare",
    description: "Cloudflare DNS, zones, cache & security tools",
    category: "mcp",
    icon: Globe,
  },
  {
    id: "cpanel",
    name: "cpanel",
    insertText: "@cpanel",
    description: "cPanel hosting, domains & server tools",
    category: "mcp",
    icon: Server,
  },
  {
    id: "mysql",
    name: "mysql",
    insertText: "@mysql",
    description: "VPS MySQL database schema & query execution",
    category: "mcp",
    icon: Database,
  },
  {
    id: "github",
    name: "github",
    insertText: "@github",
    description: "GitHub repositories, issues, branches & PRs",
    category: "mcp",
    icon: Code2,
  },
  {
    id: "puppeteer",
    name: "puppeteer",
    insertText: "@puppeteer",
    description: "Headless browser automation & screenshots",
    category: "mcp",
    icon: Eye,
  },
];

export function getFileMentionIcon(fileName: string, isDirectory: boolean): LucideIcon {
  if (isDirectory) return Folder;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["ts", "tsx", "js", "jsx", "py", "rs", "json", "html", "css", "sh", "yaml", "yml", "sql"].includes(ext)) {
    return FileCode;
  }
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
    return ImageIcon;
  }
  if (["mp4", "mov", "webm", "mkv"].includes(ext)) {
    return FileVideo;
  }
  if (["md", "txt", "doc", "pdf"].includes(ext)) {
    return FileText;
  }
  return FileQuestion;
}

/**
 * Parses user mention query into target directory path and file search query.
 * Example:
 *  "src/comp" -> { subDir: "src", searchPrefix: "comp", relativeBase: "src/" }
 *  "components/" -> { subDir: "components", searchPrefix: "", relativeBase: "components/" }
 *  "app" -> { subDir: "", searchPrefix: "app", relativeBase: "" }
 */
export function parseMentionQuery(query: string) {
  const trimmed = query.trim();
  const lastSlashIndex = trimmed.lastIndexOf("/");

  if (lastSlashIndex !== -1) {
    const subDir = trimmed.slice(0, lastSlashIndex);
    const searchPrefix = trimmed.slice(lastSlashIndex + 1).toLowerCase();
    const relativeBase = subDir ? `${subDir}/` : "";
    return { subDir, searchPrefix, relativeBase };
  }

  return { subDir: "", searchPrefix: trimmed.toLowerCase(), relativeBase: "" };
}

/**
 * Transforms workspace file entries into mention items.
 */
export function buildFileMentions(
  entries: FileEntry[],
  relativeBase: string,
  searchPrefix: string
): MentionItem[] {
  const filtered = entries.filter((e) => {
    if (!searchPrefix) return true;
    return e.name.toLowerCase().includes(searchPrefix);
  });

  return filtered.map((entry) => {
    const relPath = `${relativeBase}${entry.name}`;
    const insertText = entry.isDirectory ? `@${relPath}/` : `@${relPath} `;
    const icon = getFileMentionIcon(entry.name, entry.isDirectory);

    return {
      id: `file_${entry.path}`,
      name: entry.name,
      insertText,
      description: relPath + (entry.isDirectory ? " (directory)" : ""),
      category: entry.isDirectory ? "folder" : "file",
      icon,
      isDirectory: entry.isDirectory,
      relativePath: relPath,
    };
  });
}
