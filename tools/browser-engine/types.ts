export interface ViewportConfig {
  name: string
  width: number
  height: number
  isMobile?: boolean
  deviceScaleFactor?: number
}

export const STANDARD_VIEWPORTS: Record<string, ViewportConfig> = {
  desktop: {
    name: "Desktop Large",
    width: 1280,
    height: 800,
    isMobile: false,
    deviceScaleFactor: 1,
  },
  desktopTall: {
    name: "Desktop Full",
    width: 1280,
    height: 1800,
    isMobile: false,
    deviceScaleFactor: 1,
  },
  mobile: {
    name: "Mobile Standard (iPhone 14 / Modern Android)",
    width: 390,
    height: 844,
    isMobile: true,
    deviceScaleFactor: 2,
  },
  tablet: {
    name: "Tablet Portrait",
    width: 768,
    height: 1024,
    isMobile: false,
    deviceScaleFactor: 1.5,
  },
}

export interface ScreenshotResult {
  viewport: ViewportConfig
  outputPath: string
  fileSize: number
  success: boolean
  error?: string
}

export interface PageInspectionResult {
  url: string
  httpStatus: number
  title?: string
  hasHorizontalOverflow: boolean
  scrollWidth?: number
  clientWidth?: number
  consoleErrors: string[]
  screenshots: ScreenshotResult[]
  renderTimeMs: number
}

export interface VisualVerificationResult {
  url: string
  reachable: boolean
  visualScore: number // 0 - 100
  passed: boolean
  inspections: PageInspectionResult
  findings: string[]
  screenshotPaths: string[]
  summary: string
}
