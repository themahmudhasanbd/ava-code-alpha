# Phase 2: JSON-RPC 2.0 Protocol & API Specification

## 1. Overview

The AvA Code Alpha App-Server (`apps/server`) exposes a standardized JSON-RPC 2.0 interface alongside a Server-Sent Events (SSE) stream endpoint for real-time agent output. This document details every supported endpoint, request parameters, response schemas, error codes, and streaming lifecycle events.

---

## 2. Server Transport & Endpoints

| Protocol | Path | Description |
| :--- | :--- | :--- |
| **HTTP POST** | `/rpc` | Standard JSON-RPC 2.0 endpoint for synchronous and asynchronous command dispatch. |
| **HTTP GET** | `/events` | Server-Sent Events (SSE) endpoint for real-time turn execution streaming. |
| **HTTP GET** | `/health` | Server health check endpoint returning server status, uptime, and active sessions. |

---

## 3. JSON-RPC 2.0 Methods

### A. Thread Management

#### `thread/create` (Alias: `thread/start`)
Initializes a new persistent agent thread.

- **Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "method": "thread/create",
  "params": {
    "title": "Refactor Auth Middleware",
    "workingDirectory": "/var/www/my-project",
    "model": "gemini-3.7-flash-tiered"
  }
}
```

- **Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "result": {
    "thread": {
      "id": "thread-1726859400000",
      "title": "Refactor Auth Middleware",
      "createdAt": 1726859400000,
      "updatedAt": 1726859400000,
      "model": "gemini-3.7-flash-tiered",
      "messages": []
    }
  }
}
```

---

#### `thread/read` (Alias: `thread/get`, `thread/list`)
Retrieves a specific thread by ID or lists all recent threads.

- **Request (Single)**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-2",
  "method": "thread/read",
  "params": {
    "threadId": "thread-1726859400000"
  }
}
```

- **Request (List all)**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-3",
  "method": "thread/list",
  "params": {}
}
```

---

#### `thread/fork`
Forks an existing thread up to an optional turn index, creating an independent branching conversation.

- **Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-4",
  "method": "thread/fork",
  "params": {
    "threadId": "thread-1726859400000",
    "upToTurnIndex": 4
  }
}
```

- **Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-4",
  "result": {
    "thread": {
      "id": "thread-1726859400000-fork-1726859450000",
      "title": "Refactor Auth Middleware (Fork)",
      "createdAt": 1726859450000,
      "updatedAt": 1726859450000,
      "model": "gemini-3.7-flash-tiered",
      "messages": [ /* deep cloned messages */ ]
    }
  }
}
```

---

#### `thread/rollback`
Rolls back a thread to a prior turn index, removing subsequent turns and actions.

- **Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-5",
  "method": "thread/rollback",
  "params": {
    "threadId": "thread-1726859400000",
    "toTurnIndex": 2
  }
}
```

- **Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-5",
  "result": {
    "isSuccess": true,
    "thread": {
      "id": "thread-1726859400000",
      "updatedAt": 1726859460000,
      "messages": [ /* truncated message history */ ]
    }
  }
}
```

---

### B. Execution & Turns

#### `turn/start`
Starts an agent execution turn on a specified thread.

- **Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-6",
  "method": "turn/start",
  "params": {
    "threadId": "thread-1726859400000",
    "input": "Fix TypeScript compilation errors in src/index.ts",
    "model": "gemini-3.7-flash-tiered"
  }
}
```

- **Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-6",
  "result": {
    "turnId": "turn-1726859470000",
    "status": "running"
  }
}
```

---

#### `turn/interrupt`
Immediately aborts an active execution turn.

- **Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-7",
  "method": "turn/interrupt",
  "params": {
    "threadId": "thread-1726859400000"
  }
}
```

---

### C. Configuration & Providers

#### `config/read`
Reads current effective configuration from `~/.ava/config.toml` or active project `.ava/config.toml`.

- **Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-8",
  "result": {
    "model": "gemini-3.7-flash-tiered",
    "model_provider": "google-antigravity",
    "sandbox": "workspace_write",
    "approval_policy": "never"
  }
}
```

#### `config/write`
Updates configuration keys.

- **Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-9",
  "method": "config/write",
  "params": {
    "model": "claude-3-7-sonnet-thought",
    "model_provider": "google-antigravity"
  }
}
```

---

#### `provider/discover` (Alias: `models/list`)
Dynamically queries active providers (e.g. Google Antigravity) for live model catalog and quotas.

- **Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-10",
  "result": {
    "provider": "google-antigravity",
    "models": [
      { "id": "gemini-3.7-flash-tiered", "displayName": "Gemini 3.7 Flash (Tiered)", "contextLimit": 1048576 },
      { "id": "gemini-3.8-flash", "displayName": "Gemini 3.8 Flash Preview", "contextLimit": 1048576 },
      { "id": "gemini-3.1-pro", "displayName": "Gemini 3.1 Pro", "contextLimit": 2097152 },
      { "id": "claude-3-7-sonnet-thought", "displayName": "Claude 3.7 Sonnet (Hybrid Reasoning)", "contextLimit": 200000 }
    ]
  }
}
```

---

### D. File System & Tools

| Method | Parameters | Returns |
| :--- | :--- | :--- |
| `file/read` | `{ "path": string }` | `{ "content": string, "size": number }` |
| `file/write` | `{ "path": string, "content": string }` | `{ "success": boolean, "bytesWritten": number }` |
| `file/grep` | `{ "query": string, "path"?: string, "caseSensitive"?: boolean }` | `{ "matches": Array<{ file: string, line: number, text: string }> }` |
| `terminal/exec`| `{ "command": string, "cwd"?: string }` | `{ "exitCode": number, "stdout": string, "stderr": string }` |
| `permissions/respond` | `{ "requestId": string, "decision": "allow" \| "deny" }` | `{ "acknowledged": true }` |

---

## 4. Streaming SSE Event Lifecycle

When a turn is started, events are streamed over the `/events` SSE channel formatted as JSON data payloads:

```
event: item.started
data: {"threadId":"thread-1","type":"reasoning","id":"item-1"}

event: item.updated
data: {"threadId":"thread-1","id":"item-1","contentDelta":"Inspecting workspace files..."}

event: item.completed
data: {"threadId":"thread-1","id":"item-1","status":"completed"}

event: item.started
data: {"threadId":"thread-1","type":"command","command":"cargo check"}

event: item.completed
data: {"threadId":"thread-1","id":"item-2","status":"completed","exitCode":0}

event: turn.completed
data: {"threadId":"thread-1","turnId":"turn-1","usage":{"inputTokens":1240,"outputTokens":312}}
```
