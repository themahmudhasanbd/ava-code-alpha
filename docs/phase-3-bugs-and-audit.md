# Phase 3: Comprehensive Bug Audit & Vulnerability Report

## 1. Audit Scope & Executive Summary

This audit evaluates the codebase of AvA Code Alpha across `apps/server/src/index.ts`, `apps/mobile/lib/`, `sdk/typescript/`, and configuration layers (`/root/.config/ava/config.toml`). 

**Note**: Per user instructions, **no source code changes or bug fixes are applied in this phase**. This document categorizes, documents, and provides architectural remediation paths for all identified bugs.

---

## 2. Critical & High-Priority Bugs

### 🚨 Bug 1: In-Memory Thread State Volatility & Persistence Loss
- **Location**: `apps/server/src/index.ts` (`let threads: ThreadItem[] = []`)
- **Severity**: Critical (Data Loss)
- **Description**: 
  The backend server stores all active conversation threads in a volatile Node.js in-memory array. Whenever PM2 restarts the process, the server is reloaded, or an unhandled exception occurs, all active threads and conversation history are erased.
- **Root Cause**:
  Lack of integration with the persistent session store or the AvA Core Alpha SDK.
- **Architectural Fix**:
  Delegate session management to `@avacode/sdk`, using `ava.startThread()` and `ava.resumeThread(id)` which persist state to `~/.ava/sessions/` on disk.

---

### 🚨 Bug 2: Thread Rollback Turn Calculation & State Corruption
- **Location**: `apps/server/src/index.ts` (`case "thread/rollback"`)
- **Severity**: High (State Corruption)
- **Description**:
  The rollback logic computes the slice limit using `const targetLength = Math.max(0, (toTurnIndex + 1) * 2)`.
- **Root Cause**:
  This assumes a strict naive schema of exactly two items per turn (`[UserMessage, AssistantMessage]`). In real agent execution, a single turn produces multiple items:
  1. `ReasoningItem` (Thoughts)
  2. Multiple `CommandExecutionItem` (Shell executions)
  3. `FileChangeItem` (Diffs)
  4. Final Assistant response
  Multiplying `toTurnIndex * 2` slices directly into the middle of turn tool actions, corrupting thread structure and causing client crashes.
- **Architectural Fix**:
  Track `turnId` or turn metadata per message/item, and filter messages by `turnIndex <= toTurnIndex` rather than raw array index multiplication.

---

### 🚨 Bug 3: Thread Fork Shallow Reference Leak
- **Location**: `apps/server/src/index.ts` (`case "thread/fork"`)
- **Severity**: High (Data Corruption)
- **Description**:
  When creating a fork, the server uses `messages: [...targetMessages]`. While this creates a shallow copy of the array, the inner message objects retain identical memory references.
- **Impact**:
  Modifying a message or appending tool output in the forked thread mutates the original parent thread in-place.
- **Architectural Fix**:
  Perform a deep copy (`JSON.parse(JSON.stringify(targetMessages))` or structured clone) when branching threads.

---

### 🚨 Bug 4: Command Injection Vulnerability in `file/grep`
- **Location**: `apps/server/src/index.ts` (`case "file/grep"`)
- **Severity**: Critical (Security Vulnerability)
- **Description**:
  The grep endpoint executes:
  ```typescript
  exec(`grep -rnI --max-count=100 "${query}" .`, { cwd: targetPath }, (err, stdout) => { ... })
  ```
  If a user or prompt injects shell metacharacters (e.g. `foo" ; rm -rf / ; #`), the shell evaluates arbitrary commands.
- **Architectural Fix**:
  Use `execFile("grep", ["-rnI", "--max-count=100", query, "."], { cwd: targetPath })` or use native Node.js filesystem traversal / ripgrep binary bindings with argument escaping.

---

## 3. Medium & Architectural Inconsistencies

### ⚠️ Bug 5: Hardcoded Config & Dummy Model Returns
- **Location**: `apps/server/src/index.ts` (`case "config/read"`, `case "models/list"`)
- **Severity**: Medium
- **Description**:
  The `config/read` endpoint returns hardcoded mock strings (such as `"gemini-3.7-flash-tiered"`) rather than parsing `/root/.config/ava/config.toml` or calling `Antigravity.fetchAvailableModels()`.
- **Impact**:
  Changes made to TOML files or dynamic provider token states are ignored by the frontend.

---

### ⚠️ Bug 6: Mobile Client RPC Response Shape Mismatch
- **Location**: `apps/mobile/lib/presentation/state/thread_controller.dart` vs `apps/server/src/index.ts`
- **Severity**: Medium
- **Description**:
  In `apps/mobile`, the Flutter `ThreadController` expects `thread/fork` to return a `Map<String, dynamic>` representing the new thread directly or under `result.thread`. In some code paths, the server returned `{ isSuccess: true, thread: ... }` while Flutter expected `{ "id": ..., "title": ... }`. Null checks in Dart would throw `TypeError: null is not a subtype of type 'Map<String, dynamic>'`.

---

### ⚠️ Bug 7: Lack of Automatic OAuth Token Refresh in Server
- **Location**: `apps/server/src/index.ts`
- **Severity**: Medium
- **Description**:
  When the Google Antigravity OAuth access token expires after 3600 seconds, the server has no token rotation loop, resulting in HTTP 401 Unauthorized errors on subsequent inference turns.
- **Remediation**:
  Use `@avacode/sdk`'s `Antigravity` provider class, which contains built-in refresh logic via `Antigravity.refreshToken()`.

---

## 4. Bug Summary Table

| ID | Component | Issue | Severity | Status |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | `apps/server` | Volatile in-memory `threads` array (wiped on restart) | **Critical** | Documented |
| **BUG-02** | `apps/server` | Broken `toTurnIndex * 2` rollback calculation | **High** | Documented |
| **BUG-03** | `apps/server` | Shallow reference mutation in `thread/fork` | **High** | Documented |
| **BUG-04** | `apps/server` | Unescaped shell command interpolation in `file/grep` | **Critical** | Documented |
| **BUG-05** | `apps/server` | Hardcoded config & model lists in RPC handlers | **Medium** | Documented |
| **BUG-06** | `apps/mobile` | Dart RPC response parsing type mismatch | **Medium** | Documented |
| **BUG-07** | `apps/server` | Missing automated Google OAuth token refresh loop | **Medium** | Documented |
