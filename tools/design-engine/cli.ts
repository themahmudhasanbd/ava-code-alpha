#!/usr/bin/env node
import { ImpeccableEngine } from "./impeccable-engine"
import { DriftAuditor } from "./drift-auditor"
import { TokenStore, DEFAULT_TOKENS } from "./token-store"
import { DesignVerifier } from "./design-verifier"
import fs from "fs"
import path from "path"

const args = process.argv.slice(2)
const command = args[0] || "help"

switch (command) {
  case "palette": {
    const seed = args[1] || "ava-thunder"
    const mode = (args[2] as "dark" | "light") || "dark"
    const palette = ImpeccableEngine.generatePalette(seed, mode)
    console.log(`=== AvA OKLCH Master Palette ===`)
    console.log(`Seed: ${palette.seedId} | Mood: ${palette.mood}`)
    console.log(`\n--- CSS Variables ---\n${palette.cssVariables}`)
    console.log(`\n--- React Native Theme Tokens ---\n${JSON.stringify(palette.reactNativeTokens, null, 2)}`)
    break
  }

  case "critique": {
    const target = args[1]
    if (!target) {
      console.error("Usage: design critique <filePath | 'code_snippet'>")
      process.exit(1)
    }
    const content = fs.existsSync(target) ? fs.readFileSync(target, "utf-8") : target
    const report = ImpeccableEngine.critiqueCode(content)
    console.log(`=== AvA Design Critique Report ===`)
    console.log(`Register: ${report.register.toUpperCase()} | Score: ${report.score}/100 [${report.passed ? "PASS" : "FAIL"}]`)
    if (report.findings.length > 0) {
      console.log(`\nFindings:`)
      report.findings.forEach((f, i) => {
        console.log(`${i + 1}. [${f.severity}] (${f.pillar}) ${f.message}\n   👉 Suggestion: ${f.suggestion}`)
      })
    } else {
      console.log(`🎉 Zero anti-patterns detected. Flawless craftsmanship!`)
    }
    break
  }

  case "audit": {
    const targetDir = args[1] || "."
    const files: Array<{ path: string; content: string }> = []

    const scan = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (["node_modules", ".git", "dist", "build"].includes(entry.name)) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) scan(full)
        else if (/\.(tsx|jsx|html|vue|svelte|css)$/i.test(entry.name)) {
          files.push({ path: full, content: fs.readFileSync(full, "utf-8") })
        }
      }
    }

    if (fs.existsSync(targetDir)) {
      if (fs.statSync(targetDir).isFile()) {
        files.push({ path: targetDir, content: fs.readFileSync(targetDir, "utf-8") })
      } else {
        scan(targetDir)
      }
    }

    const tokens = TokenStore.getProjectTokens(targetDir)
    const report = DriftAuditor.auditDrift(files, tokens)
    console.log(`=== AvA Design Drift Audit ===`)
    console.log(`Scanned: ${files.length} files | Status: ${report.isClean ? "CLEAN" : `${report.findings.length} findings`}`)
    if (!report.isClean) {
      report.findings.slice(0, 20).forEach((f) => {
        console.log(`- [${f.file}:${f.line || 1}] [${f.type}] ${f.message}`)
      })
    }
    break
  }

  case "verify": {
    const targetDir = args[1] || "."
    const prompt = args[2] || "Design verification pass"
    const fileList = args.slice(3)

    let filesToCheck: string[] = fileList
    if (filesToCheck.length === 0) {
      // Find markup/style files in directory
      const scanFiles = (dir: string): string[] => {
        let acc: string[] = []
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const entry of entries) {
            if (["node_modules", ".git", "dist", "build", ".expo"].includes(entry.name)) continue
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) acc = acc.concat(scanFiles(full))
            else if (/\.(tsx|jsx|html|vue|svelte|css)$/i.test(entry.name)) {
              acc.push(full)
            }
          }
        } catch (_) {}
        return acc
      }
      filesToCheck = scanFiles(targetDir).slice(0, 10)
    }

    DesignVerifier.verify({
      directory: targetDir,
      userPrompt: prompt,
      changedFiles: filesToCheck,
    }).then((report) => {
      console.log(`=== AvA Full 5-Stage Design Verification ===`)
      console.log(`Summary: ${report.summary}`)
      console.log(`Status:  [${report.finalStatus}] (Score: ${report.score}/100)`)
      console.log(`Mode:    ${report.mode.toUpperCase()} | Register: ${report.register.toUpperCase()}`)
      console.log(`\nChecks Pipeline:`)
      report.checks.forEach((c) => {
        const icon = c.status === "PASS" ? "✅" : c.status === "WARN" ? "⚠️" : "❌"
        console.log(`${icon} [${c.stage}] ${c.name}: ${c.message}`)
      })
      if (report.blockers.length > 0) {
        console.log(`\n🚨 Blockers (${report.blockers.length}):`)
        report.blockers.forEach((b, i) => console.log(`  ${i + 1}. ${b}`))
      }
      if (report.warnings.length > 0) {
        console.log(`\n⚠️ Warnings (${report.warnings.length}):`)
        report.warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`))
      }
    })
    break
  }

  default:
    console.log(`AvA Master Design Engine CLI`)
    console.log(`Commands:`)
    console.log(`  palette [seed] [dark|light]       - Generate OKLCH tokens for Web & Mobile`)
    console.log(`  critique <file|code>              - Run heuristic UX/UI anti-slop audit`)
    console.log(`  audit [dir]                       - Scan files for token drift & arbitrary values`)
    console.log(`  verify [dir] [prompt] [files...]  - Run complete 5-stage design verification pipeline`)
    break
}
