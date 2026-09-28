/**
 * Exact color palette & design tokens.
 * Light mode features a clean, soft milk tone (not yellowish cream, not harsh sterile white).
 */
export const THEME = {
  light: {
    background: "#F5F6F8",
    foreground: "#0F172A",
    card: "#FFFFFF",
    cardForeground: "#0F172A",
    popover: "#FFFFFF",
    popoverForeground: "#0F172A",
    primary: "#4F46E5",
    primaryForeground: "#FFFFFF",
    secondary: "#EEF1F6",
    secondaryForeground: "#1E293B",
    muted: "#F1F4F9",
    mutedForeground: "#64748B",
    accent: "#E2E8F0",
    accentForeground: "#0F172A",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    border: "#E2E8F0",
    input: "#E2E8F0",
    inputBg: "rgba(255, 255, 255, 0.95)",
    ring: "#6366F1",
    glassBg: "rgba(255, 255, 255, 0.90)",
    glassBorder: "rgba(226, 232, 240, 0.90)",
    glassShadow: "rgba(15, 23, 42, 0.05)",
    sidebar: "#F8FAFC",
    sidebarForeground: "#0F172A",
    sidebarPrimary: "#4F46E5",
    sidebarPrimaryForeground: "#FFFFFF",
    sidebarAccent: "#F1F5F9",
    sidebarAccentForeground: "#0F172A",
    sidebarBorder: "#E2E8F0",
    success: "#10B981",
    warning: "#F59E0B",
    glow1: "rgba(99, 102, 241, 0.15)",
    glow2: "rgba(241, 245, 249, 0.50)",
    mascot: "#6366F1",
    mascotForeground: "#FFFFFF",
    mascotRing: "rgba(99, 102, 241, 0.20)",
    codeBg: "#0B0F19",
    codeForeground: "#E2E8F0",
    codeMuted: "#94A3B8",
    codeActive: "#151E2E",
    codeBorder: "#1E293B",
  },
  dark: {
    background: "#080C16",
    foreground: "#F1F5F9",
    card: "#101626",
    cardForeground: "#F8FAFC",
    popover: "#101626",
    popoverForeground: "#F8FAFC",
    primary: "#6366F1",
    primaryForeground: "#FFFFFF",
    secondary: "#1A2234",
    secondaryForeground: "#E2E8F0",
    muted: "#151D2D",
    mutedForeground: "#94A3B8",
    accent: "#1E273C",
    accentForeground: "#F8FAFC",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    border: "rgba(255, 255, 255, 0.10)",
    input: "rgba(255, 255, 255, 0.15)",
    inputBg: "rgba(16, 22, 38, 0.75)",
    ring: "#6366F1",
    glassBg: "rgba(16, 22, 38, 0.75)",
    glassBorder: "rgba(255, 255, 255, 0.12)",
    glassShadow: "rgba(0, 0, 0, 0.45)",
    sidebar: "#0C111F",
    sidebarForeground: "#F1F5F9",
    sidebarPrimary: "#6366F1",
    sidebarPrimaryForeground: "#FFFFFF",
    sidebarAccent: "#1A2234",
    sidebarAccentForeground: "#F8FAFC",
    sidebarBorder: "rgba(255, 255, 255, 0.10)",
    success: "#22C55E",
    warning: "#F59E0B",
    glow1: "rgba(99, 102, 241, 0.22)",
    glow2: "rgba(56, 189, 248, 0.15)",
    mascot: "#818CF8",
    mascotForeground: "#FFFFFF",
    mascotRing: "rgba(129, 140, 248, 0.25)",
    codeBg: "#070A10",
    codeForeground: "#E2E8F0",
    codeMuted: "#8892B0",
    codeActive: "#141C2E",
    codeBorder: "rgba(255, 255, 255, 0.10)",
  },
};

export type ColorTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  inputBg: string;
  ring: string;
  glassBg: string;
  glassBorder: string;
  glassShadow: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  success: string;
  warning: string;
  glow1: string;
  glow2: string;
  mascot: string;
  mascotForeground: string;
  mascotRing: string;
  codeBg: string;
  codeForeground: string;
  codeMuted: string;
  codeActive: string;
  codeBorder: string;
};
