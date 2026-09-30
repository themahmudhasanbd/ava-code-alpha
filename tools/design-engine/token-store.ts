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
    // 1. Primary: .ava-code/design/tokens.json
    const primaryPath = path.join(directory, ".ava-code", "design", "tokens.json")
    if (fs.existsSync(primaryPath)) {
      try {
        const raw = fs.readFileSync(primaryPath, "utf-8")
        const parsed = JSON.parse(raw)
        if (parsed.colors && parsed.typeScale && parsed.spacingScale) {
          return parsed as DesignTokens
        }
      } catch (_) {}
    }

    // 2. Fallback: design-tokens.json
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
    const dir = path.join(directory, ".ava-code", "design")
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const primaryPath = path.join(dir, "tokens.json")
    fs.writeFileSync(primaryPath, JSON.stringify(tokens, null, 2), "utf-8")

    // Legacy fallback compatibility
    const tokenFilePath = path.join(directory, "design-tokens.json")
    try {
      fs.writeFileSync(tokenFilePath, JSON.stringify(tokens, null, 2), "utf-8")
    } catch (_) {}
  }
}
