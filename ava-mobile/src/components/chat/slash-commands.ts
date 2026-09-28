import {
  Code2,
  FileSearch,
  GitCommit,
  HelpCircle,
  ListTodo,
  Minimize2,
  Radio,
  Sparkles,
  Terminal as TerminalSquare,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";

export interface SlashCommandItem {
  command: string;
  label: string;
  description: string;
  category: "workflow" | "analysis" | "testing";
  icon: LucideIcon;
}

export const MOBILE_SLASH_COMMANDS: SlashCommandItem[] = [
  {
    command: "plan",
    label: "/plan",
    description: "Switch to autonomous Plan & Architect mode",
    category: "workflow",
    icon: ListTodo,
  },
  {
    command: "diff",
    label: "/diff",
    description: "Inspect git diff & modified workspace files",
    category: "workflow",
    icon: GitCommit,
  },
  {
    command: "review",
    label: "/review",
    description: "Review current changes and find potential bugs",
    category: "workflow",
    icon: Code2,
  },
  {
    command: "compact",
    label: "/compact",
    description: "Summarize conversation to free up context window",
    category: "workflow",
    icon: Minimize2,
  },
  {
    command: "fix",
    label: "/fix",
    description: "Diagnose errors and apply automated fix",
    category: "workflow",
    icon: Sparkles,
  },
  {
    command: "test",
    label: "/test",
    description: "Run automated tests & investigate failures",
    category: "testing",
    icon: TerminalSquare,
  },
  {
    command: "explain",
    label: "/explain",
    description: "Provide in-depth architectural explanation",
    category: "analysis",
    icon: HelpCircle,
  },
  {
    command: "status",
    label: "/status",
    description: "Show session token usage & system health",
    category: "analysis",
    icon: Radio,
  },
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return MOBILE_SLASH_COMMANDS;
  return MOBILE_SLASH_COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
  );
}
