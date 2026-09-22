# AvA Code Alpha Documentation Hub

Welcome to the official documentation for **AvA Code Alpha** — the next-generation autonomous AI coding platform powered by the native **AvA Core Alpha SDK**, Rust execution engine, and Google Antigravity provider.

---

## 📚 Phased Architectural & Implementation Documentation

Our documentation is structured into six comprehensive phases:

### [Phase 1: Architecture & AvA Core Alpha SDK Integration](file:///var/www/ava-code/docs/phase-1-architecture-and-sdk.md)
- Complete system topology (Flutter Client -> JSON-RPC Server -> AvA Core Alpha SDK -> Rust Core).
- Rationale for using `@avacode/sdk` to simplify session management, event streaming, and process sandboxing.
- Architectural comparison: Fragile in-memory raw spawns vs. SDK integration.

### [Phase 2: JSON-RPC 2.0 Protocol & API Specification](file:///var/www/ava-code/docs/phase-2-protocol-and-api.md)
- Complete endpoint reference (`thread/create`, `thread/read`, `thread/fork`, `thread/rollback`, `turn/start`, `turn/interrupt`, `config/read`, `config/write`, `provider/discover`, `file/read`, `file/write`, `file/grep`).
- Request and response payload schemas.
- Server-Sent Events (SSE) streaming lifecycle specification.

### [Phase 3: Comprehensive Bug Audit & Vulnerability Report](file:///var/www/ava-code/docs/phase-3-bugs-and-audit.md)
- Deep code audit of `apps/server/src/index.ts`, `apps/mobile/lib/`, and configuration stores.
- Documented critical vulnerabilities: In-memory thread volatility (BUG-01), rollback math error (BUG-02), fork shallow reference leak (BUG-03), command injection in grep (BUG-04), model catalog hardcoding (BUG-05), Dart RPC type mismatches (BUG-06), and token expiration (BUG-07).

### [Phase 4: Multi-Provider & Google Antigravity Integration](file:///var/www/ava-code/docs/phase-4-antigravity-and-providers.md)
- Deep dive into Google Antigravity (Gemini 3.7 Flash, Gemini 3.8 Flash, Gemini 3.1 Pro, Claude 3.7 Sonnet Thought).
- OAuth 2.0 PKCE authentication flow and automated token rotation.
- TOML provider configuration rules.

### [Phase 5: SDK Implementation Recipes & Developer Guide](file:///var/www/ava-code/docs/phase-5-sdk-recipes.md)
- TypeScript & Python code recipes for starting threads, streaming events with async generators, structured JSON output validation via Zod, and persistent session resumption.

### [Phase 6: Operations, Deployment & Security Runbook](file:///var/www/ava-code/docs/phase-6-operations-and-deployment.md)
- Production hosting configuration, PM2 service management, Flutter web compilation pipeline, environment secrets management, and security boundary isolation.

---

## 🛠️ Specialized References

- [Configuration Guide](file:///var/www/ava-code/docs/config.md)
- [Custom Providers](file:///var/www/ava-code/docs/custom_providers.md)
- [Installation Guide](file:///var/www/ava-code/docs/install.md)
- [Execution & Sandboxing](file:///var/www/ava-code/docs/exec.md)
- [Contributing](file:///var/www/ava-code/docs/contributing.md)
