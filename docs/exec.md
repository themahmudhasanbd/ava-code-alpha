# Non-Interactive & Headless Execution

AvA Code Alpha can execute coding tasks headlessly without opening the interactive terminal UI.

## 1. CLI Headless Execution

```bash
ava exec --prompt "Run cargo test and fix any compilation errors" --model gemini-3.7-flash-tiered
```

## 2. Programmatic Execution via AvA Core Alpha SDK

To execute non-interactive agent tasks within custom scripts, pipelines, or web servers:

```typescript
import { Ava } from "@avacode/sdk";

const ava = new Ava();
const thread = ava.startThread({ workingDirectory: process.cwd() });
const turn = await thread.run("Analyze code quality and output markdown report");

console.log(turn.finalResponse);
```

For more recipes, see [Phase 5: SDK Implementation Recipes](file:///var/www/ava-code/docs/phase-5-sdk-recipes.md).
