---
name: project-manager
description: Core workflow skill for managing any software project — new or existing. Use at the START of every project session, whenever a new project is initialized, or when resuming work on an existing codebase. Triggers on phrases like "start a new project", "let's build", "I have a project", "continue working on", "new app", "new website", or any coding task beginning without existing documented context. Enforces structured planning, documentation, memory, and clean code standards. Always use before writing any code.
---

# Project Manager — Core Workflow Skill

This skill governs how every project is approached, structured, and maintained. Follow it from the very first message of any new or existing project session.

---

## Step 1 — Identify Project Type

Before anything else, determine:

- **New project** → Follow the [New Project Workflow](#new-project-workflow)
- **Existing project** → Follow the [Existing Project Workflow](#existing-project-workflow)

---

## New Project Workflow

### Phase 1 — Clarify Goals

1. Ask the user to clearly define:
   - What the project does (core purpose)
   - Who the target users are
   - Key features for the first version
   - Tech stack preferences (or suggest based on context)
2. Do **not** proceed until goals are unambiguous.
3. If anything is unclear, ask focused follow-up questions — one at a time.

### Phase 2 — Create Documentation Structure

Once goals are clear, set up the `/docs` folder and all required files **before writing any code**.

```
/docs/
  plan.md           ← Project goals, phases, feature list
  visual.md         ← UI/UX description, wireframe notes, user flows
  file-structure.md ← Full directory and file layout
  database.md       ← Schema, tables, relationships, RLS policies
  /design/
    design.md       ← Brand identity, color palette, typography, component style
  /memory/
    memory.md       ← Session memory — updated after every significant change
```

Populate each file based on what has been discussed. Leave clearly marked `TODO:` sections for anything still pending.

### Phase 3 — Design Research & Brand Identity

Before writing design code:

1. Understand the project's goal and its target audience.
2. Research similar products/brands for visual direction.
3. Define in `/docs/design/design.md`:
   - Color palette (primary, secondary, accent, background)
   - Typography (font choices, scale)
   - Component style (rounded vs sharp, minimal vs rich, etc.)
   - Brand tone (playful, professional, futuristic, etc.)
   - Key reusable design tokens (logo, site title, card style, button style)

### Phase 4 — Project Setup

Create the following utility folders:

```
/test-temp/    ← Temporary files and test scripts (never ship these)
/backup/       ← Zipped backups before critical changes
```

Then verify and install:

- Required frameworks and libraries
- MCP servers if needed (e.g., Supabase MCP, GitHub MCP)
- Linters, formatters, type checkers
- Any plugins or tools required for the stack

### Phase 5 — Divide into Phases

Break the project into clear delivery phases. Example:

```
Phase 1 — Foundation (auth, layout, routing)
Phase 2 — Core features
Phase 3 — Polish & UX
Phase 4 — Production readiness (testing, SEO, performance)
Phase 5 — Deployment
```

Document phases in `/docs/plan.md`.

### Phase 6 — Begin Coding (Only After Phases 1–5 Are Complete)

Follow the [Code Quality Rules](#code-quality-rules) at all times.

---

## Existing Project Workflow

### Step 1 — Read the Docs

Check if `/docs/` exists:

**If yes:**
- Read `plan.md`, `visual.md`, `file-structure.md`, `database.md`, `design/design.md`, and `memory/memory.md`
- Follow the documented conventions exactly
- Continue from where the last session left off

**If no docs exist:**
- Scan the codebase structure, read key files, and infer the project's purpose and patterns
- Create `/docs/` and populate it based on what you find
- Confirm your understanding with the user before making changes

### Step 2 — Resume Work

- Follow all [Code Quality Rules](#code-quality-rules)
- Update memory and docs after every meaningful change

---

## Code Quality Rules

- Write **production-ready** code from the start — no placeholders or "fix later" shortcuts
- Split code into **separate files** by feature/concern — never put everything in one file
- Use **reusable components** for repeated UI elements (Button, Card, Logo, SiteTitle, etc.)
- Use **CSS variables / design tokens** for colors, spacing, and typography
- Add **clear comments** at the top of each file and above complex logic blocks
- Follow the framework's **official conventions** (e.g., Next.js App Router patterns)
- Keep the codebase **clean** — remove dead code, unused imports, and debug logs

### After Every Code Change

1. Check for TypeScript/lint errors
2. Test the changed functionality manually or with a test script in `/test-temp/`
3. Update `/docs/memory/memory.md` with what changed and why
4. If the change was large or risky → zip affected files into `/backup/` first

---

## Memory Management

`/docs/memory/memory.md` must stay up to date at all times.

Include:

- What was built in the last session
- Current state of each phase
- Any decisions made and why
- Known issues or TODOs
- Environment variables or config notes (no secrets — just key names)

Update this file **after every significant code change**, not just at session end.

---

## Backup Protocol

Before any critical or large-scale change:

```bash
zip -r backup/backup-$(date +%Y%m%d-%H%M%S).zip <affected-folder>
```

Examples of when to backup:

- Changing database schema
- Refactoring a major feature
- Upgrading a core dependency
- Deleting or renaming files in bulk

---

## Quick Reference Checklist

### New Project

- [ ] Goals clarified
- [ ] `/docs/` created with all required files
- [ ] Design research done, `design.md` populated
- [ ] `/test-temp/` and `/backup/` created
- [ ] Tools, MCPs, and dependencies installed
- [ ] Project phases defined in `plan.md`
- [ ] Coding started only after all above are done

### Every Code Change

- [ ] Backup taken if change is critical
- [ ] Code split across appropriate files
- [ ] Reusable components used where applicable
- [ ] Comments added
- [ ] Errors/lint checked
- [ ] `memory.md` updated
