import { StyleSheet } from "react-native";
import { THEME, type ColorTokens } from "./palette";

type StyleMap = Record<string, any>;

interface RegisteredEntry {
  tokens: Record<string, Record<string, keyof ColorTokens>>;
  live: StyleMap;
}

const registeredEntries: RegisteredEntry[] = [];
let isPatched = false;
const originalCreate = StyleSheet.create;

function detectToken(
  prop: string,
  val: string,
  palette: ColorTokens
): keyof ColorTokens | null {
  if (typeof val !== "string") return null;

  if (prop === "color") {
    if (val === palette.primaryForeground) return "primaryForeground";
    if (val === palette.secondaryForeground) return "secondaryForeground";
    if (val === palette.destructiveForeground) return "destructiveForeground";
    if (val === palette.cardForeground) return "cardForeground";
    if (val === palette.sidebarForeground) return "sidebarForeground";
    if (val === palette.codeForeground) return "codeForeground";
    if (val === palette.codeMuted) return "codeMuted";
    if (val === palette.mutedForeground) return "mutedForeground";
    if (val === palette.foreground) return "foreground";
    if (val === palette.primary) return "primary";
    if (val === palette.destructive) return "destructive";
    if (val === palette.success) return "success";
    if (val === palette.warning) return "warning";
  }

  if (prop === "backgroundColor") {
    if (val === palette.card) return "card";
    if (val === palette.background) return "background";
    if (val === palette.secondary) return "secondary";
    if (val === palette.muted) return "muted";
    if (val === palette.accent) return "accent";
    if (val === palette.sidebar) return "sidebar";
    if (val === palette.sidebarAccent) return "sidebarAccent";
    if (val === palette.glassBg) return "glassBg";
    if (val === palette.inputBg) return "inputBg";
    if (val === palette.codeBg) return "codeBg";
    if (val === palette.primary) return "primary";
    if (val === palette.destructive) return "destructive";
  }

  if (
    prop === "borderColor" ||
    prop === "borderTopColor" ||
    prop === "borderBottomColor" ||
    prop === "borderLeftColor" ||
    prop === "borderRightColor"
  ) {
    if (val === palette.glassBorder) return "glassBorder";
    if (val === palette.sidebarBorder) return "sidebarBorder";
    if (val === palette.border) return "border";
    if (val === palette.input) return "input";
    if (val === palette.ring) return "ring";
    if (val === palette.primary) return "primary";
    if (val === palette.codeBorder) return "codeBorder";
  }

  if (prop === "shadowColor") {
    if (val === palette.glassShadow) return "glassShadow";
  }

  return null;
}

export function patchStyleSheet(): void {
  if (isPatched) return;
  isPatched = true;

  (StyleSheet as any).create = function <T extends StyleMap>(styles: T): T {
    if (!styles || typeof styles !== "object") {
      return originalCreate ? originalCreate(styles) : styles;
    }

    const live: StyleMap = {};
    const tokens: Record<string, Record<string, keyof ColorTokens>> = {};
    // Check against light first (default) then dark
    const referencePalettes = [THEME.light, THEME.dark];

    for (const ruleKey in styles) {
      const rule = styles[ruleKey];
      if (rule && typeof rule === "object") {
        // Create an independent mutable copy so React Native never freezes it
        live[ruleKey] = { ...rule };
        tokens[ruleKey] = {};

        for (const prop in rule) {
          const val = rule[prop];
          if (typeof val === "string") {
            for (const pal of referencePalettes) {
              const matched = detectToken(prop, val, pal);
              if (matched) {
                tokens[ruleKey][prop] = matched;
                break;
              }
            }
          }
        }
      } else {
        live[ruleKey] = rule;
      }
    }

    registeredEntries.push({ tokens, live });
    return originalCreate ? (originalCreate(live) as T) : (live as unknown as T);
  };
}

export function updateRegisteredStyles(
  fromTheme: "light" | "dark",
  toTheme: "light" | "dark"
): void {
  if (fromTheme === toTheme) return;

  const toPalette = THEME[toTheme];

  for (const entry of registeredEntries) {
    const { live, tokens } = entry;
    if (!live || typeof live !== "object") continue;

    for (const ruleKey in live) {
      let rule = live[ruleKey];
      if (!rule || typeof rule !== "object") continue;

      if (Object.isFrozen(rule)) {
        rule = { ...rule };
        live[ruleKey] = rule;
      }

      const propTokens = tokens?.[ruleKey];
      if (propTokens) {
        for (const prop in propTokens) {
          const tokenKey = propTokens[prop];
          const newColor = toPalette[tokenKey];
          if (newColor) {
            try {
              rule[prop] = newColor;
            } catch {
              try {
                Object.defineProperty(rule, prop, {
                  value: newColor,
                  writable: true,
                  configurable: true,
                  enumerable: true,
                });
              } catch {}
            }
          }
        }
      }
    }
  }
}
