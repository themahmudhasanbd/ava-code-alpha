import fs from "fs"
import path from "path"
import type { QualityGateResult, QualityGateFinding } from "./types"
import { ImpeccableEngine } from "../design-engine/impeccable-engine"
import { DriftAuditor } from "../design-engine/drift-auditor"
import { DEFAULT_TOKENS } from "../design-engine/token-store"

const STUB_PATTERNS = [
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /\bLorem ipsum\b/i,
  /\bcoming soon\b/i,
  /\b\/\/\s*placeholder\b/i,
  /\b\/\*\s*placeholder\s*\*\//i,
]

export class QualityGate {
  /**
   * Executes multi-pillar quality inspection across generated or modified artifacts
   */
  static evaluate(files: string[], promptText: string, customTokens = DEFAULT_TOKENS): QualityGateResult {
    const findings: QualityGateFinding[] = []
    const loadedFiles: Array<{ path: string; content: string }> = []

    for (const f of files) {
      if (fs.existsSync(f) && fs.statSync(f).isFile()) {
        try {
          const content = fs.readFileSync(f, "utf-8")
          loadedFiles.push({ path: f, content })

          // ─── 1. Stub & Placeholder Check (Zero-Placeholder Invariant) ──────
          for (const pattern of STUB_PATTERNS) {
            const match = pattern.exec(content)
            if (match) {
              findings.push({
                pillar: "placeholder_stubs",
                severity: "P0",
                file: path.basename(f),
                message: `Placeholder or incomplete stub '${match[0]}' detected.`,
                suggestion: "Never ship placeholders or TODOs. Replace with real production logic.",
              })
            }
          }

          // ─── 2. Design Anti-Slop Heuristic Critique ──────────────────────
          if (/\.(tsx|jsx|vue|svelte|html|css)$/i.test(f)) {
            const critique = ImpeccableEngine.critiqueCode(content, promptText)
            for (const item of critique.findings) {
              findings.push({
                pillar: "design_anti_slop",
                severity: item.severity,
                file: path.basename(f),
                message: item.message,
                suggestion: item.suggestion,
              })
            }
          }
        } catch (_) {}
      }
    }

    // ─── 3. Token Drift Audit ───────────────────────────────────────────────
    if (loadedFiles.length > 0) {
      const drift = DriftAuditor.auditDrift(loadedFiles, customTokens)
      for (const d of drift.findings) {
        findings.push({
          pillar: "token_drift",
          severity: "P1",
          file: path.basename(d.file),
          line: d.line,
          message: d.message,
          suggestion: "Use theme tokens / CSS variables instead of hardcoded arbitrary values.",
        })
      }
    }

    const p0Count = findings.filter((f) => f.severity === "P0").length
    const p1Count = findings.filter((f) => f.severity === "P1").length

    let score = 100 - p0Count * 25 - p1Count * 5
    if (score < 0) score = 0

    const passed = p0Count === 0 && score >= 70
    const summary = `Quality Gate: Score ${score}/100 [${passed ? "PASS" : "FAIL"}] (${p0Count} blockers, ${p1Count} warnings across ${loadedFiles.length} files).`

    return {
      passed,
      score,
      p0Count,
      p1Count,
      findings,
      summary,
      timestamp: new Date().toISOString(),
    }
  }
}
