import {
  Activity,
  Bot,
  CalendarClock,
  Folder,
  Globe,
  Image as ImageIcon,
  MessageSquare,
  Monitor,
  Plug,
  Settings,
  Terminal as TerminalSquare,
  User as UserRound,
  type LucideIcon,
} from "lucide-react-native";

export type AppScreenName =
  | "Chat"
  | "Files"
  | "Terminal"
  | "Browser"
  | "Media"
  | "Models"
  | "Mcp"
  | "Tasks"
  | "Desktop"
  | "Profile"
  | "System"
  | "Settings";

export interface NavItem {
  label: string;
  screen: AppScreenName;
  icon: LucideIcon;
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { label: "Agent chat", icon: MessageSquare, screen: "Chat" },
      { label: "Files", icon: Folder, screen: "Files" },
      { label: "Terminal", icon: TerminalSquare, screen: "Terminal" },
      { label: "Browser", icon: Globe, screen: "Browser" },
      { label: "Media", icon: ImageIcon, screen: "Media" },
    ],
  },
  {
    title: "Agent",
    items: [
      { label: "Models", icon: Bot, screen: "Models" },
      { label: "MCP servers", icon: Plug, screen: "Mcp" },
      { label: "Scheduled tasks", icon: CalendarClock, screen: "Tasks" },
      { label: "Remote desktop", icon: Monitor, screen: "Desktop" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", icon: UserRound, screen: "Profile" },
      { label: "System health", icon: Activity, screen: "System" },
      { label: "Settings", icon: Settings, screen: "Settings" },
    ],
  },
];
