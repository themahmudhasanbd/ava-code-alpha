import fs from "fs"
import path from "path"
import type { TaskPrompt, OrchestratedContext, LoopFeedback } from "./types"
import { TokenStore, DEFAULT_TOKENS } from "../design-engine/token-store"

export class ContextOrchestrator {
  /**
   * Orchestrates high-signal context for the current loop iteration
   */
  static async orchestrate(
    prompt: TaskPrompt,
    iteration: number,
    previousFeedback?: LoopFeedback
  ): Promise<OrchestratedContext> {
    const cwd = path.resolve(prompt.cwd || process.cwd())
    const projectRules: string[] = []
    const memoryContext: string[] = []

    // 1. Ingest project memory and AGENTS.md
    const agentsMdPath = path.join(cwd, "AGENTS.md")
    if (fs.existsSync(agentsMdPath)) {
      try {
        const agentsContent = fs.readFileSync(agentsMdPath, "utf-8")
        projectRules.push(`[AGENTS.md] ${agentsContent.slice(0, 500)}...`)
      } catch (_) {}
    }

    const memDir = "/root/Documents/agent workspace/mem/projects"
    const projectMemFile = path.join(memDir, `${prompt.project}.md`)
    if (fs.existsSync(projectMemFile)) {
      try {
        const memContent = fs.readFileSync(projectMemFile, "utf-8")
        memoryContext.push(`[Project Memory] ${memContent.slice(0, 500)}...`)
      } catch (_) {}
    }

    // 2. Resolve Design Tokens for UI tasks
    const designTokens = TokenStore.getProjectTokens(cwd) || DEFAULT_TOKENS

    // 3. Inspect affected / target files
    const affectedFiles: Array<{ path: string; exists: boolean; size?: number }> = []
    if (prompt.targetFiles && prompt.targetFiles.length > 0) {
      for (const f of prompt.targetFiles) {
        const fullPath = path.isAbsolute(f) ? f : path.resolve(cwd, f)
        const exists = fs.existsSync(fullPath)
        let size = 0
        if (exists) {
          try {
            size = fs.statSync(fullPath).size
          } catch (_) {}
        }
        affectedFiles.push({ path: fullPath, exists, size })
      }
    }

    // 4. Synthesize Iteration Directives (Step 2 feedback loop)
    const contextLines: string[] = []
    contextLines.push(`### TASK EXECUTION DIRECTIVE (Iteration ${iteration})`)
    contextLines.push(`**Objective**: ${prompt.rawPrompt}`)
    contextLines.push(`**Target Project**: ${prompt.project} (${cwd})`)

    if (previousFeedback && previousFeedback.reasons.length > 0) {
      contextLines.push(`\n⚠️ **FEEDBACK FROM PREVIOUS QUALITY GATE & REVIEW**:`)
      previousFeedback.reasons.forEach((r, idx) => {
        contextLines.push(`  ${idx + 1}. ${r}`)
      })
      if (previousFeedback.fixDirectives.length > 0) {
        contextLines.push(`\n🛠️ **MANDATORY FIX ACTIONS**:`)
        previousFeedback.fixDirectives.forEach((d, idx) => {
          contextLines.push(`  - [Priority ${idx + 1}] ${d}`)
        })
      }
    }

    return {
      projectId: prompt.project,
      iteration,
      projectRules,
      memoryContext,
      designTokens,
      affectedFiles,
      feedbackFromPreviousLoop: previousFeedback,
      compiledPromptContext: contextLines.join("\n"),
    }
  }
}
