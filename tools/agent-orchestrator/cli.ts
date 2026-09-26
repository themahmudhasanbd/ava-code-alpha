#!/usr/bin/env node
import { WorkflowEngine } from "./workflow-engine"
import type { TaskPrompt, ExecutionArtifact } from "./types"
import fs from "fs"
import path from "path"

async function runDemo() {
  console.log("=== AvA Autonomous Workflow Engine Demo ===")
  console.log("State Machine: Prompt -> Context Orchestrator -> Quality Gate -> Review -> (If Done: Final Output | If Polish/Fix: Loop to Step 2)\n")

  const tempFile = path.join("/tmp", "demo-card.tsx")

  const prompt: TaskPrompt = {
    id: "task-001",
    rawPrompt: "Design a high-end status badge card for Thunder Nexus",
    project: "ava-code",
    targetFiles: [tempFile],
    cwd: "/var/www/ava-code",
  }

  // Simulate an executor that generates dirty code in iteration 1 and clean code in iteration 2
  const simulatedExecutor = async (context: string, iteration: number): Promise<ExecutionArtifact> => {
    console.log(`\n🚀 [EXECUTION - Iteration ${iteration}] Received Orchestrated Context:`)
    console.log(context.split("\n").map(l => `   | ${l}`).join("\n"))

    if (iteration === 1) {
      // Intentionally write code with P0 slop (emoji + thick side-tab + gradient text)
      console.log(`\n✏️ Generating draft component with subtle issues...`)
      fs.writeFileSync(
        tempFile,
        `<div className="border-l-4 border-blue-600 bg-white p-4 shadow-xl">
           <span className="text-xs uppercase">01 STATUS</span>
           <h2 className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
             🚀 System Active
           </h2>
         </div>`
      )
    } else {
      // Fix based on Step 2 feedback: Use Lucide icon, double-bezel card, solid ink color
      console.log(`\n✨ Applying fixes based on Quality Gate feedback...`)
      fs.writeFileSync(
        tempFile,
        `import { Activity } from "lucide-react";
         export const StatusCard = () => (
           <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-foreground">
             <div className="flex items-center gap-2">
               <Activity className="w-4 h-4 text-primary" />
               <h2 className="text-base font-semibold tracking-tight">System Active</h2>
             </div>
           </div>
         );`
      )
    }

    return {
      filesModified: [tempFile],
      filesCreated: [],
      terminalCommandsRun: ["bun build"],
      executionSuccess: true,
    }
  }

  const report = await WorkflowEngine.run(prompt, simulatedExecutor, 3)

  console.log("\n==================================================")
  console.log("             WORKFLOW EXECUTION REPORT            ")
  console.log("==================================================")
  console.log(`Final Status:     [${report.finalStatus}]`)
  console.log(`Total Iterations: ${report.totalIterations} / ${report.maxIterations}`)
  console.log(`Quality Score:    ${report.finalOutput?.qualityScore}/100`)
  console.log(`Summary:          ${report.finalOutput?.summary}`)

  console.log("\nIteration Trace:")
  report.history.forEach((h) => {
    console.log(`\n[Iteration ${h.iteration}]`)
    console.log(`  - Quality Gate: ${h.qualityGateResult.summary}`)
    console.log(`  - Review Decision: ${h.reviewDecision.status} -> ${h.reviewDecision.justification}`)
    if (h.reviewDecision.feedback) {
      console.log(`  - Directives Sent to Step 2:`)
      h.reviewDecision.feedback.fixDirectives.forEach((d) => console.log(`     * ${d}`))
    }
  })

  // Cleanup demo file
  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
}

runDemo().catch(console.error)
