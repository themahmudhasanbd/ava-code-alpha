export type StepName = 
  | "STEP_1_PROMPT"
  | "STEP_2_CONTEXT_ORCHESTRATOR"
  | "STEP_3_EXECUTION"
  | "STEP_4_QUALITY_GATE"
  | "STEP_5_REVIEW"
  | "STEP_6_FINAL_OUTPUT"

export interface TaskPrompt {
  id: string
  rawPrompt: string
  project: string
  targetFiles?: string[]
  cwd: string
  metadata?: Record<string, any>
}

export interface OrchestratedContext {
  projectId: string
  iteration: number
  projectRules: string[]
  memoryContext: string[]
  designTokens?: Record<string, any>
  affectedFiles: Array<{ path: string; exists: boolean; size?: number }>
  gitStatus?: string
  feedbackFromPreviousLoop?: LoopFeedback
  compiledPromptContext: string
}

export interface ExecutionArtifact {
  filesModified: string[]
  filesCreated: string[]
  terminalCommandsRun: string[]
  rawOutputSnippet?: string
  executionSuccess: boolean
  error?: string
}

export interface QualityGateFinding {
  pillar: "syntax" | "design_anti_slop" | "contrast" | "token_drift" | "placeholder_stubs" | "tests"
  severity: "P0" | "P1" | "P2"
  message: string
  file?: string
  line?: number
  suggestion?: string
}

export interface QualityGateResult {
  passed: boolean
  score: number // 0 - 100
  p0Count: number
  p1Count: number
  findings: QualityGateFinding[]
  summary: string
  timestamp: string
}

export interface LoopFeedback {
  iteration: number
  needsFix: boolean
  needsPolish: boolean
  needsData: boolean
  reasons: string[]
  fixDirectives: string[]
  blockers: string[]
}

export interface ReviewDecision {
  status: "DONE" | "NEEDS_REITERATION"
  score: number
  feedback?: LoopFeedback
  justification: string
}

export interface WorkflowIterationRecord {
  iteration: number
  orchestratedContextSummary: string
  executionArtifacts: ExecutionArtifact
  qualityGateResult: QualityGateResult
  reviewDecision: ReviewDecision
}

export interface WorkflowExecutionReport {
  promptId: string
  initialPrompt: string
  totalIterations: number
  maxIterations: number
  finalStatus: "SUCCESS" | "BLOCKED" | "MAX_ITERATIONS_REACHED"
  history: WorkflowIterationRecord[]
  finalOutput?: {
    summary: string
    filesChanged: string[]
    qualityScore: number
    evidence: string[]
  }
}
