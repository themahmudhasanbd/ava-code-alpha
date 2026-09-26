export interface RGB {
  r: number
  g: number
  b: number
  a?: number
}

/**
 * Normalizes any valid CSS color string (hex, rgb, rgba) into a lowercase 6-character hex (#rrggbb).
 */
export function normalizeColor(input: string): string | null {
  if (!input) return null
  const str = input.trim().toLowerCase()

  // 1. #rgb -> #rrggbb
  if (/^#[0-9a-f]{3}$/i.test(str)) {
    return `#${str[1]}${str[1]}${str[2]}${str[2]}${str[3]}${str[3]}`
  }

  // 2. #rgba -> #rrggbb (drops alpha for base comparison)
  if (/^#[0-9a-f]{4}$/i.test(str)) {
    return `#${str[1]}${str[1]}${str[2]}${str[2]}${str[3]}${str[3]}`
  }

  // 3. #rrggbb
  if (/^#[0-9a-f]{6}$/i.test(str)) {
    return str
  }

  // 4. #rrggbbaa -> #rrggbb
  if (/^#[0-9a-f]{8}$/i.test(str)) {
    return str.slice(0, 7)
  }

  // 5. rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = str.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10)))
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10)))
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10)))
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
  }

  return null
}

/**
 * Calculates the relative luminance of an sRGB color per WCAG 2.1 specs.
 */
export function relativeLuminance(hex: string): number {
  const norm = normalizeColor(hex)
  if (!norm) return 0

  const r = parseInt(norm.slice(1, 3), 16) / 255
  const g = parseInt(norm.slice(3, 5), 16) / 255
  const b = parseInt(norm.slice(5, 7), 16) / 255

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * Calculates WCAG 2.1 contrast ratio between two colors (e.g. 4.5:1 for AA body).
 */
export function contrastRatio(colorA: string, colorB: string): number | null {
  const normA = normalizeColor(colorA)
  const normB = normalizeColor(colorB)
  if (!normA || !normB) return null

  const lumA = relativeLuminance(normA)
  const lumB = relativeLuminance(normB)

  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)

  return (lighter + 0.05) / (darker + 0.05)
}
