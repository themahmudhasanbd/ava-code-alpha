# AvA Code Alpha — App-Server JSON-RPC v2 Protocol Integration

## 1. Overview

The AvA Code Alpha Flutter mobile client connects to the native `ava-rs` app-server daemon using standard **JSON-RPC 2.0** over WebSocket or HTTP with Server-Sent Events (SSE).

---

## 2. JSON-RPC Protocol Methods

### `thread/start`
Starts a new persistent conversation thread in a working directory.

```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "method": "thread/start",
  "params": {
    "workingDirectory": "/var/www/my-project",
    "sandbox": "workspaceWrite",
    "model": "gemini-3.7-flash-tiered"
  }
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "result": {
    "threadId": "th_01j789abc...",
    "status": "ready"
  }
}
```

---

### `turn/start`
Sends a user prompt or tool response to execute a turn.

```json
{
  "jsonrpc": "2.0",
  "id": "req-2",
  "method": "turn/start",
  "params": {
    "threadId": "th_01j789abc...",
    "input": [
      { "type": "text", "text": "Add health check test in test_server.rs" }
    ]
  }
}
```

---

### `turn/interrupt`
Immediately cancels the currently executing turn without losing thread history.

```json
{
  "jsonrpc": "2.0",
  "id": "req-3",
  "method": "turn/interrupt",
  "params": {
    "threadId": "th_01j789abc..."
  }
}
```

---

## 3. Server-Sent Streaming Events (SSE)

During turn execution, the app-server emits real-time events:

| Event Type | Description |
|---|---|
| `item/started` | Agent starts a message, reasoning thought, or tool call |
| `item/delta` | Incremental token stream (markdown or thinking delta) |
| `item/completed` | Tool execution result, command output, or final message |
| `turn/completed` | Turn finished successfully with token usage statistics |
| `turn/failed` | Turn encountered an error with detailed message |
