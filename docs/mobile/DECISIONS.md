# AvA Mobile V2 — Architecture Decision Records

## ADR-001: Tauri 2 over Flutter/Capacitor/Native

**Status**: Accepted
**Context**: Need to rewrite the mobile app. Options: Flutter (existing), Capacitor, native Kotlin/Swift, Tauri 2.
**Decision**: Tauri 2 with React + TypeScript + Rust.
**Rationale**:
- Flutter has accumulated tech debt (3500-line God-file, no state management, fragile streaming)
- Tauri 2 allows sharing Rust code with the existing `ava-rs/` backend
- React + TypeScript has the largest ecosystem and developer pool
- Tauri 2's Rust backend provides secure networking, native platform access, and performance
- Extensible to iOS and desktop with the same codebase
**Consequences**: Need to learn Tauri 2 mobile patterns, manage Rust compilation for Android.

## ADR-002: WebSocket in Rust (not WebView)

**Status**: Accepted
**Context**: The WebSocket connection to the AvA server can be managed either in the WebView (JavaScript) or in the Rust backend.
**Decision**: Rust owns the WebSocket connection.
**Rationale**:
- Rust can maintain persistent connections even when WebView is backgrounded
- JSON-RPC framing and reconnection logic in Rust is more reliable
- Tauri's event system provides clean IPC to React
- Secure credential storage in Rust (not exposed to WebView)
- Avoids WebSocket limitations in some Android WebViews
**Consequences**: All server communication goes through Tauri IPC (invoke/listen). Slightly more complex but more robust.

## ADR-003: Zustand over Redux/Context/Recoil

**Status**: Accepted
**Context**: Need state management for React.
**Decision**: Zustand.
**Rationale**:
- Minimal boilerplate (stores are just hooks)
- TypeScript-first with excellent type inference
- No providers needed (works outside React)
- Small bundle size (~1KB)
- Supports middleware (persist, devtools)
**Consequences**: Simple state management, easy to test.

## ADR-004: No Code Reuse from Flutter

**Status**: Accepted
**Context**: The existing Flutter app has working features but poor architecture.
**Decision**: Zero code reuse from Flutter. Clean-slate implementation.
**Rationale**:
- Flutter code is Dart, not compatible with React/TypeScript
- The Flutter architecture is the problem (monolithic, no separation of concerns)
- The API contracts (JSON-RPC methods) are the reusable part, not the code
- Fresh implementation can learn from Flutter's mistakes without carrying its debt
**Consequences**: More initial work, but cleaner result. API contract docs are the bridge.

## ADR-005: Dark Mode as Primary Theme

**Status**: Accepted
**Context**: Need to support both dark and light modes.
**Decision**: Dark mode is the primary/default theme. Light mode is secondary.
**Rationale**:
- AI agent tools are used by developers who overwhelmingly prefer dark mode
- Dark mode reduces eye strain during long coding sessions
- Matches the aesthetic of tools like VS Code, terminal, Claude
**Consequences**: Design dark mode first, then adapt to light mode.

## ADR-006: Android First, iOS Later

**Status**: Accepted
**Context**: Tauri 2 supports both Android and iOS.
**Decision**: Target Android first. Design for cross-platform, but only verify Android for MVP.
**Rationale**:
- Existing user base is Android (Flutter app is Android-first)
- Android has larger market share in target demographics
- Tauri 2 Android support is more mature than iOS
- Architecture is extensible to iOS with minimal changes
**Consequences**: iOS testing deferred to post-MVP. No iOS-specific code in MVP.

## ADR-007: Auto-generate TypeScript Types from Rust

**Status**: Proposed
**Context**: Need TypeScript types that match the server's protocol.
**Decision**: Use the existing `ts-rs` generated schemas from `ava-rs/app-server-protocol/schema/typescript/`.
**Rationale**:
- Types are already generated from the Rust protocol definitions
- Single source of truth (Rust structs)
- Covers all request/response/notification types
**Consequences**: Need to verify schema completeness, may need manual bridge types for edge cases.

## ADR-008: Tailwind CSS for Styling

**Status**: Accepted
**Context**: Need a styling approach for React components.
**Decision**: Tailwind CSS with custom design tokens.
**Rationale**:
- Utility-first approach matches the minimal design philosophy
- Excellent dark mode support via `dark:` prefix
- Small production bundle (purge unused classes)
- Fast development velocity
- Consistent spacing/color system
**Consequences**: Components use utility classes. Custom tokens for AvA brand colors.

## ADR-009: Markdown Rendering with react-markdown

**Status**: Accepted
**Context**: Agent responses contain markdown (code blocks, lists, links, LaTeX).
**Decision**: `react-markdown` with `remark-gfm` and custom renderers.
**Rationale**:
- Mature, well-maintained library
- Custom component renderers for code blocks, images
- GFM support (tables, strikethrough, task lists)
- Can add syntax highlighting via `rehype-highlight` or `prism`
**Consequences**: Need custom renderers for AvA-specific content (tool cards, diffs).

## ADR-010: Event Coalescing for Streaming Performance

**Status**: Accepted
**Context**: Server sends30-50 delta events per second during streaming.
**Decision**: Coalesce events in Rust (batch) and coalesce renders in React (requestAnimationFrame).
**Rationale**:
- V1's 16ms timer-based coalescing worked but had race conditions
- Rust can batch multiple deltas into a single IPC call
- React's `requestAnimationFrame` ensures 60fps render limit
- Zustand's `subscribe` with selector prevents unnecessary re-renders
**Consequences**: Two-layer coalescing: Rust (batch events) + React (batch renders).
