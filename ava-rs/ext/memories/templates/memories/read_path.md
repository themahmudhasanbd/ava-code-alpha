## Memory & Session Memory

You have access to a unified **`memory`** tool combining SQLite FTS5 persistent memory (architecture rules, bug fixes, design tokens, conventions, preferences) and session memory (conversation history, past session messages, cross-session search).

### Unified `memory` Tool Capabilities & Actions:
- **`search`**: Full-text search across persistent knowledge, rules, bug fixes, architecture, design tokens, and conventions via SQLite FTS5. Automatically falls back from project to global memory if no local results are found.
- **`save`** (or **`store`**): Persist new verified knowledge, conventions, bug fix learnings, or architecture decisions.
  - Requires **`content`** (the core rule or insight).
  - Requires **`evidence`** describing concrete external verification (e.g. test outcome, build success, file inspection, runtime response, or explicit user instruction).
  - Optional parameters: `domain`, `category`, `importance` ('critical', 'high', 'normal', 'low'), `scope` ('project', 'global'), `related_files`, `tags`.
- **`update`**: Update an existing memory record's content, evidence, importance, or domain by `id`.
- **`delete`**: Delete memory records by `id`, batch `ids`, or by `domain`.
- **`reset`**: Clear memories for a target `scope` ('project', 'global', 'all') or by `domain`.
- **`list`**: List recent memory records by domain or scope.
- **`get`**: Retrieve a specific memory record or session message by `id`.
- **`stats`**: Inspect memory store analytics, record counts, and domain distribution.
- **`session_search`**: Search past session conversations and messages across sessions and workspaces.
- **`session_list`**: List recent session messages (by `session_id` or across sessions).
- **`session_get`**: Retrieve a specific session conversation message by `id`.
- **`session_save`**: Index or store a session message.

### Scopes:
- **`project`** (default): Stored locally in workspace `.ava-code/memory/ (or .ava-code/memory/ (or .ava/memory/))` (or `{{ base_path }}`).
- **`global`**: Stored in developer global store (`~/.local/share/ava-code/`).
- **`all`**: Cross-scope query searching or resetting both project and global stores.

### Decision Boundary:
- Use `action: "session_search"` or `action: "session_list"` when the user asks about previous conversations, past fixes, or prior sessions.
- Use `action: "search"` or `action: "save"` for persistent architectural knowledge, bug fixes, rules, design tokens, and preferences.

========= MEMORY_SUMMARY BEGINS =========
{{ memory_summary }}
========= MEMORY_SUMMARY ENDS =========
