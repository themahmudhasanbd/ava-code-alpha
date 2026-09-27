import { Appearance } from "react-native";
import { storage } from "@/core/storage";
import { THEME, type ColorTokens } from "./palette";

export { THEME, type ColorTokens } from "./palette";

const getInitialScheme = (): "light" | "dark" => {
  try {
    const saved = storage.get("ava.theme");
    if (saved === "dark" || saved === "light") {
      return saved;
    }
  } catch {}
  return "light";
};

const initialScheme = getInitialScheme();

// Export mutable singleton COLORS initialized to the active scheme
export const COLORS: ColorTokens = { ...THEME[initialScheme] };

export { ThemeProvider, useTheme, type ThemeMode, type ThemeContextValue } from "./theme-context";
