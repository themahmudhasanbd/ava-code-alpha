# AvA Mobile V2 — Discovery & Architecture Documentation

> This directory contains the complete discovery, architecture, and implementation planning documents for the AvA Mobile V2 rewrite.

## Document Index

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, crate map, protocol layers, data flow |
| [MVP-SCOPE.md](./MVP-SCOPE.md) | Minimum viable feature set for V2 launch |
| [API-CONTRACT.md](./API-CONTRACT.md) | Complete API method reference with request/response schemas |
| [UI-SPEC.md](./UI-SPEC.md) | UI design specification, component tree, screen layouts |
| [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) | Phased implementation plan with milestones |
| [RISK-REGISTER.md](./RISK-REGISTER.md) | Technical risks, blockers, and mitigations |
| [DECISIONS.md](./DECISIONS.md) | Architecture decision records (ADRs) |

## Context

The existing AvA Mobile app is a Flutter application (`ava-mobile/lib/`) that connects to the AvA Rust Core server via WebSocket JSON-RPC. It has accumulated significant technical debt:

- **3,500+ line main.dart** — monolithic God-file with all business logic
- **No state management** — raw `setState()` with manual timer-based throttling
- **Fragile streaming** — race conditions, duplicate messages, missed completion events
- **Error swallowing** — most catch blocks silently discard errors

V2 is a clean-slate rewrite using **Tauri 2 + React + TypeScript + Rust**, targeting Android first with extensibility for iOS and desktop.

## Repository Structure (Relevant)

```
ava-code/
├── ava-rs/                    # Rust core (157+ crates)
│   ├── app-server/            # The main server binary
│   ├── app-server-protocol/   # Protocol types (auto-generates TS schemas)
│   ├── app-server-transport/  # WebSocket/stdio/Unix transport
│   ├── core/                  # Thread management, turn execution
│   ├── protocol/              # Low-level protocol types (EventMsg, Op, TurnItem)
│   ├── api/                   # OpenAI API client (Responses API, SSE)
│   └── ...
├── ava-mobile/                # Existing Flutter app (V1)
│   └── v2/                    # NEW: Tauri 2 + React + TS + Rust
├── sdk/typescript/            # TypeScript SDK (@openai/codex)
├── ava-desktop/               # Desktop app (Electron)
└── docs/mobile/               # THIS: Discovery & architecture docs
```
