# AvA Mobile V2 — Implementation Plan

## Phase 1: Project Setup & Scaffolding

**Goal**: Working Tauri 2 + React + TypeScript Android app that builds and runs.

- [ ] Initialize Tauri 2 project with `pnpm create tauri-app`
- [ ] Configure `tauri.conf.json` for Android target
- [ ] Set up Vite + React + TypeScript
- [ ] Set up Tailwind CSS with dark/light mode tokens
- [ ] Set up Zustand for state management
- [ ] Create basic app shell with bottom navigation
- [ ] Create theme system (dark/light)
- [ ] Build and run on Android emulator
- [ ] Verify hot reload works

**Output**: Blank app with bottom nav that runs on Android.

## Phase 2: Rust Backend — Connection & RPC

**Goal**: Rust WebSocket client connects to AvA server and can send/receive JSON-RPC.

- [ ] Implement WebSocket client in Rust (`tokio-tungstenite`)
- [ ] Implement JSON-RPC 2.0 framing (without `jsonrpc` field)
- [ ] Implement `initialize` handshake
- [ ] Implement `sendRpc` with timeout and error handling
- [ ] Implement event broadcast (notifications → Tauri events)
- [ ] Implement auto-reconnect with backoff
- [ ] Implement health check (`/healthz`)
- [ ] Create Tauri commands: `connect`, `disconnect`, `health_check`
- [ ] Create Tauri event: `rpc-notification`
- [ ] Test connection to local AvA server

**Output**: Rust backend connects to server, sends RPCs, broadcasts events.

## Phase 3: State & API Layer

**Goal**: Typed API client and state stores.

- [ ] Create TypeScript types from app-server-protocol schemas
- [ ] Create `connectionStore` (Zustand)
- [ ] Create `sessionStore` (Zustand)
- [ ] Create `chatStore` (Zustand)
- [ ] Create `settingsStore` (Zustand)
- [ ] Implement API client: `threads.ts` (list, create, read, delete, rename)
- [ ] Implement API client: `turns.ts` (start, interrupt)
- [ ] Implement API client: `models.ts` (list)
- [ ] Implement streaming event parser
- [ ] Test API methods against server

**Output**: Fully typed API layer with working state management.

## Phase 4: Settings & Onboarding

**Goal**: First-launch experience and server configuration.

- [ ] Create onboarding screen (server URL input)
- [ ] Implement server health check on connect
- [ ] Implement persistent server config (Tauri secure storage)
- [ ] Create settings screen (server, model, appearance)
- [ ] Implement dark/light mode toggle
- [ ] Handle connection errors gracefully
- [ ] Test: configure server, restart app, config persists

**Output**: User can configure server URL, connect, and settings persist.

## Phase 5: Sessions

**Goal**: Session list, creation, and selection.

- [ ] Create sessions screen with list
- [ ] Implement session card component
- [ ] Implement session creation (new session button)
- [ ] Implement session selection (navigate to chat)
- [ ] Implement session deletion (swipe-to-delete)
- [ ] Implement session rename
- [ ] Implement pull-to-refresh
- [ ] Implement empty state (no sessions)
- [ ] Implement loading state
- [ ] Implement error state with retry

**Output**: User can browse, create, select, rename, and delete sessions.

## Phase 6: Chat — Core

**Goal**: Basic chat with user messages and agent text responses.

- [ ] Create chat screen layout
- [ ] Create message list component
- [ ] Create user message bubble
- [ ] Create agent message component (text only)
- [ ] Create composer component (text input + send button)
- [ ] Implement send prompt flow (user msg → pending → stream → done)
- [ ] Implement text delta streaming (token-by-token)
- [ ] Implement turn completion handling
- [ ] Implement scroll-to-bottom on new messages
- [ ] Implement stop button (interrupt turn)
- [ ] Test: send prompt, see streaming response

**Output**: User can send prompts and see streaming text responses.

## Phase 7: Chat — Rich Content

**Goal**: Tool cards, reasoning, errors, questions.

- [ ] Create tool card component (with status pill)
- [ ] Implement command execution streaming
- [ ] Implement tool output delta handling
- [ ] Create reasoning panel (collapsible)
- [ ] Implement reasoning delta streaming
- [ ] Create error card component
- [ ] Create question/permission dock
- [ ] Implement question answering flow
- [ ] Implement markdown rendering in messages
- [ ] Implement code block rendering with syntax highlighting
- [ ] Test: complex prompt with tools, reasoning, and errors

**Output**: Full agent turn visualization with tools, reasoning, and interactivity.

## Phase 8: Polish & Error Handling

**Goal**: Production-quality error handling and UX polish.

- [ ] Implement error boundary with retry
- [ ] Implement connection lost banner
- [ ] Implement reconnect behavior
- [ ] Implement message retry on error
- [ ] Add loading skeletons
- [ ] Add haptic feedback (Android)
- [ ] Add pull-to-refresh on chat
- [ ] Implement Android back navigation
- [ ] Add app version display
- [ ] Performance: verify 60fps during streaming
- [ ] Test: disconnect/reconnect, long responses, rapid prompts

**Output**: Polished, production-ready MVP.

## Phase 9: Build & Device Test

**Goal**: APK build and real device verification.

- [ ] Build release APK
- [ ] Install on physical Android device
- [ ] Test all16 verification points from spec:
  1. App launches
  2. Server URL configurable
  3. Connection succeeds
  4. Session list loads
  5. Session can be created
  6. Prompt can be sent
  7. Streaming response works
  8. Tool activity appears
  9. Long response doesn't freeze UI
  10. Stop/cancel works
  11. Session survives navigation
  12. Server disconnect handled
  13. Reconnection works
  14. Dark/light mode works
  15. No UI overflow
  16. Back navigation works
- [ ] Fix any issues found
- [ ] Document known limitations

**Output**: Verified APK on real device.

## Phase 10: Documentation & Git

**Goal**: Clean git history and final documentation.

- [ ] Update all docs/mobile/ documents
- [ ] Write final verification report
- [ ] Clean git history (one commit per phase)
- [ ] Push to remote
- [ ] Document next recommended phase

**Output**: Clean repo, documented MVP, deployment-ready.
