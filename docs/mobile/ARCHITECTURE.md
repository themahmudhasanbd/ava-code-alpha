# AvA Mobile V2 — Architecture

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Shell** | Tauri 2 | Native Android app shell, IPC bridge, file system, secure storage |
| **Frontend** | React + TypeScript | UI rendering, state management, streaming |
| **Backend** | Rust (Tauri commands) | Secure networking, local persistence, platform integration |
| **Build** | Vite + cargo | Frontend build + Rust compilation |

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri 2 Shell (Android)               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  WebView (React + TypeScript)                     │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────────┐  │  │
│  │  │  State   │ │  API     │ │  Components       │  │  │
│  │  │  (Zustand│ │  Client  │ │  (Chat, Sessions, │  │  │
│  │  │  stores) │ │  (typed) │ │   Settings, etc.) │  │  │
│  │  └────┬─────┘ └────┬─────┘ └────────┬──────────┘  │  │
│  │       │             │                │              │  │
│  │       └─────────────┼────────────────┘              │  │
│  │                     │                               │  │
│  │              invoke("cmd") / listen("event")        │  │
│  └─────────────────────┼───────────────────────────────┘  │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐  │
│  │  Tauri Rust Backend (src-tauri/)                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │  │
│  │  │ Commands │ │ WebSocket│ │ Platform           │  │  │
│  │  │ (IPC)    │ │ Client   │ │ Integration        │  │  │
│  │  │          │ │ (JSON-RPC│ │ (secure storage,   │  │  │
│  │  │          │ │  2.0)    │ │  notifications,    │  │  │
│  │  │          │ │          │ │  file system)      │  │  │
│  │  └──────────┘ └──────────┘ └────────────────────┘  │  │
│  └─────────────────────┬───────────────────────────────┘  │
│                        │                                   │
└────────────────────────┼───────────────────────────────────┘
                         │ WebSocket (wss://host/ws)
                         │
┌────────────────────────▼───────────────────────────────────┐
│              AvA Rust Core Server (ava-rs/)                 │
│  codex-app-server → codex-core → codex-api → OpenAI        │
└────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
ava-mobile/v2/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Root component with routing
│   ├── app/
│   │   ├── layout.tsx             # App shell layout (nav, header)
│   │   ├── providers.tsx          # Context providers (theme, state)
│   │   └── routes.tsx             # Route definitions
│   ├── components/
│   │   ├── ui/                    # Primitives (Button, Input, Card, etc.)
│   │   ├── chat/                  # Chat-specific components
│   │   │   ├── message-bubble.tsx
│   │   │   ├── agent-header.tsx
│   │   │   ├── tool-card.tsx
│   │   │   ├── reasoning-panel.tsx
│   │   │   ├── composer.tsx
│   │   │   ├── timeline.tsx
│   │   │   └── question-dock.tsx
│   │   ├── layout/                # Layout components
│   │   │   ├── nav-bar.tsx
│   │   │   ├── header.tsx
│   │   │   └── sidebar.tsx
│   │   └── shared/                # Shared components
│   │       ├── status-badge.tsx
│   │       ├── loading-spinner.tsx
│   │       ├── empty-state.tsx
│   │       ├── error-boundary.tsx
│   │       └── markdown-view.tsx
│   ├── features/
│   │   ├── home/
│   │   │   ├── home-screen.tsx
│   │   │   └── quick-actions.tsx
│   │   ├── chat/
│   │   │   ├── chat-screen.tsx
│   │   │   ├── chat-store.ts      # Zustand store
│   │   │   ├── chat-hooks.ts      # useChat, useStreaming
│   │   │   ├── message-list.tsx
│   │   │   └── streaming-handler.ts
│   │   ├── sessions/
│   │   │   ├── sessions-screen.tsx
│   │   │   ├── sessions-store.ts
│   │   │   └── session-card.tsx
│   │   ├── projects/
│   │   │   ├── projects-screen.tsx
│   │   │   └── projects-store.ts
│   │   ├── tasks/
│   │   │   ├── tasks-screen.tsx
│   │   │   └── tasks-store.ts
│   │   └── settings/
│   │       ├── settings-screen.tsx
│   │       ├── connection-settings.tsx
│   │       ├── model-settings.tsx
│   │       └── appearance-settings.tsx
│   ├── lib/
│   │   ├── tauri.ts               # Tauri invoke/listen wrappers
│   │   ├── utils.ts               # General utilities
│   │   ├── formatters.ts          # Date, time, text formatters
│   │   └── constants.ts           # App constants
│   ├── api/
│   │   ├── client.ts              # Typed API client over Tauri IPC
│   │   ├── types.ts               # Auto-generated from app-server-protocol
│   │   ├── threads.ts             # Thread API methods
│   │   ├── turns.ts               # Turn API methods
│   │   ├── models.ts              # Model API methods
│   │   └── streaming.ts           # Streaming event parser
│   ├── state/
│   │   ├── connection-store.ts    # Connection state
│   │   ├── session-store.ts       # Active session state
│   │   ├── settings-store.ts      # App settings
│   │   └── theme-store.ts         # Theme/appearance
│   └── types/
│       ├── messages.ts            # Message, Part, Timeline types
│       ├── session.ts             # Session types
│       └── api.ts                 # API response types
│
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/
    │   └── default.json           # Tauri capability permissions
    ├── src/
    │   ├── lib.rs                 # Tauri plugin registration
    │   ├── main.rs                # Entry point
    │   ├── commands/
    │   │   ├── mod.rs
    │   │   ├── connection.rs      # connect, disconnect, health check
    │   │   ├── threads.rs         # Thread CRUD via JSON-RPC
    │   │   ├── turns.rs           # Turn start/interrupt
    │   │   ├── models.rs          # Model listing
    │   │   ├── settings.rs        # Persistent settings
    │   │   └── storage.rs         # Secure storage
    │   ├── ws/
    │   │   ├── mod.rs
    │   │   ├── client.rs          # WebSocket client with auto-reconnect
    │   │   ├── rpc.rs             # JSON-RPC 2.0 framing
    │   │   └── events.rs          # Event parsing and dispatch
    │   └── platform/
    │       ├── mod.rs
    │       ├── android.rs         # Android-specific integrations
    │       └── notifications.rs   # Local notifications
    └── gen/
        └── android/               # Generated Android project
```

## Protocol Integration

### Transport: WebSocket JSON-RPC (not strict 2.0)

The AvA server uses a JSON-RPC-adjacent protocol over WebSocket. The `"jsonrpc": "2.0"` field is **omitted** on the wire.

**Request:**
```json
{ "id": 1, "method": "turn/start", "params": { "threadId": "...", "input": [...] } }
```

**Response:**
```json
{ "id": 1, "result": { ... } }
```

**Notification (server push):**
```json
{ "method": "item/agentMessage/delta", "params": { "threadId": "...", "itemId": "...", "delta": "Hello" } }
```

### Connection Lifecycle

1. **Connect**: WebSocket to `wss://<host>/ws?client=mobile-v2`
2. **Initialize**: `initialize` RPC with client info and capabilities
3. **Authenticate**: Basic auth header or API key
4. **Listen**: Broadcast notifications for all active threads
5. **Reconnect**: Auto-reconnect with3-second backoff on disconnect

### Streaming Flow

```
Client                          Server
  │                               │
  │──── turn/start ──────────────→│
  │                               │
  │←─── turn/started ─────────────│
  │←─── item/started (reasoning) ─│
  │←─── item/reasoning/textDelta ─│  (multiple)
  │←─── item/completed ───────────│
  │←─── item/started (message) ───│
  │←─── item/agentMessage/delta ──│  (multiple, token-by-token)
  │←─── item/started (tool) ──────│
  │←─── item/commandExecution/    │
  │     outputDelta ──────────────│  (multiple)
  │←─── item/completed ───────────│
  │←─── item/completed ───────────│
  │←─── turn/completed ───────────│
  │                               │
```

### State Management: Zustand

Zustand for lightweight, type-safe state management:

- **connectionStore**: WebSocket connection state, health, reconnect
- **sessionStore**: Active sessions, current session, message history
- **chatStore**: Current chat messages, streaming state, pending parts
- **settingsStore**: Server URL, workspace, model, theme preferences
- **themeStore**: Dark/light mode, color scheme

### Key Design Decisions

1. **Tauri commands as API boundary**: All server communication goes through Rust → Tauri IPC → React. The WebView never makes direct WebSocket connections.
2. **Rust owns the WebSocket**: The Rust backend manages the persistent WebSocket connection, reconnection, and RPC framing. React receives parsed events via Tauri's event system.
3. **Type safety end-to-end**: TypeScript types are auto-generated from `ava-rs/app-server-protocol` schema. Rust types map to TS types via `ts-rs`.
4. **No Flutter dependencies**: Zero code reuse from the Flutter app. Clean-slate implementation following the app-server protocol directly.
