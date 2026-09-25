---
name: persistent-memory
description: Use the persistent project memory system across Claude Code, Codex, and Antigravity to store, search, and recall project architecture, decisions, learnings, bugs, preferences, and progress using SQLite FTS5.
---

# Persistent Memory Skill

This skill guides all AI agents (Claude Code, Codex, Antigravity, OpenCode) to continuously utilize the central Persistent Memory MCP server (`/memory` endpoint).

## Memory System Capabilities

1. **`memory_store`**:
   - Store memories with: `project_id`, `category`, `title`, `content`, `metadata`, `importance` (1-10).
   - **Automatic Consolidation**: Automatically de-duplicates or updates existing memories if a similar item exists in the same category & project.
   - **Categories**: `project`, `architecture`, `decision`, `bug`, `learning`, `preference`, `progress`.

2. **`memory_search`**:
   - Full-text search (SQLite FTS5) across titles, content, and metadata.
   - Filter by `project_id` and `category`.

3. **`memory_get_project_context`**:
   - Fetch active consolidated memory context for any project formatted in structured Markdown or JSON.

4. **`memory_add_decision`**:
   - Capture architectural choices, rationale, alternatives considered, and consequences.

5. **`memory_add_learning`**:
   - Capture technical insights, pitfalls encountered, and exact solutions/best practices.

6. **`memory_get` / `memory_update` / `memory_delete`**:
   - Direct record retrieval, updates, and soft/hard deletion.

---

## Autonomous Agent Workflow

### When Starting a Project Task:
- Call `memory_get_project_context(project_id: "<project-name>")` or `memory_search(query: "<topic>", project_id: "<project-name>")` to recall existing architecture and decisions.

### When Making Significant Architectural Decisions:
- Call `memory_add_decision(...)` with the chosen approach, why it was chosen over alternatives, and trade-offs.

### When Resolving Bugs or Discovering Nuances:
- Call `memory_add_learning(...)` with the issue, root cause, and clean fix pattern.

### When Completing a Milestone:
- Call `memory_store(category: "progress", ...)` to document the state of completion for the next agent session.
