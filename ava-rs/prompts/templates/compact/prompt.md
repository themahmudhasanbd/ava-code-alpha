You are performing a CONTEXT CHECKPOINT COMPACTION. Create a handoff summary for another LLM that will resume the task.

Include:
- Current progress and key decisions made
- Important context, constraints, or user preferences
- What remains to be done (clear next steps)
- Any critical data, examples, or references needed to continue

Be concise, structured, and focused on helping the next LLM seamlessly continue the work.

## Critical facts

End your summary with a `## Critical facts` section containing these machine-readable lines (use `- key: value` bullets, one per line):

- files: comma-separated paths of every file created, modified, moved, or deleted in the compacted history (e.g. `- files: src/a.ts, src/b.ts`)
- decisions: each key decision made, one bullet line per decision
- pending: each remaining next step or open question, one bullet line per item; if nothing remains, write `none`
- references: IDs, URLs, issue numbers, or other critical references, one bullet line per item; `none` if there are none

This section MUST be present verbatim (heading `## Critical facts`) even when some lines are `none` — a post-compaction verification step checks for it.
