import crypto from "crypto"
import { contrastRatio, normalizeColor } from "./color-normalize"

export type DesignRegister = "product" | "brand"
export type ColorStrategy = "restrained" | "committed" | "full_palette" | "drenched"

export interface OklchColor {
  l: number // Lightness 0..1
  c: number // Chroma 0..0.4
  h: number // Hue 0..360
}

export interface SemanticPalette {
  seedId: string
  mood: string
  strategy: ColorStrategy
  bg: string
  surface: string
  surfaceElevated: string
  surfaceFloating: string
  border: string
  borderSubtle: string
  ink: string
  inkMuted: string
  accent: string
  accentHover: string
  focusRing: string
  contrastInkBg?: number
  contrastInkMutedBg?: number
  cssVariables: string
  reactNativeTokens: Record<string, string>
}

export interface CritiqueFinding {
  pillar: "contrast" | "hierarchy" | "anti_slop" | "typography" | "motion" | "responsive"
  severity: "P0" | "P1" | "advisory"
  ruleId: string
  message: string
  suggestion: string
}

export interface CritiqueReport {
  score: number // 0 - 100
  register: DesignRegister
  findings: CritiqueFinding[]
  passed: boolean
  summary: string
}

export class ImpeccableEngine {
  // ─── 1. Register Classification ──────────────────────────────────────────
  static classifyRegister(contextText: string): DesignRegister {
    const lower = contextText.toLowerCase()
    const productKeywords = [
      "dashboard", "admin", "crm", "cms", "saas tool", "settings", "analytics",
      "data table", "editor", "app shell", "profile screen", "workspace", "terminal", "chat"
    ]
    const brandKeywords = [
      "landing page", "hero section", "portfolio", "marketing", "campaign",
      "showcase", "brand", "agency", "pricing table", "features page"
    ]

    const productMatches = productKeywords.filter((k) => lower.includes(k)).length
    const brandMatches = brandKeywords.filter((k) => lower.includes(k)).length

    return brandMatches > productMatches ? "brand" : "product"
  }

  // ─── 2. OKLCH Palette Generator ─────────────────────────────────────────
  static generatePalette(brandSeedNameOrText: string, mode: "dark" | "light" = "dark"): SemanticPalette {
    const hash = crypto.createHash("sha256").update(brandSeedNameOrText || "ava-thunder").digest("hex")
    const num = parseInt(hash.slice(0, 8), 16)
    const baseHue = num % 360

    const isDark = mode === "dark"

    const bgOklch: OklchColor = isDark
      ? { l: 0.12, c: 0.015, h: baseHue }
      : { l: 0.98, c: 0.005, h: baseHue }

    const surfaceOklch: OklchColor = isDark
      ? { l: 0.16, c: 0.02, h: baseHue }
      : { l: 0.95, c: 0.008, h: baseHue }

    const surfaceElevatedOklch: OklchColor = isDark
      ? { l: 0.20, c: 0.025, h: baseHue }
      : { l: 1.0, c: 0.0, h: 0 }

    const surfaceFloatingOklch: OklchColor = isDark
      ? { l: 0.24, c: 0.03, h: baseHue }
      : { l: 0.99, c: 0.004, h: baseHue }

    const inkOklch: OklchColor = isDark
      ? { l: 0.93, c: 0.01, h: baseHue }
      : { l: 0.14, c: 0.02, h: baseHue }

    const inkMutedOklch: OklchColor = isDark
      ? { l: 0.65, c: 0.02, h: baseHue }
      : { l: 0.42, c: 0.03, h: baseHue }

    const accentOklch: OklchColor = {
      l: isDark ? 0.68 : 0.55,
      c: 0.18,
      h: baseHue,
    }

    const formatOklch = (c: OklchColor) =>
      `oklch(${c.l.toFixed(3)} ${c.c.toFixed(3)} ${c.h.toFixed(1)})`

    const bg = formatOklch(bgOklch)
    const surface = formatOklch(surfaceOklch)
    const surfaceElevated = formatOklch(surfaceElevatedOklch)
    const surfaceFloating = formatOklch(surfaceFloatingOklch)
    const ink = formatOklch(inkOklch)
    const inkMuted = formatOklch(inkMutedOklch)
    const accent = formatOklch(accentOklch)
    const accentHover = formatOklch({ ...accentOklch, l: isDark ? accentOklch.l + 0.06 : accentOklch.l - 0.06 })
    const border = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"
    const borderSubtle = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"
    const focusRing = formatOklch({ ...accentOklch, c: 0.12 })

    const bgHex = oklchToHex(bgOklch) || (isDark ? "#07080a" : "#f8f9fa")
    const surfaceHex = oklchToHex(surfaceOklch) || (isDark ? "#0e1017" : "#f1f3f5")
    const surfaceElevatedHex = oklchToHex(surfaceElevatedOklch) || (isDark ? "#151823" : "#ffffff")
    const surfaceFloatingHex = oklchToHex(surfaceFloatingOklch) || (isDark ? "#1c202e" : "#ffffff")
    const inkHex = oklchToHex(inkOklch) || (isDark ? "#e2e8f0" : "#1a1d20")
    const inkMutedHex = oklchToHex(inkMutedOklch) || (isDark ? "#94a3b8" : "#64748b")
    const accentHex = oklchToHex(accentOklch) || "#6366f1"
    const accentHoverHex = oklchToHex({ ...accentOklch, l: isDark ? accentOklch.l + 0.06 : accentOklch.l - 0.06 }) || "#4f46e5"

    const cssVariables = [
      `:root {`,
      `  --color-bg: ${bg};`,
      `  --color-surface: ${surface};`,
      `  --color-surface-elevated: ${surfaceElevated};`,
      `  --color-surface-floating: ${surfaceFloating};`,
      `  --color-border: ${border};`,
      `  --color-border-subtle: ${borderSubtle};`,
      `  --color-ink: ${ink};`,
      `  --color-ink-muted: ${inkMuted};`,
      `  --color-accent: ${accent};`,
      `  --color-accent-hover: ${accentHover};`,
      `  --color-focus: ${focusRing};`,
      `  --body-max-line-length: 70ch;`,
      `  --display-letter-spacing-floor: -0.04em;`,
      `  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);`,
      `  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);`,
      `}`,
    ].join("\n")

    const reactNativeTokens = {
      bg: bgHex,
      surface: surfaceHex,
      surfaceElevated: surfaceElevatedHex,
      surfaceFloating: surfaceFloatingHex,
      border: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
      borderSubtle: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
      ink: inkHex,
      inkMuted: inkMutedHex,
      accent: accentHex,
      accentHover: accentHoverHex,
      focusRing: accentHex + "40",
    }

    const contrastInkBg = contrastRatio(inkHex, bgHex) ?? 14.5
    const contrastInkMutedBg = contrastRatio(inkMutedHex, bgHex) ?? 5.5

    const mood = `Harmonious OKLCH palette anchored at hue ${baseHue}°, measured ink:bg ${contrastInkBg.toFixed(2)}:1${
      contrastInkBg >= 4.5 ? " (WCAG AA for body text)" : " (below WCAG AA)"
    }`

    return {
      seedId: `seed-hue-${baseHue}`,
      mood,
      strategy: "restrained",
      bg,
      surface,
      surfaceElevated,
      surfaceFloating,
      border,
      borderSubtle,
      ink,
      inkMuted,
      accent,
      accentHover,
      focusRing,
      contrastInkBg,
      contrastInkMutedBg,
      cssVariables,
      reactNativeTokens,
    }
  }

  // ─── 3. Heuristic Design Critique & Quality Audit ───────────────────────
  static critiqueCode(code: string, context?: string): CritiqueReport {
    const register = this.classifyRegister(context || "")
    const findings: CritiqueFinding[] = []

    // Pillar 1: Anti-AI Slop Invariants (P0 blockers)
    if (/border-(?:l|r)-(?:[2-9]|4|8)\b|border-(?:left|right)-(?:width:\s*[2-9]px)/i.test(code)) {
      findings.push({
        pillar: "anti_slop",
        severity: "P0",
        ruleId: "side-tab",
        message: "Thick colored side-tab border (>1px) detected on container",
        suggestion: "Use double-bezel cards (subtle border on wrapper + inner card) or background tint.",
      })
    }

    if (/bg-clip-text\s+text-transparent|background-clip:\s*text/i.test(code)) {
      findings.push({
        pillar: "anti_slop",
        severity: "P0",
        ruleId: "gradient-text",
        message: "Gradient text detected on headings or body",
        suggestion: "Use solid ink color with high typographic contrast and weight differentiation.",
      })
    }

    if (/\b(?:01\b[\s\S]{1,60}\b02\b[\s\S]{1,60}\b03\b)/i.test(code)) {
      findings.push({
        pillar: "anti_slop",
        severity: "P1",
        ruleId: "numbered-section-markers",
        message: "Repetitive 01 / 02 / 03 numbered card scaffolding detected",
        suggestion: "Vary section rhythm with asymmetrical bento cards, data visualizations, or narrative flow.",
      })
    }

    if (/shadow-\[\s*0_0_(?:3|4|5|6|7|8|9|10)\dpx/i.test(code)) {
      findings.push({
        pillar: "anti_slop",
        severity: "P1",
        ruleId: "dark-glow",
        message: "Over-saturated neon box-shadow glow detected in dark theme",
        suggestion: "Use directional top-edge hairlines (border-t-white/12) and subtle diffuse shadows instead.",
      })
    }

    // Pillar 2: Typography & Legibility
    if (/tracking-\[-(?:0\.0[5-9]|0\.[1-9])em\]|letter-spacing:\s*-(?:0\.0[5-9]|0\.[1-9])em/i.test(code)) {
      findings.push({
        pillar: "typography",
        severity: "P0",
        ruleId: "extreme-negative-tracking",
        message: "Display letter-spacing tighter than the -0.04em floor",
        suggestion: "Cap negative tracking at -0.02em to -0.04em to preserve character legibility.",
      })
    }

    // Pillar 3: Performance & Motion
    if (/transition-(?:all|width|height|spacing)|transition:\s*(?:width|height|padding|margin)/i.test(code)) {
      findings.push({
        pillar: "motion",
        severity: "P1",
        ruleId: "layout-transition",
        message: "Animating layout properties (width, height, padding, margin) causes frame drops",
        suggestion: "Animate transform (scale/translate) and opacity, or use grid-template-rows.",
      })
    }

    if (/ease-in-out-back|bounce|elastic/i.test(code)) {
      findings.push({
        pillar: "motion",
        severity: "P1",
        ruleId: "bounce-easing",
        message: "Tacky bounce or elastic easing curve detected",
        suggestion: "Use smooth exponential deceleration curves (ease-out-quart or ease-out-expo).",
      })
    }

    // Pillar 4: Container Over-Rounding
    if (/(?:rounded-(?:3xl|\[(?:3[2-9]|[4-9]\d)px\])|border-radius:\s*(?:3[2-9]|[4-9]\d)px)/i.test(code)) {
      findings.push({
        pillar: "hierarchy",
        severity: "P1",
        ruleId: "over-rounded-cards",
        message: "Over-rounded container corners (32px+)",
        suggestion: "Content cards look most disciplined between 12px and 20px radius. Reserve full-pill for small tags and buttons.",
      })
    }

    // Pillar 5: Emojis in UI Markup
    if (/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(code)) {
      findings.push({
        pillar: "anti_slop",
        severity: "P0",
        ruleId: "zero-emoji",
        message: "Unicode emojis detected in UI markup or text",
        suggestion: "Strict Zero-Emoji rule in UI: Replace all emojis with crisp Lucide, Radix, or Phosphor SVG icons.",
      })
    }

    const p0Count = findings.filter((f) => f.severity === "P0").length
    const p1Count = findings.filter((f) => f.severity === "P1").length

    let score = 100 - (p0Count * 25) - (p1Count * 10)
    if (score < 0) score = 0

    const passed = p0Count === 0 && score >= 70
    const summary = passed
      ? `Impeccable Design Quality: PASS (Score: ${score}/100, ${findings.length} advisory notes)`
      : `Impeccable Design Quality: FAILED (Score: ${score}/100, ${p0Count} P0 blockers, ${p1Count} P1 warnings)`

    return {
      score,
      register,
      findings,
      passed,
      summary,
    }
  }
}

/** OKLCH → sRGB hex approximation */
function oklchToHex(c: OklchColor): string | null {
  const L = c.l
  const a = c.c * Math.cos((c.h * Math.PI) / 180)
  const b = c.c * Math.sin((c.h * Math.PI) / 180)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  const encode = (v: number): number => {
    const clamped = Math.max(0, Math.min(1, v))
    return clamped <= 0.0031308
      ? Math.round(clamped * 12.92 * 255)
      : Math.round((1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255)
  }

  const hex = "#" + [encode(r), encode(g), encode(bl)].map((n) => n.toString(16).padStart(2, "0")).join("")
  return normalizeColor(hex)
}
