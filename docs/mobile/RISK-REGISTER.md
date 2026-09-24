# AvA Mobile V2 — Risk Register

| # | Risk | Severity | Likelihood | Impact | Mitigation |
|---|------|----------|-----------|--------|------------|
| 1 | **Tauri 2 Android WebView limitations** — Older Android WebViews may not support all JS/CSS features | High | Medium | Rendering issues on older devices | Target Android 10+ (WebView 77+), use polyfills, test on min API level |
| 2 | **WebSocket in Rust vs WebView** — Managing WS in Rust while rendering in WebView adds complexity | Medium | Low | IPC overhead, event ordering | Use Tauri's event system (proven pattern), benchmark IPC latency |
| 3 | **JSON-RPC protocol drift** — Server protocol evolves, types may change | Medium | High | Breaking changes | Auto-generate TS types from `app-server-protocol` schema, version pinning |
| 4 | **Streaming performance** — High-frequency deltas (30-50 tok/s) through Rust→IPC→React | High | Medium | UI lag, dropped frames | Batch events in Rust, coalesce renders at 60fps in React, use `requestAnimationFrame` |
| 5 | **Tauri 2 maturity** — Tauri 2 mobile support is relatively new | High | Medium | Platform bugs, missing features | Pin Tauri version, have fallback to Capacitor if critical blockers |
| 6 | **No auto-generated TS types exist yet** — The `schema/typescript/` dir has types but may not cover all v2 fields | Medium | Medium | Type mismatches | Manual verification of key types, create bridge types as needed |
| 7 | **Authentication complexity** — Multiple auth modes (API key, OAuth, ChatGPT) | Medium | Low | Auth flow bugs | Start with API key only for MVP, add OAuth later |
| 8 | **Android foreground service** — Background execution requires native Android code | Medium | Medium | Notification/foreground issues | Use Tauri's notification plugin, implement foreground service in Kotlin if needed |
| 9 | **File system access** — Sandboxed WebView has limited FS access | Low | Low | Can't read/write files | Use Tauri's FS plugin (Rust-side), no direct WebView FS access |
| 10 | **Testing on real devices** — Need physical Android device for verification | Low | High | Delayed verification | Use emulator for development, device testing in Phase 9 |
| 11 | **Protocol not strictly JSON-RPC 2.0** — Server omits `jsonrpc: "2.0"` field | Low | Low | Parser mismatch | Custom Rust parser that handles both formats |
| 12 | **Message deduplication** — Same issue as V1 (server assigns different IDs) | Medium | High | Duplicate messages in UI | Use parentId-based matching, dedup by content hash |
| 13 | **Session recovery on reconnect** — Missed `turn/completed` during disconnect | Medium | Medium | Stuck pending state | Poll session status after reconnect, timeout safety net |
