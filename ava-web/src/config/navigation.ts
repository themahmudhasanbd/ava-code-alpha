import {
  Activity,
  Bot,
  CalendarClock,
  Folder,
  Globe,
  Image,
  MessageSquare,
  Monitor,
  Plug,
  Settings,
  TerminalSquare,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type AppRoute = "/" | "/models" | "/mcp" | "/files" | "/terminal" | "/system" | "/settings" | "/profile" | "/browser" | "/media" | "/tasks" | "/desktop";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  to?: AppRoute;
  soon?: boolean;
}

/** Every screen from the AvA mobile app. Items without `to` are planned next. */
export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { label: "Agent chat", icon: MessageSquare, to: "/" },
      { label: "Files", icon: Folder, to: "/files" },
      { label: "Terminal", icon: TerminalSquare, to: "/terminal" },
      { label: "Browser", icon: Globe, to: "/browser" },
      { label: "Media", icon: Image, to: "/media" },
    ],
  },
  {
    title: "Agent",
    items: [
      { label: "Models", icon: Bot, to: "/models" },
      { label: "MCP servers", icon: Plug, to: "/mcp" },
      { label: "Scheduled tasks", icon: CalendarClock, to: "/tasks" },
      { label: "Remote desktop", icon: Monitor, to: "/desktop" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", icon: UserRound, to: "/profile" },
      { label: "System health", icon: Activity, to: "/system" },
      { label: "Settings", icon: Settings, to: "/settings" },
    ],
  },
];
