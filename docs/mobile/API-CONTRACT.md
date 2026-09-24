# AvA Mobile V2 — API Contract (Verified)

> Last verified against `ava-rs/app-server-protocol/src/protocol/common.rs` and `ava-mobile/lib/services/agent_core/`

## Transport

- **Protocol**: JSON-RPC (no `"jsonrpc": "2.0"` on wire per `rpc.rs` line 1-3)
- **Endpoint**: `wss://<host>/ws?client=mobile-v2`
- **Auth**: `Authorization: Basic <base64(user:pass)>` header + `x-ava-client: mobile-v2`
- **Health**: HTTP GET `https://<host>/healthz` (200/204/400/401/403 = server reachable)

## Initialization

### `initialize`

```typescript
// Request
{
  id: number;
  method: "initialize";
  params: {
    clientInfo: { name: "ava-mobile-v2"; version: "1.0.0"; client: "mobile-v2" };
    capabilities: {};
  };
}

// Response
{
  id: number;
  result: {
    serverInfo: { name: string; version: string };
    capabilities: Record<string, unknown>;
  };
}
```

## Thread Management

### `thread/start`

```typescript
// Request
{
  method: "thread/start";
  params: {
    cwd?: string;           // Working directory
    model?: string;          // Model ID
    effort?: string;         // Reasoning effort: "low" | "medium" | "high"
    config?: object;         // Additional config
  };
}

// Response
{
  thread: {
    id: string;              // UUID thread ID
    // ... other fields
  };
}
```

### `thread/list`

```typescript
// Request
{ method: "thread/list"; params: {}; }

// Response
{
  threads: Array<{
    id: string;
    name?: string;
    status?: string;
    created_at?: number;
    updated_at?: number;
  }>;
}
```

### `thread/read`

```typescript
// Request
{
  method: "thread/read";
  params: {
    thread_id: string;
    limit?: number;          // Max items to return
  };
}

// Response
{
  thread: {
    id: string;
    name?: string;
    turns?: Array<TurnInfo>;
    items?: Array<ThreadItem>;
  };
}
```

### `thread/delete`

```typescript
{ method: "thread/delete"; params: { thread_id: string }; }
```

### `thread/name/set`

```typescript
{ method: "thread/name/set"; params: { thread_id: string; name: string }; }
```

## Turn Management

### `turn/start`

```typescript
// Request
{
  method: "turn/start";
  params: {
    threadId: string;
    input: Array<{ type: "text"; text: string }>;
    model?: string;
    effort?: string;
  };
}

// Response
{
  // Turn accepted, notifications will follow
}
```

### `turn/interrupt`

```typescript
{
  method: "turn/interrupt";
  params: { threadId: string };
}
```

## Model Catalog

### `model/list`

```typescript
// Request
{ method: "model/list"; params: {}; }

// Response
{
  models: Array<{
    id: string;
    name: string;
    provider: string;
    reasoning?: boolean;
    supports_images?: boolean;
  }>;
}
```

## Server Notifications (Server → Client)

All notifications arrive as JSON-RPC notifications (no `id` field):

### Turn Lifecycle

| Method | Key Fields | Description |
|--------|-----------|-------------|
| `turn/started` | `threadId`, `turnId` | Turn execution began |
| `turn/completed` | `threadId`, `turn` (with `items`) | Turn finished successfully |

### Item Lifecycle

| Method | Key Fields | Description |
|--------|-----------|-------------|
| `item/started` | `threadId`, `item` (`id`, `type`, `text?`, `command?`) | New item started |
| `item/completed` | `threadId`, `item` (`id`, `text?`, `aggregatedOutput?`, `durationMs?`) | Item finished |

### Streaming Deltas

| Method | Key Fields | Description |
|--------|-----------|-------------|
| `item/agentMessage/delta` | `threadId`, `itemId`, `delta` | Token-by-token text |
| `item/reasoning/textDelta` | `threadId`, `itemId`, `delta` | Reasoning text |
| `item/reasoning/summaryTextDelta` | `threadId`, `itemId`, `delta` | Reasoning summary |
| `item/commandExecution/outputDelta` | `threadId`, `itemId`, `delta` | Command output |
| `item/fileChange/patchUpdated` | `threadId`, `itemId`, `patch` | File diff update |
| `item/mcpToolCall/progress` | `threadId`, `itemId`, ... | MCP tool progress |

### Error

| Method | Key Fields | Description |
|--------|-----------|-------------|
| `error` | `error` (message, code), `willRetry?` | Error during turn |

## Item Types

### `agentMessage` (text response)
```typescript
{ type: "agentMessage"; id: string; text: string; }
```

### `reasoning` (thinking)
```typescript
{ type: "reasoning"; id: string; text: string; }
```

### `commandExecution` (shell command)
```typescript
{ type: "commandExecution"; id: string; command: string; cwd?: string; }
```

### `fileChange` (file edit)
```typescript
{ type: "fileChange"; id: string; path: string; }
```

### `mcpToolCall` (MCP tool)
```typescript
{ type: "mcpToolCall"; id: string; tool: string; args?: object; }
```

### `plan` (planning)
```typescript
{ type: "plan"; id: string; text: string; }
```

## Part Status Values

- `running` — Currently executing
- `completed` — Finished successfully
- `failed` — Finished with error
