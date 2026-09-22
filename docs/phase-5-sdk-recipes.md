# Phase 5: SDK Implementation Recipes & Developer Guide

## 1. Overview

The AvA Core Alpha SDK (`@avacode/sdk`) enables developers to embed the autonomous coding agent in Node.js, Electron, Next.js, and backend services. This guide provides concrete implementation recipes for common agentic tasks.

---

## 2. Recipe 1: Initializing the Client & Starting a Thread

```typescript
import { Ava } from "@avacode/sdk";

// Initialize Ava with workspace configuration
const ava = new Ava({
  config: {
    model: "gemini-3.7-flash-tiered",
    model_provider: "google-antigravity",
  },
});

// Start a thread in a specific project directory
const thread = ava.startThread({
  workingDirectory: "/var/www/my-project",
  skipGitRepoCheck: true,
});

console.log(`Thread initialized with ID: ${thread.id}`);
```

---

## 3. Recipe 2: Streaming Events & Live Agent Output

To render real-time thoughts, terminal commands, and file edits in a web UI or mobile app, use `runStreamed()`:

```typescript
import { Ava } from "@avacode/sdk";

async function streamAgentTurn(prompt: string) {
  const ava = new Ava();
  const thread = ava.startThread({ workingDirectory: process.cwd() });

  const { events } = await thread.runStreamed(prompt);

  for await (const event of events) {
    switch (event.type) {
      case "item.started":
        console.log(`[Started] Item ${event.item.id} of type ${event.item.type}`);
        break;

      case "item.updated":
        if (event.item.type === "reasoning") {
          process.stdout.write(event.item.contentDelta || "");
        }
        break;

      case "item.completed":
        if (event.item.type === "command_execution") {
          console.log(`[Command] ${event.item.command} -> Exit: ${event.item.exitCode}`);
        } else if (event.item.type === "file_change") {
          console.log(`[File Edited] ${event.item.filePath}`);
        }
        break;

      case "turn.completed":
        console.log(`[Turn Finished] Tokens: In=${event.usage.inputTokens}, Out=${event.usage.outputTokens}`);
        break;
    }
  }
}
```

---

## 4. Recipe 3: Resuming Persistent Sessions

Sessions are saved automatically to `~/.ava/sessions/`. Resuming an existing conversation thread across app reboots requires only the thread ID:

```typescript
import { Ava } from "@avacode/sdk";

function continueConversation(savedThreadId: string, followupPrompt: string) {
  const ava = new Ava();
  
  // Reconstruct thread from persistent session storage
  const thread = ava.resumeThread(savedThreadId);
  
  return thread.run(followupPrompt);
}
```

---

## 5. Recipe 4: Structured Output Generation with Zod

Enforce deterministic, type-safe JSON schema output from the model:

```typescript
import { Ava } from "@avacode/sdk";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const AuditReportSchema = z.object({
  issuesFound: z.number(),
  criticalVulnerabilities: z.array(z.string()),
  recommendedAction: z.enum(["block_deployment", "proceed_with_warning", "pass"]),
});

async function runSecurityAudit() {
  const ava = new Ava();
  const thread = ava.startThread({ workingDirectory: process.cwd() });

  const turn = await thread.run("Audit dependencies and configuration for security flaws", {
    outputSchema: zodToJsonSchema(AuditReportSchema, { target: "openAi" }),
  });

  const report = JSON.parse(turn.finalResponse);
  console.log("Structured Audit Report:", report);
}
```

---

## 6. Recipe 5: Dynamic Google Antigravity Model Discovery

```typescript
import { Antigravity } from "@avacode/sdk/providers/antigravity";

async function listLiveAntigravityModels() {
  const antigravity = new Antigravity();
  const models = await antigravity.fetchAvailableModels();
  
  console.log("Discovered Antigravity Models:");
  for (const model of models) {
    console.log(`- ${model.displayName} (${model.id}): Context ${model.contextLimit} tokens`);
  }
}
```
