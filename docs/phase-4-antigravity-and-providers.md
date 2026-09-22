# Phase 4: Multi-Provider & Google Antigravity Integration

## 1. Google Antigravity Architecture

AvA Code Alpha features first-class native integration with Google Antigravity / Google Cloud Code Assist infrastructure. This provides high-throughput, low-latency access to frontier models with generous token quotas and tiered fallback strategies.

```
+-------------------------------------------------------------------------------+
|                             Google Cloud Platform                             |
|  +---------------------------+   +-----------------------------------------+  |
|  | Google Cloud Code Assist  |   | Generative Language API (Vertex/Gemini) |  |
|  +---------------------------+   +-----------------------------------------+  |
+-------------------------------------------------------------------------------+
                                     ^
                                     | OAuth 2.0 Bearer Token Exchange
                                     v
+-------------------------------------------------------------------------------+
|                       AvA Code Antigravity Provider                           |
|  - Auto Token Refresh (3600s rotation)                                        |
|  - Dynamic Model Discovery & Capability Matrix                                |
|  - Stream Protocol Adapter (SSE to JSONL)                                     |
+-------------------------------------------------------------------------------+
```

---

## 2. Supported Model Matrix

| Model Identifier | Provider | Max Context | Features / Best For |
| :--- | :--- | :--- | :--- |
| **`gemini-3.7-flash-tiered`** | Google Antigravity | 1,048,576 tokens | High-speed multi-file agentic reasoning, code search, auto-fallback. |
| **`gemini-3.8-flash`** | Google Antigravity | 1,048,576 tokens | Frontier preview model for low-latency coding tasks. |
| **`gemini-3.1-pro`** | Google Antigravity | 2,097,152 tokens | Massive context repository analysis, full-repo refactors. |
| **`claude-3-7-sonnet-thought`** | Google Antigravity | 200,000 tokens | Deep architectural planning, hybrid thinking & reasoning blocks. |
| **`gpt-oss`** | Local / Custom | Custom | Local self-hosted LLM execution with zero external data transfer. |

---

## 3. Authentication & OAuth 2.0 Lifecycle

Google Antigravity authentication is configured via `~/.config/ava/auth.json` or environment credentials.

### Authentication Flow:
1. **OAuth Initial Token Exchange**:
   - The user authorizes via Google OAuth PKCE flow.
   - Credentials (`access_token`, `refresh_token`, `expiry`) are saved to `~/.config/ava/auth.json`.
2. **SDK Automatic Refresh Loop**:
   - `@avacode/sdk` inspects `expiry` timestamp before each turn.
   - If token lifetime is `< 300s`, the SDK transparently requests a new `access_token` using `refresh_token`.

---

## 4. Configuration Reference (`config.toml`)

```toml
# ~/.config/ava/config.toml

model = "gemini-3.7-flash-tiered"
model_provider = "google-antigravity"

[sandbox]
mode = "workspace_write"
network_access = true

[providers.google-antigravity]
tier = "tier-1"
auto_fallback = true
fallback_model = "gemini-3.8-flash"
max_thought_budget = 8192
```
