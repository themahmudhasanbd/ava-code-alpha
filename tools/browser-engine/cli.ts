#!/usr/bin/env node
import { BrowserVerifier } from "./browser-verifier"
import { ChromeRunner } from "./chrome-runner"
import { STANDARD_VIEWPORTS } from "./types"
import path from "path"

const args = process.argv.slice(2)
const command = args[0] || "help"

async function main() {
  switch (command) {
    case "screenshot": {
      const url = args[1]
      const out = args[2] || "/tmp/screenshot.png"
      const width = parseInt(args[3], 10) || 1280
      const height = parseInt(args[4], 10) || 800

      if (!url) {
        console.error("Usage: ava-browser screenshot <url> [output.png] [width] [height]")
        process.exit(1)
      }

      console.log(`📸 Capturing screenshot for ${url} at ${width}x${height}...`)
      const res = await ChromeRunner.captureScreenshot(
        url,
        out,
        { name: "custom", width, height, isMobile: width < 600 }
      )
      if (res.success) {
        console.log(`✅ Saved: ${res.outputPath} (${(res.fileSize / 1024).toFixed(1)} KB)`)
      } else {
        console.error(`❌ Capture failed: ${res.error}`)
      }
      break
    }

    case "verify": {
      const url = args[1]
      if (!url) {
        console.error("Usage: ava-browser verify <url>")
        process.exit(1)
      }

      console.log(`🌐 Running multi-viewport visual verification on ${url}...`)
      const report = await BrowserVerifier.verifyUrl(url)
      console.log(`\n=== Visual Verification Report ===`)
      console.log(`Summary:      ${report.summary}`)
      console.log(`Visual Score: ${report.visualScore}/100 [${report.passed ? "PASS" : "FAIL"}]`)
      console.log(`Page Title:   ${report.inspections.title || "(None)"}`)
      console.log(`Render Time:  ${report.inspections.renderTimeMs}ms`)
      console.log(`Screenshots:`)
      report.screenshotPaths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`))
      if (report.findings.length > 0) {
        console.log(`Findings:`)
        report.findings.forEach((f) => console.log(`  - ⚠️ ${f}`))
      }
      break
    }

    case "dom": {
      const url = args[1]
      if (!url) {
        console.error("Usage: ava-browser dom <url>")
        process.exit(1)
      }
      const dom = await ChromeRunner.dumpDom(url)
      console.log(dom.slice(0, 1500) + (dom.length > 1500 ? "\n... [truncated]" : ""))
      break
    }

    default:
      console.log(`AvA Native Headless Browser Engine`)
      console.log(`Commands:`)
      console.log(`  screenshot <url> [output.png] [width] [height]  - Capture single screenshot`)
      console.log(`  verify <url>                                     - Run multi-viewport (Desktop + Mobile) verification`)
      console.log(`  dom <url>                                        - Dump rendered HTML DOM`)
      break
  }
}

main().catch(console.error)
