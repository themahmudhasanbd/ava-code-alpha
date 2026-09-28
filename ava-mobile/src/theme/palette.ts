/**
 * Exact color palette & design tokens computed from Web OKLCH definitions (styles.css).
 */
export const THEME = {
  light: {
    background: "#F7F5F0",
    foreground: "#141720",
    card: "#FCFBF8",
    cardForeground: "#141720",
    popover: "#FCFBF8",
    popoverForeground: "#141720",
    primary: "#4240E1",
    primaryForeground: "#FFFFFF",
    secondary: "#EDE9E1",
    secondaryForeground: "#1F2332",
    muted: "#EFECE5",
    mutedForeground: "#606674",
    accent: "#EAE5DB",
    accentForeground: "#1C2132",
    destructive: "#E7000B",
    destructiveForeground: "#FFFFFF",
    border: "#DDD8CC",
    input: "#D6D0C2",
    inputBg: "rgba(252, 251, 248, 0.90)",
    ring: "#5C6BE3",
    glassBg: "rgba(252, 251, 248, 0.82)",
    glassBorder: "rgba(245, 242, 235, 0.90)",
    glassShadow: "rgba(35, 30, 20, 0.06)",
    sidebar: "#F3F0E8",
    sidebarForeground: "#141720",
    sidebarPrimary: "#4240E1",
    sidebarPrimaryForeground: "#FFFFFF",
    sidebarAccent: "#E5E1D5",
    sidebarAccentForeground: "#181C29",
    sidebarBorder: "#D6D0C2",
    success: "#3BB360",
    warning: "#E9AB2B",
    glow1: "rgba(180, 170, 250, 0.35)",
    glow2: "rgba(220, 215, 200, 0.30)",
    mascot: "#6A65FF",
    mascotForeground: "#FFFFFF",
    mascotRing: "rgba(106, 101, 255, 0.26)",
    codeBg: "#0A0C10",
    codeForeground: "#DBDEE2",
    codeMuted: "#878D94",
    codeActive: "#15171B",
    codeBorder: "#2B2E32",
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
