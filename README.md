# AvA Code Alpha

<p align="center"><strong>AvA Code Alpha</strong> is a next-generation autonomous coding agent built for deep multi-turn workflows, running locally with process sandboxing, robust session resumption, native Google Antigravity provider integration, and the <strong>AvA Core Alpha SDK</strong>.</p>

---

## 📚 Phased Documentation

Complete technical documentation is available in the [`docs/`](file:///var/www/ava-code/docs/README.md) directory:

- **[Phase 1: Architecture & AvA Core Alpha SDK Integration](file:///var/www/ava-code/docs/phase-1-architecture-and-sdk.md)** — System topology, SDK architecture, and native Rust engine.
- **[Phase 2: JSON-RPC 2.0 Protocol & API Specification](file:///var/www/ava-code/docs/phase-2-protocol-and-api.md)** — Full endpoint reference and Server-Sent Events (SSE) streaming lifecycle.
- **[Phase 3: Comprehensive Bug Audit & Vulnerability Report](file:///var/www/ava-code/docs/phase-3-bugs-and-audit.md)** — In-depth audit of server/mobile state, memory leaks, and security risks.
- **[Phase 4: Multi-Provider & Google Antigravity Integration](file:///var/www/ava-code/docs/phase-4-antigravity-and-providers.md)** — Google Antigravity OAuth 2.0 PKCE, token refresh rotation, and model matrix.
- **[Phase 5: SDK Implementation Recipes & Developer Guide](file:///var/www/ava-code/docs/phase-5-sdk-recipes.md)** — TypeScript & Python code recipes for streaming turns, Zod structured outputs, and persistent sessions.
- **[Phase 6: Operations, Deployment & Security Runbook](file:///var/www/ava-code/docs/phase-6-operations-and-deployment.md)** — Production hosting, PM2 process management, Flutter web build, and security boundaries.

---

## 🚀 Quickstart

### Running the CLI
```shell
ava
```

### Running Headless Tasks
```shell
ava exec --prompt "Refactor auth middleware and run tests"
```

### Using the AvA Core Alpha SDK (`@avacode/sdk`)
```typescript
import { Ava } from "@avacode/sdk";

const ava = new Ava();
const thread = ava.startThread({ workingDirectory: process.cwd() });
const { events } = await thread.runStreamed("Fix TypeScript errors");

for await (const event of events) {
  if (event.type === "item.completed") {
    console.log("Completed item:", event.item);
  }
}
```

---

## ⚙️ Configuration

AvA loads configuration from `~/.ava/` (or via `AVA_HOME`):
- User config: `~/.ava/config.toml`
- Workspace config: `.ava/config.toml`
- Persistent sessions: `~/.ava/sessions/`

---

## 📄 License

This project is open source and licensed under the [Apache-2.0 License](LICENSE).
