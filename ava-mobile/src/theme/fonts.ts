import { Platform, TextStyle } from "react-native";

export const FONTS = {
  // English / Western stylish font (Plus Jakarta Sans)
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semiBold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extraBold: "PlusJakartaSans_800ExtraBold",

  // Bengali elegant font (Hind Siliguri)
  bengaliRegular: "HindSiliguri_400Regular",
  bengaliMedium: "HindSiliguri_500Medium",
  bengaliSemiBold: "HindSiliguri_600SemiBold",
  bengaliBold: "HindSiliguri_700Bold",

  // Monospace / Code font (JetBrains Mono)
  monoRegular: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
} as const;

export function isBengali(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

export function font(
  weight: "regular" | "medium" | "semibold" | "bold" | "extrabold" = "regular",
  text?: string
): TextStyle {
  const bn = text ? isBengali(text) : false;

  if (bn) {
    switch (weight) {
      case "bold":
      case "extrabold":
        return { fontFamily: FONTS.bengaliBold };
      case "semibold":
        return { fontFamily: FONTS.bengaliSemiBold };
      case "medium":
        return { fontFamily: FONTS.bengaliMedium };
      default:
        return { fontFamily: FONTS.bengaliRegular };
    }
  }

  switch (weight) {
    case "extrabold":
      return { fontFamily: FONTS.extraBold };
    case "bold":
      return { fontFamily: FONTS.bold };
    case "semibold":
      return { fontFamily: FONTS.semiBold };
    case "medium":
      return { fontFamily: FONTS.medium };
    default:
      return { fontFamily: FONTS.regular };
  }
}

export function mono(
  weight: "regular" | "medium" | "semibold" | "bold" = "regular"
): TextStyle {
  switch (weight) {
    case "bold":
    case "semibold":
      return {
        fontFamily: FONTS.monoBold,
        ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
      };
    case "medium":
      return {
        fontFamily: FONTS.monoMedium,
        ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
      };
    default:
      return {
        fontFamily: FONTS.monoRegular,
        ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
      };
  }
}
