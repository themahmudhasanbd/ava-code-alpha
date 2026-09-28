import {
  Code2,
  Cpu,
  GitCommit,
  ListTodo,
  Minimize2,
  PlusCircle,
  Radio,
  ShieldCheck,
  Square,
  Trash2,
  type LucideIcon,
} from "lucide-react-native";

export interface SlashCommandItem {
  command: string;
  label: string;
  description: string;
  category: "model" | "session" | "workflow" | "security";
  icon: LucideIcon;
  action?: "direct" | "panel";
  target?: string;
}

export const MOBILE_SLASH_COMMANDS: SlashCommandItem[] = [
  {
    command: "model",
    label: "/model",
    description: "Switch AI model & thinking depth",
    category: "model",
    icon: Cpu,
    action: "panel",
    target: "model",
  },
  {
    command: "new",
    label: "/new",
    description: "Start a fresh chat session",
    category: "session",
    icon: PlusCircle,
    action: "direct",
    target: "new",
  },
  {
    command: "clear",
    label: "/clear",
    description: "Clear current chat messages",
    category: "session",
    icon: Trash2,
    action: "direct",
    target: "clear",
  },
  {
    command: "compact",
    label: "/compact",
    description: "Summarize & optimize context window",
    category: "session",
    icon: Minimize2,
  },
  {
    command: "stop",
    label: "/stop",
    description: "Stop running agent immediately",
    category: "session",
    icon: Square,
    action: "direct",
    target: "stop",
  },
  {
    command: "sandbox",
    label: "/sandbox",
    description: "Change execution security level",
    category: "security",
    icon: ShieldCheck,
    action: "panel",
    target: "sandbox",
  },
  {
    command: "plan",
    label: "/plan",
    description: "Switch to Architect & Planning mode",
    category: "workflow",
    icon: ListTodo,
  },
  {
    command: "diff",
    label: "/diff",
    description: "Inspect git diff & modified files",
    category: "workflow",
    icon: GitCommit,
  },
  {
    command: "review",
    label: "/review",
    description: "Code review & vulnerability scan",
    category: "workflow",
    icon: Code2,
  },
  {
    command: "status",
    label: "/status",
    description: "System & session token status",
    category: "session",
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
