# AvA Autonomous Loop Engine

Implements the deterministic **6-Step Self-Healing Quality Loop**:

```
                               ┌────────────────────────────────────────────────────────┐
                               │                                                        │ (Need Polish /
                               ▼                                                        │  Data / Fix)
[ 1. PROMPT ] ───► [ 2. CONTEXT ORCHESTRATOR ] ───► [ 3. EXECUTION ] ───► [ 4. QUALITY GATE ] ───► [ 5. REVIEW ]
                          │                                                                              │
                          │                                                                              │ (Done)
                          │                                                                              ▼
                          └────────────────────────────────────────────────────────────────────► [ 6. FINAL OUTPUT ]
```

### Steps:
1. **Prompt**: Task input ingestion and classification.
2. **Context Orchestrator**: Ingests project memory, design tokens, file context, and prior loop feedback (blockers, fix directives).
3. **Execution**: Generates components, edits code, or runs commands.
4. **Quality Gate**: Automated multi-pillar validation (Anti-Slop, Zero-Emoji, Token Drift, Zero-Placeholder, Contrast $\ge 4.5:1$).
5. **Review**: Self-reflection evaluating whether quality score $\ge 70$ and zero P0 blockers exist.
   - If `DONE` $\rightarrow$ routes to **Final Output**.
   - If `NEEDS_REITERATION` $\rightarrow$ packages directives and routes **back to Step 2**.
6. **Final Output**: Emits verified production-grade delivery with full audit evidence.
