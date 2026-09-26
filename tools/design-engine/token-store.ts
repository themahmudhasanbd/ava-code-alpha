import fs from "fs"
import path from "path"
import type { DesignTokens } from "./drift-auditor"

export const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    bg: "#07080a",
    surface: "#0e1017",
    surfaceElevated: "#151823",
    surfaceFloating: "#1c202e",
    border: "rgba(255,255,255,0.08)",
    borderSubtle: "rgba(255,255,255,0.04)",
    ink: "#e2e8f0",
    inkMuted: "#94a3b8",
    accent: "#6366f1",
    accentHover: "#4f46e5",
  },
  typeScale: [11, 12, 13, 14, 16, 20, 24, 32, 48, 64],
  spacingScale: [2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64],
  fonts: {
    display: "'SF Pro Display', 'Geist Sans', -apple-system, sans-serif",
    body: "'SF Pro Text', 'Inter', -apple-system, sans-serif",
  },
}

export class TokenStore {
  static getProjectTokens(directory: string): DesignTokens {
    const tokenFilePath = path.join(directory, "design-tokens.json")
    if (fs.existsSync(tokenFilePath)) {
      try {
        const raw = fs.readFileSync(tokenFilePath, "utf-8")
        const parsed = JSON.parse(raw)
        if (parsed.colors && parsed.typeScale && parsed.spacingScale) {
          return parsed as DesignTokens
        }
      } catch (_) {}
    }
    return DEFAULT_TOKENS
  }

  static saveProjectTokens(directory: string, tokens: DesignTokens): void {
    const tokenFilePath = path.join(directory, "design-tokens.json")
    fs.writeFileSync(tokenFilePath, JSON.stringify(tokens, null, 2), "utf-8")
  }
}
