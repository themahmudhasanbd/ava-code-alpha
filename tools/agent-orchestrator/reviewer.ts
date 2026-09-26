import type { ReviewDecision, QualityGateResult, ExecutionArtifact, LoopFeedback, TaskPrompt } from "./types"

export class Reviewer {
  /**
   * Reviews execution artifacts and quality gate findings against the user prompt
   */
  static review(
    prompt: TaskPrompt,
    iteration: number,
    artifact: ExecutionArtifact,
    gateResult: QualityGateResult
  ): ReviewDecision {
    // 1. If execution threw a runtime/compilation error
    if (!artifact.executionSuccess) {
      const feedback: LoopFeedback = {
        iteration,
        needsFix: true,
        needsPolish: false,
        needsData: false,
        reasons: [`Execution failure: ${artifact.error || "Unknown execution error"}`],
        fixDirectives: ["Fix runtime exception and re-verify syntax."],
        blockers: [artifact.error || "Execution error"],
      }

      return {
        status: "NEEDS_REITERATION",
        score: 0,
        feedback,
        justification: "Execution failed during artifact processing. Requires iterative fix.",
      }
    }

    // 2. If Quality Gate failed (P0 blockers present or score < 70)
    if (!gateResult.passed || gateResult.p0Count > 0) {
      const reasons: string[] = []
      const fixDirectives: string[] = []
      const blockers: string[] = []

      for (const finding of gateResult.findings) {
        if (finding.severity === "P0") {
          reasons.push(`[P0 Blocker] ${finding.file ? `${finding.file}: ` : ""}${finding.message}`)
          blockers.push(finding.message)
          if (finding.suggestion) fixDirectives.push(finding.suggestion)
        } else if (finding.severity === "P1") {
          reasons.push(`[P1 Warning] ${finding.file ? `${finding.file}: ` : ""}${finding.message}`)
          if (finding.suggestion) fixDirectives.push(finding.suggestion)
        }
      }

      const feedback: LoopFeedback = {
        iteration,
        needsFix: gateResult.p0Count > 0,
        needsPolish: gateResult.p1Count > 0,
        needsData: false,
        reasons,
        fixDirectives,
        blockers,
      }

      return {
        status: "NEEDS_REITERATION",
        score: gateResult.score,
        feedback,
        justification: `Quality gate flagged ${gateResult.p0Count} P0 blockers and ${gateResult.p1Count} P1 warnings. Routing back to Step 2 (Context Orchestrator).`,
      }
    }

    // 3. Complete and Approved!
    return {
      status: "DONE",
      score: gateResult.score,
      justification: `All quality gates passed with score ${gateResult.score}/100. Zero P0 blockers. Production-ready.`,
    }
  }
}
