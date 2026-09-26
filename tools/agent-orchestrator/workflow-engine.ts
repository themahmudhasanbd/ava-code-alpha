import { ContextOrchestrator } from "./context-orchestrator"
import { QualityGate } from "./quality-gate"
import { Reviewer } from "./reviewer"
import type {
  TaskPrompt,
  WorkflowExecutionReport,
  WorkflowIterationRecord,
  ExecutionArtifact,
  LoopFeedback,
} from "./types"

export type ExecutionHandler = (
  promptContext: string,
  iteration: number
) => Promise<ExecutionArtifact>

export class WorkflowEngine {
  /**
   * Executes the prompt > context orchestrator > quality gate > review > loop state machine
   */
  static async run(
    prompt: TaskPrompt,
    executor: ExecutionHandler,
    maxIterations = 3
  ): Promise<WorkflowExecutionReport> {
    const history: WorkflowIterationRecord[] = []
    let currentFeedback: LoopFeedback | undefined = undefined
    let finalStatus: "SUCCESS" | "BLOCKED" | "MAX_ITERATIONS_REACHED" = "MAX_ITERATIONS_REACHED"

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      // ─── STEP 2: CONTEXT ORCHESTRATOR ──────────────────────────────────────
      const context = await ContextOrchestrator.orchestrate(prompt, iteration, currentFeedback)

      // ─── STEP 3: EXECUTION ─────────────────────────────────────────────────
      let artifact: ExecutionArtifact
      try {
        artifact = await executor(context.compiledPromptContext, iteration)
      } catch (err: any) {
        artifact = {
          filesModified: [],
          filesCreated: [],
          terminalCommandsRun: [],
          executionSuccess: false,
          error: err.message || String(err),
        }
      }

      // ─── STEP 4: QUALITY GATE ──────────────────────────────────────────────
      const allTouchedFiles = Array.from(
        new Set([...(prompt.targetFiles || []), ...artifact.filesModified, ...artifact.filesCreated])
      )
      const gateResult = QualityGate.evaluate(allTouchedFiles, prompt.rawPrompt)

      // ─── STEP 5: REVIEW ────────────────────────────────────────────────────
      const reviewDecision = Reviewer.review(prompt, iteration, artifact, gateResult)

      const record: WorkflowIterationRecord = {
        iteration,
        orchestratedContextSummary: `Compiled ${context.projectRules.length} rules, ${context.affectedFiles.length} files.`,
        executionArtifacts: artifact,
        qualityGateResult: gateResult,
        reviewDecision,
      }
      history.push(record)

      // ─── DECISION BRANCH ───────────────────────────────────────────────────
      if (reviewDecision.status === "DONE") {
        finalStatus = "SUCCESS"
        break
      } else {
        // Needs polish / data / fix -> prepare feedback for Step 2
        currentFeedback = reviewDecision.feedback
        if (iteration === maxIterations) {
          finalStatus = gateResult.p0Count > 0 ? "BLOCKED" : "MAX_ITERATIONS_REACHED"
        }
      }
    }

    // ─── STEP 6: FINAL OUTPUT ────────────────────────────────────────────────
    const lastRecord = history[history.length - 1]
    const filesChanged = lastRecord
      ? [...lastRecord.executionArtifacts.filesModified, ...lastRecord.executionArtifacts.filesCreated]
      : []

    return {
      promptId: prompt.id,
      initialPrompt: prompt.rawPrompt,
      totalIterations: history.length,
      maxIterations,
      finalStatus,
      history,
      finalOutput: {
        summary:
          finalStatus === "SUCCESS"
            ? `Successfully completed task in ${history.length} iteration(s) with Quality Score ${lastRecord?.qualityGateResult.score || 100}/100.`
            : `Task concluded with status [${finalStatus}] after ${history.length} iteration(s).`,
        filesChanged,
        qualityScore: lastRecord?.qualityGateResult.score || 0,
        evidence: lastRecord ? lastRecord.qualityGateResult.findings.map((f) => `[${f.severity}] ${f.message}`) : [],
      },
    }
  }
}
