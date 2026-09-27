/**
 * Exact color palette & design tokens computed from Web OKLCH definitions (styles.css).
 */
export const THEME = {
  light: {
    background: "#F9FAFD",
    foreground: "#141720",
    card: "#FFFFFF",
    cardForeground: "#141720",
    popover: "#FFFFFF",
    popoverForeground: "#141720",
    primary: "#4240E1",
    primaryForeground: "#FFFFFF",
    secondary: "#EBEDF4",
    secondaryForeground: "#1F2332",
    muted: "#EEF0F4",
    mutedForeground: "#606674",
    accent: "#E8ECF7",
    accentForeground: "#1C2132",
    destructive: "#E7000B",
    destructiveForeground: "#FFFFFF",
    border: "#DBDEE4",
    input: "#D4D7E0",
    inputBg: "rgba(255, 255, 255, 0.85)",
    ring: "#5C6BE3",
    glassBg: "rgba(255, 255, 255, 0.75)",
    glassBorder: "rgba(255, 255, 255, 0.85)",
    glassShadow: "rgba(20, 23, 32, 0.08)",
    sidebar: "#F5F7FB",
    sidebarForeground: "#141720",
    sidebarPrimary: "#4240E1",
    sidebarPrimaryForeground: "#FFFFFF",
    sidebarAccent: "#E2E6F1",
    sidebarAccentForeground: "#181C29",
    sidebarBorder: "#D4D7E0",
    success: "#3BB360",
    warning: "#E9AB2B",
    glow1: "rgba(180, 170, 250, 0.35)",
    glow2: "rgba(190, 220, 250, 0.30)",
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
