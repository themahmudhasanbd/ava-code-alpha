import { normalizeColor } from "./color-normalize"

export interface DesignTokens {
  colors: Record<string, string>
  typeScale: number[]
  fonts: { display: string; body: string }
  spacingScale: number[]
}

export interface DriftFinding {
  file: string
  line?: number
  type: "color" | "spacing" | "font"
  value: string | number
  message: string
}

export interface DriftReport {
  undeclaredColors: string[]
  offScaleSpacing: number[]
  findings: DriftFinding[]
  isClean: boolean
}

const TOLERATED_NAMED: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  transparent: "#00000000",
}

export class DriftAuditor {
  /**
   * Scans generated code files (CSS, Tailwind, TSX/JSX, Vue, Svelte, HTML, RN StyleSheet) and diffs used values against tokens.
   */
  static auditDrift(files: Array<{ path: string; content: string }>, tokens: DesignTokens): DriftReport {
    const findings: DriftFinding[] = []
    const undeclaredColorsSet: Set<string> = new Set()
    const offScaleSpacingSet: Set<number> = new Set()

    const declaredHexColors = new Set(
      Object.values(tokens.colors)
        .map((c) => normalizeColor(c))
        .filter((c): c is string => c !== null),
    )

    const declaredAnyBaseNeutral = declaredHexColors.has("#ffffff") || declaredHexColors.has("#000000")
    const declaredSpacing = new Set(tokens.spacingScale)

    const isTolerated = (rawColor: string): boolean => {
      const norm = normalizeColor(rawColor)
      if (!norm) return false
      if (declaredHexColors.has(norm)) return true
      if (declaredAnyBaseNeutral && (norm === "#ffffff" || norm === "#000000")) return true
      return false
    }

    for (const file of files) {
      const lines = file.content.split("\n")

      for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
        const line = lines[lineNum - 1]

        // 1. Raw hex colours (#fff, #ffffff, #ffffff80)
        const hexMatches = line.matchAll(/#([0-9a-fA-F]{3,8})\b/g)
        for (const match of hexMatches) {
          const rawHex = match[0]
          if (isTolerated(rawHex)) continue
          undeclaredColorsSet.add(rawHex)
          findings.push({
            file: file.path,
            line: lineNum,
            type: "color",
            value: rawHex,
            message: `Hardcoded undeclared color ${rawHex} does not exist in token palette`,
          })
        }

        // 2. Arbitrary Tailwind hex brackets: bg-[#f00], text-[#123456]
        const arbitraryColorMatches = line.matchAll(/(?:bg|text|border|ring|fill|stroke)-\[#([0-9a-fA-F]{3,8})\]/g)
        for (const match of arbitraryColorMatches) {
          const hex = `#${match[1]}`
          if (isTolerated(hex)) continue
          undeclaredColorsSet.add(hex)
          findings.push({
            file: file.path,
            line: lineNum,
            type: "color",
            value: hex,
            message: `Arbitrary Tailwind color [${hex}] is not defined in design tokens`,
          })
        }

        // 3. rgb()/rgba()/hsl()/hsla() literals
        const rgbMatches = line.matchAll(/\b(?:rgb|rgba|hsl|hsla)\(\s*([^)]+)\)/g)
        for (const match of rgbMatches) {
          const raw = match[0]
          const norm = normalizeColor(raw)
          if (!norm) continue
          if (isTolerated(raw) || isTolerated(norm)) continue
          undeclaredColorsSet.add(raw)
          findings.push({
            file: file.path,
            line: lineNum,
            type: "color",
            value: raw,
            message: `Hardcoded color function ${raw} does not match any token`,
          })
        }

        // 4. Arbitrary Tailwind spacing: p-[37px], gap-[13px]
        const arbitraryPxMatches = line.matchAll(/(?:p|m|gap|top|bottom|left|right|w|h|space-[xy])-\[(\d+)px\]/g)
        for (const match of arbitraryPxMatches) {
          const pxVal = parseInt(match[1], 10)
          if (declaredSpacing.has(pxVal)) continue
          offScaleSpacingSet.add(pxVal)
          findings.push({
            file: file.path,
            line: lineNum,
            type: "spacing",
            value: pxVal,
            message: `Arbitrary spacing ${pxVal}px is outside the token spacing scale [${tokens.spacingScale.join(", ")}]`,
          })
        }

        // 5. Anti-Slop: side-stripe borders
        if (/border-(?:l|r)-(?:[2-9]|4|8)\b|border-(?:left|right)-(?:width:\s*[2-9]px|color:)/i.test(line)) {
          findings.push({
            file: file.path,
            line: lineNum,
            type: "color",
            value: "side-tab-border",
            message: "[Anti-Slop] Thick side-stripe border (>1px) detected; use double-bezel cards or background tint instead.",
          })
        }

        // 6. Anti-Slop: gradient text
        if (/(?:bg-clip-text\s+text-transparent|background-clip:\s*text)/i.test(line)) {
          findings.push({
            file: file.path,
            line: lineNum,
            type: "color",
            value: "gradient-text",
            message: "[Anti-Slop] Gradient text detected; use solid high-contrast ink colors.",
          })
        }

        // 7. Anti-Slop: layout property transitions
        if (/(?:transition-(?:all|width|height|spacing)|transition:\s*(?:width|height|padding|margin))/i.test(line)) {
          findings.push({
            file: file.path,
            line: lineNum,
            type: "spacing",
            value: "layout-transition",
            message: "[Anti-Slop] Animating layout properties causes layout thrash; use transform/opacity instead.",
          })
        }
      }
    }

    return {
      undeclaredColors: Array.from(undeclaredColorsSet),
      offScaleSpacing: Array.from(offScaleSpacingSet),
      findings,
      isClean: findings.length === 0,
    }
  }
}
