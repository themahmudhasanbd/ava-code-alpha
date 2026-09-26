import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import type { ViewportConfig, ScreenshotResult } from "./types"

export class ChromeRunner {
  private static CHROME_PATHS = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]

  /**
   * Discovers system Chrome executable path
   */
  static getChromeBinary(): string {
    for (const p of this.CHROME_PATHS) {
      if (fs.existsSync(p)) return p
    }
    throw new Error("No Google Chrome / Chromium executable found on the host system.")
  }

  /**
   * Captures a high-resolution screenshot using headless Chrome
   */
  static async captureScreenshot(
    url: string,
    outputPath: string,
    viewport: ViewportConfig
  ): Promise<ScreenshotResult> {
    const chromePath = this.getChromeBinary()
    const resolvedOut = path.resolve(outputPath)
    const outDir = path.dirname(resolvedOut)

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }

    const args = [
      "--headless",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-software-rasterizer",
      "--disable-extensions",
      "--hide-scrollbars",
      `--window-size=${viewport.width},${viewport.height}`,
      `--screenshot=${resolvedOut}`,
      url,
    ]

    return new Promise((resolve) => {
      const child = spawn(chromePath, args, { stdio: ["ignore", "pipe", "pipe"] })

      let stderr = ""
      child.stderr.on("data", (d) => {
        stderr += d.toString()
      })

      const timeout = setTimeout(() => {
        child.kill("SIGKILL")
        resolve({
          viewport,
          outputPath: resolvedOut,
          fileSize: 0,
          success: false,
          error: "Headless Chrome timed out after 10s",
        })
      }, 10000)

      child.on("close", (code) => {
        clearTimeout(timeout)
        if (fs.existsSync(resolvedOut) && fs.statSync(resolvedOut).size > 0) {
          const stats = fs.statSync(resolvedOut)
          resolve({
            viewport,
            outputPath: resolvedOut,
            fileSize: stats.size,
            success: true,
          })
        } else {
          resolve({
            viewport,
            outputPath: resolvedOut,
            fileSize: 0,
            success: false,
            error: stderr || `Chrome exited with code ${code}`,
          })
        }
      })
    })
  }

  /**
   * Dumps rendered DOM HTML from the page
   */
  static async dumpDom(url: string): Promise<string> {
    const chromePath = this.getChromeBinary()
    const args = [
      "--headless",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-software-rasterizer",
      "--dump-dom",
      url,
    ]

    return new Promise((resolve, reject) => {
      const child = spawn(chromePath, args, { stdio: ["ignore", "pipe", "pipe"] })

      let stdout = ""
      let stderr = ""

      child.stdout.on("data", (d) => {
        stdout += d.toString()
      })
      child.stderr.on("data", (d) => {
        stderr += d.toString()
      })

      const timeout = setTimeout(() => {
        child.kill("SIGKILL")
        reject(new Error("Headless Chrome dump-dom timed out after 10s"))
      }, 10000)

      child.on("close", (code) => {
        clearTimeout(timeout)
        if (code === 0 || stdout.length > 0) resolve(stdout)
        else reject(new Error(stderr || `Chrome exited with code ${code}`))
      })
    })
  }
}
