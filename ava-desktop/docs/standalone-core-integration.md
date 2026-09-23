# AvA Desktop Standalone Core Integration Guide

## 1. Architecture Overview
AvA Desktop is designed as a **self-contained standalone application** powered by an embedded native Rust Core process (`pi-desktop-host-core` / `ava-rs`). 

```
┌─────────────────────────────────────────────────────────────────┐
│                      AvA Desktop (Electron)                     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    React 19 Frontend (UI)                 │  │
│  │  - Chat Sessions         - MCP & Skills Registry          │  │
│  │  - Reasoning & Tool Diff - Dynamic Settings & Providers   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                               │                                 │
│               Electron Preload IPC Bridge                       │
│                               ▼                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Electron Main Process (Node)              │  │
│  │  - HostProcess Supervisor  - Tray & Native Window Manager │  │
│  └───────────────────────────────────────────────────────────┘  │
│                               │                                 │
│                stdio NDJSON JSON-RPC 2.0 (Direct Pipe)          │
│                               ▼                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                Bundled Rust Core (`host-core`)            │  │
│  │  - AI Reasoning Engine     - Local SQLite Sessions        │  │
│  │  - Provider Connectors     - Native Tools & Sandbox       │  │
│  │  - User Config & MCP       - Skills & Dynamic Hooks       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Architectural Guarantees

### A. Zero External Prerequisites
- End-users do not need to install Node.js, Python, Rust, Cargo, or any CLI tools.
- Everything is bundled inside the installer (`.exe`, `.dmg`, `.AppImage`, `.deb`).

### B. High-Performance `stdio` NDJSON JSON-RPC
- Electron Main launches the bundled Rust binary as a child process.
- Communication flows via standard input/output (`stdin`/`stdout`) in NDJSON format.
- Sub-millisecond latency, zero network port conflicts, and automatic lifecycle management (Core shuts down cleanly when Desktop exits).

### C. Unified Storage & Configuration
- **User Config**: Read/written directly to `~/.config/ava/` or `%APPDATA%\ava\`.
- **Sessions & Transcripts**: Persisted in local SQLite database and rollout logs.
- **MCP Servers & Skills**: Auto-discovered by the Rust Core from `skills/`, `plugins/`, and `mcp_config.json`.

### D. Dynamic Core Capabilities
- Because the UI communicates through standard, generic event streams (`item/agentMessage/delta`, `item/reasoning/textDelta`, `item/commandExecution/outputDelta`, `dynamicToolCall`, etc.), any new tools or agent abilities added to Rust Core work automatically in the Desktop UI without requiring frontend changes.

---

## 3. Build & Packaging Commands

```bash
# Build the Rust release binary
cargo build --release --manifest-path ../../Cargo.toml -p host-core

# Bundle agent runtime
pnpm -C ../../packages/agent-runtime bundle

# Build Desktop assets
pnpm --filter '@pi-desktop/desktop^...' build && electron-vite build

# Build standalone distribution packages
pnpm run dist:win      # Windows (.exe installer & portable zip)
pnpm run dist:mac      # macOS (.dmg & zip)
pnpm run dist:linux    # Linux (.AppImage, .deb, .rpm)
```
