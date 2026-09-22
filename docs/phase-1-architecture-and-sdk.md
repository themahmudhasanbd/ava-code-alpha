# Phase 1: Architecture & AvA Core Alpha SDK Integration

## 1. Executive Summary & System Topology

AvA Code Alpha is an autonomous coding agent environment designed for deep multi-turn refactoring, code synthesis, tool execution, and local sandboxing. The platform connects modern cross-platform interfaces (Flutter Web/Mobile & Desktop) to high-performance inference backends via an intermediate JSON-RPC 2.0 App-Server and the native **AvA Core Alpha SDK** (`@avacode/sdk` in TypeScript, `ava` in Python, and `ava-rs` in Rust).

```mermaid
graph TD
    Client[Flutter Mobile / Web UI] -->|JSON-RPC 2.0 / WebSocket / SSE| AppServer[App Server Node.js / TypeScript]
    AppServer -->|@avacode/sdk| CoreSDK[AvA Core Alpha SDK]
    CoreSDK -->|IPC / Subprocess / JSONL| RustEngine[ava-rs Rust Engine & Sandboxing]
    CoreSDK -->|OAuth 2.0 / CodeAssist API| Antigravity[Google Antigravity Provider]
    CoreSDK -->|MCP JSON-RPC| MCP[MCP Tools & Servers]
    RustEngine -->|Seatbelt / Landlock / Docker| HostOS[Host Operating System / Workspace]
```

---

## 2. Why Use the AvA Core Alpha SDK?

Integrating the **AvA Core Alpha SDK** (`@avacode/sdk`) in the App-Server layer (`apps/server`) dramatically simplifies implementation, eliminates fragile in-memory custom state machines, and provides battle-tested reliability:

### Key Advantages of AvA Core Alpha SDK:
1. **Built-in Session Persistence**:
   - Instead of maintaining temporary JavaScript arrays (`let threads = []`) that evaporate on server restart, `@avacode/sdk` automatically manages durable sessions in `~/.ava/sessions/`.
   - Reconnection is as simple as calling `ava.resumeThread(threadId)`.

2. **Async Generator Event Streaming**:
   - SDK provides typed async iteration over turn events (`item.started`, `item.updated`, `item.completed`, `turn.completed`), abstracting raw process `stdout`/`stderr` parsing.

3. **Native Google Antigravity Provider**:
   - Built-in `Antigravity` class handles Google Cloud Code / Antigravity OAuth 2.0 handshake, automatic token refresh rotation, and model discovery (`fetchAvailableModels()`), removing hardcoded model catalogs.

4. **Structured Tool & Item Typing**:
   - Strong TypeScript contracts for all agent outputs:
     - `ReasoningItem` (Internal thinking & chain-of-thought)
     - `CommandExecutionItem` (Terminal execution with exit codes and output)
     - `FileChangeItem` (Unified diffs, patches, file creations)
     - `McpToolCallItem` (External MCP integrations)

5. **Cross-Platform Sandboxing & Environment Control**:
   - Precise isolation settings (`sandbox_workspace_write`, `read_only`, `network_access`) configurable programmatically via SDK options.

---

## 3. SDK Architecture Overview

The AvA Core Alpha SDK is structured into modular layers:

| Module | Location | Purpose |
| :--- | :--- | :--- |
| **`Ava` Client** | `sdk/typescript/src/ava.ts` | Main client entry point; manages global config, environment overrides, CLI paths, and spawns `Thread` instances. |
| **`Thread`** | `sdk/typescript/src/thread.ts` | State machine for a conversation thread. Supports `run()` (buffered) and `runStreamed()` (async generator). |
| **`Antigravity` Provider** | `sdk/typescript/src/providers/antigravity.ts` | Dynamic Google Antigravity OAuth token manager, model discovery, and CodeAssist endpoint router. |
| **`Items` & `Events`** | `sdk/typescript/src/items.ts`, `events.ts` | Strongly typed domain models representing stream events and conversation items. |
| **Process Executor** | `sdk/typescript/src/exec.ts` | Robust child-process lifecycle manager with JSONL streaming serialization and error trapping. |

---

## 4. Architectural Comparison: Raw Process Execution vs. AvA SDK

```
+-------------------------------------------------------------------------------+
| Approach A: Raw Process / In-Memory State (Current Fragile Server Pattern)     |
+-------------------------------------------------------------------------------+
|  - Manual CLI argument construction and spawn management                     |
|  - Fragile RegExp parsing of raw terminal text                                |
|  - In-memory `threads = []` lost on server restart or worker restart          |
|  - High risk of shell injection on queries (e.g. `grep`)                      |
|  - Manual token refresh handling for Google Antigravity OAuth                 |
+-------------------------------------------------------------------------------+

                                       VS

+-------------------------------------------------------------------------------+
| Approach B: Native AvA Core Alpha SDK Integration (Recommended Standard)      |
+-------------------------------------------------------------------------------+
|  - Structured API: `const thread = ava.startThread({ workingDirectory })`     |
|  - Async generator: `for await (const event of thread.runStreamed(prompt))`   |
|  - Automatic persistence in `~/.ava/sessions`                                 |
|  - Type-safe event streaming directly mapped to SSE / WebSocket               |
|  - Automated token refresh & dynamic model discovery via `Antigravity` class  |
+-------------------------------------------------------------------------------+
```

---

## 5. Next Steps

- Proceed to **[Phase 2: JSON-RPC 2.0 Protocol & API Specification](file:///var/www/ava-code/docs/phase-2-protocol-and-api.md)** for detailed RPC method contracts.
- Review **[Phase 3: Bug Audit & Vulnerability Report](file:///var/www/ava-code/docs/phase-3-bugs-and-audit.md)** for identified discrepancies in current server/mobile code.
