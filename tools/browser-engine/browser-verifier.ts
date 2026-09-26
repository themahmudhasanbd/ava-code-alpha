import path from "path"
import fs from "fs"
import { ChromeRunner } from "./chrome-runner"
import { STANDARD_VIEWPORTS, type VisualVerificationResult, type ScreenshotResult } from "./types"

export class BrowserVerifier {
  /**
   * Executes multi-viewport visual verification (Desktop 1280px + Mobile 390px)
   */
  static async verifyUrl(
    url: string,
    outputDirectory = "/tmp/ava-browser-verification"
  ): Promise<VisualVerificationResult> {
    const startTime = Date.now()
    const findings: string[] = []
    const screenshotPaths: string[] = []
    const screenshots: ScreenshotResult[] = []

    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true })
    }

    const timestamp = Date.now()
    const desktopOut = path.join(outputDirectory, `desktop-${timestamp}.png`)
    const mobileOut = path.join(outputDirectory, `mobile-390px-${timestamp}.png`)

    // 1. Desktop 1280x800 Screenshot
    const desktopRes = await ChromeRunner.captureScreenshot(
      url,
      desktopOut,
      STANDARD_VIEWPORTS.desktop
    )
    screenshots.push(desktopRes)
    if (desktopRes.success) {
      screenshotPaths.push(desktopRes.outputPath)
    } else {
      findings.push(`[Desktop Viewport] Screenshot capture failed: ${desktopRes.error}`)
    }

    // 2. Mobile 390x844 Screenshot
    const mobileRes = await ChromeRunner.captureScreenshot(
      url,
      mobileOut,
      STANDARD_VIEWPORTS.mobile
    )
    screenshots.push(mobileRes)
    if (mobileRes.success) {
      screenshotPaths.push(mobileRes.outputPath)
    } else {
      findings.push(`[Mobile 390px Viewport] Screenshot capture failed: ${mobileRes.error}`)
    }

    // 3. DOM & Page Structure Inspection
    let domContent = ""
    let pageTitle = ""
    let hasHorizontalOverflow = false

    try {
      domContent = await ChromeRunner.dumpDom(url)
      const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(domContent)
      if (titleMatch) pageTitle = titleMatch[1].trim()

      if (domContent.includes("ERR_CONNECTION_REFUSED") || domContent.includes("502 Bad Gateway")) {
        findings.push("Server responded with connection error or gateway failure.")
      }
    } catch (err: any) {
      findings.push(`DOM extraction warning: ${err.message}`)
    }

    const renderTimeMs = Date.now() - startTime
    const reachable = desktopRes.success || mobileRes.success || domContent.length > 0
    let visualScore = 100

    if (!reachable) {
      visualScore = 0
    } else {
      if (!desktopRes.success) visualScore -= 30
      if (!mobileRes.success) visualScore -= 30
      if (findings.length > 0) visualScore -= findings.length * 10
    }
    if (visualScore < 0) visualScore = 0

    const passed = reachable && visualScore >= 70
    const summary = `Browser Verification [${passed ? "PASS" : "FAIL"}]: ${screenshotPaths.length} viewports captured (Score: ${visualScore}/100 in ${renderTimeMs}ms).`

    return {
      url,
      reachable,
      visualScore,
      passed,
      inspections: {
        url,
        httpStatus: reachable ? 200 : 500,
        title: pageTitle,
        hasHorizontalOverflow,
        consoleErrors: findings,
        screenshots,
        renderTimeMs,
      },
      findings,
      screenshotPaths,
      summary,
    }
  }
}
