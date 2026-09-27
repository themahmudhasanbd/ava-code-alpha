import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, type ColorSchemeName } from "react-native";
import { storage } from "@/core/storage";
import { COLORS, THEME, type ColorTokens } from "./colors";

export type ThemeMode = "system" | "light" | "dark";

export interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  isDark: boolean;
  colors: ColorTokens;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = "ava.theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = storage.get(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
    return "system";
  });

  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(() => {
    return Appearance.getColorScheme() ?? "light";
  });

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const resolvedTheme: "light" | "dark" = useMemo(() => {
    if (theme === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return theme;
  }, [theme, systemScheme]);

  // Synchronize dynamic COLORS object in-place so legacy files see updated tokens
  useEffect(() => {
    const activePalette = THEME[resolvedTheme];
    Object.assign(COLORS, activePalette);
  }, [resolvedTheme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    storage.set(THEME_STORAGE_KEY, mode);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  const colors = THEME[resolvedTheme];
  const isDark = resolvedTheme === "dark";

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      isDark,
      colors,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, isDark, colors, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Graceful fallback if called outside provider
    const isDark = Appearance.getColorScheme() === "dark";
    return {
      theme: "system",
      resolvedTheme: isDark ? "dark" : "light",
      isDark,
      colors: isDark ? THEME.dark : THEME.light,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
}
