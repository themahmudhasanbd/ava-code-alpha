## Audit & Unified Storage Architecture Update (2026-09-21)
- **Unified Config & Storage Path**: All App and CLI instances read/write from `~/.config/ava-code/` (and secondary `~/.ava-code/`).
- **Dual SQLite + JSON Sync**: Threads, session turns, and messages are synchronized simultaneously to both `state_5.sqlite` and `sessions.json` / `session_index.jsonl`.
- **Zero Static Errors**: Mobile streaming handler (`agent_core_streaming.dart` and `main.dart`) now exclusively forwards dynamic server/model error messages without hardcoded fallback overrides.
- **Provider & Model Discovery**: OmniRoute (`http://127.0.0.1:20128/v1`) models are discovered dynamically at the user level without hardcoding credentials in source code.
## Tool Calling Verification (2026-09-21)
- **Agentic Multi-step Tool Loop**: Integrated `exec_command`, `read_file`, `write_file`, and `list_files` into `executeOpenAICompatibleTurnStreaming`.
- **Live PM2 Status Test**: Successfully executed live `pm2 status` through tool execution and returned fully structured markdown table response.

## Automated Web Deployment Pipeline (2026-09-22)
- Script: `/var/www/ava-code/scripts/deploy-web.sh` (aliased to `ava-deploy-web` and `/var/www/ava-code/deploy.sh`)
- Automated Pipeline Actions:
  1. Auto stages & commits code changes and pushes to GitHub (`origin main`).
  2. Runs optimized Flutter Web release build (`flutter build web --release --no-wasm-dry-run`).
  3. Syncs web build bundle to `/var/www/ava.mahmudhasan.pro/`.
  4. Fixes folder permissions (755) and reloads Nginx.
  5. Performs live domain health check (`https://ava.mahmudhasan.pro/`).

## [2026-09-23] UI Refactoring: Header Session Title, Workspace Modal, Column Layout & Model Reasoning Modal
- **Non-Overlapping App Layout**: Replaced floating `Stack` with `Column(children: [HeaderBar, NetworkStatusBar, Expanded(child: _buildActiveTabContent)])` in `main.dart`, eliminating header clipping/overlap across all sub-screens (MCP, Models, Tasks, Terminal, Files, Settings, System).
- **Top Header Bar**: Removed model dropdown from the top app bar; replaced with Active Session Title + chevron trigger that opens `WorkspacePreferenceScreen` inside a bottom sheet modal.
- **Model & Reasoning Modal**: Enhanced `ModelReasoningModal` with dynamic search, provider accent colors (Anthropic, OpenAI, OmniRoute, Google, DeepSeek), and full reasoning level presets (`none`, `low`, `medium`, `high`, `xhigh`).
- **Smooth Scroll-to-Bottom**: Implemented `Curves.easeOutCubic` animation with distance-scaled duration for floating jump-to-latest button and seamless initial positioning on session open.
- **Verification**: 62 unit/widget tests passing (100%), Web build compiled and deployed to `https://ava.mahmudhasan.pro/`.

## [2026-09-24] AvA Desktop Standalone Native Core Unification & CI Packaging
- **Native Rust Engine Integration**: AvA Desktop electron host now directly spawns `ava-app-server --listen stdio://` from `/opt/AvA Code Alpha/resources/bin/ava-app-server` (compiled from `/var/www/ava-code/ava-rs`).
- **Strict Harness Isolation**: Completely decoupled AvA Desktop runtime discovery and importer routines from `~/.ava-code` (`AVA_HOME`). Desktop configuration and session state exclusively operate out of `/root/.ava-code`.
- **Standalone Linux DEB via GitHub Actions**: Release packaging is automated via `.github/workflows/desktop-build-release.yml`, bundling the full Electron app and embedded Rust engine into `ava-code-alpha_0.15.2-alpha_amd64.deb` without heavy local compilation.
- **System Installation**: Installed and verified `/opt/AvA Code Alpha/ava-code-alpha` on the system with full stdio JSON-RPC capability.

## Mobile App Instant Session Transition & Clean UI (2026-09-28)
- **Instant Session Creation**: `ChatScreen` synchronously navigates to `SessionScreen` on prompt submission without waiting for `startSession` RPC resolution.
- **Optimistic Transcript Streaming**: `useChat` immediately renders the user prompt and thinking state in the transcript, creating the session in parallel and streaming response deltas seamlessly.
- **Minimal User Message Footer**: Removed display name and "You" tag from `UserTurnView`; only the profile avatar image and copy button are shown.
- **AI Output Copy Icon Button**: Kept copy functionality as a minimal icon button and removed the text label ("Copy output").

## Turn Stream Resilience & Tool Media Preview (2026-09-28)
- **Non-Fatal Turn Error Handling**: Fixed false prompt failures in `src/core/api/chat.ts` by checking `params?.fatal === true` before terminating turn stream listeners. Non-fatal warnings and tool notices no longer prematurely abort the turn or trigger false error banners while the backend LLM is still running.
- **Tool Title and Subtitle Sanitization**: Cleaned `displayToolName` and introduced `getToolSubtitle` in `src/components/chat/tool-icons.ts` so `TimelineScreen` headers show clean tool names and concise context summaries (e.g. file path, query, domain) instead of dumping raw JSON strings.
- **Tool Media & Screenshot Preview Pipeline**:
  - Upgraded `items.ts` (`extractMediaFromMcpContent`, `extractMediaFromText`, `itemToPart`) to parse MCP image blocks, base64 screenshots (`data:image/...`), local VPS image paths (`/root/...`, `/var/...`), and `view_image` calls.
  - Created `MediaPreviewGallery` with full-screen interactive lightbox viewing, downloading, and theme-adaptive rendering.
  - Integrated image gallery previews directly into both `SessionScreen` (`AssistantTurn`, `UserTurnView`) and `TimelineScreen` (`nodeContent`, response nodes).
- **Web Deployment**: Re-exported web bundle via `npx expo export --platform web` and deployed to `/var/www/ava.mahmudhasan.pro/`.

### Mobile Client Awareness & Composer Token Highlighting (Sep 2026)
- **AvA Core Mobile Instructions**: Filtered `turn_context.app_server_client_name` for `mobile` or `web`. Injected instructions preventing manual filesystem paths and desktop shortcuts, while providing full awareness of mobile app features (Drawer, Timeline, Step Overview, Composer, Voice Notes, MCP mentions).
- **Theme-Aware Syntax & Token Highlighting**: Added active token detection in `ava-mobile/src/components/chat/composer.tsx` for registered `/` commands and `@` mentions with dynamic theme colors (`colors.primary`, `colors.border`, `colors.secondary`, `isDark`), integrated with `SlashCommandPopup` and `MentionPopup`.
- **Live Web Deployment**: Built with `npx expo export --platform web` and deployed to `https://ava.mahmudhasan.pro`.

### Media Extraction & Gallery UI Optimization (2026-09-28)
- **Problem**: Terminal command executions mentioning image file paths (e.g. `ls -la /tmp/thundernexus.png`) were matched by regexes, causing duplicate and phantom broken image cards in Chat and Timeline screens. Large screenshots also exceeded WebSocket payload limits.
- **Fix**:
  1. Updated `extractMediaFromText` with `{ allowLocalFilePaths: false }` for command execution items.
  2. Increased WebSocket frame and message sizes to 64MB in `app-server-transport` and `exec-server`.
  3. Sanitized `readMediaUrl` to validate base64 output length and discard invalid/empty results.
  4. Redesigned `MediaPreviewGallery` with a minimal, modern card layout, pill badges, and fullscreen Lightbox modal.
  5. Verified live multi-turn session via Playwright browser automation with 0 console errors and clean rendering.

### Empty Session Prompt Multi-Dispatch & Stream Resilience (2026-09-28)
- **Problem**: When starting a session from an empty prompt box, the prompt dispatched 2-3 times repeatedly and the UI showed "Task finished / Response completed" without live token streaming until a full app reload.
- **Root Causes**:
  1. In `SessionScreen.tsx`, the `useEffect` key was constructed as \`\${sessionId || "new"}:\${initialPrompt}\`. When `send` created the thread on the server and updated `activeSessionId`, `sessionId` transitioned from `""` to the new ID, altering the key and re-triggering prompt submission.
  2. In `use-chat.ts`, the `sessionChanged` effect detected `prevSessionId (null) !== currentSessionId (new thread)` and immediately tore down `offRef.current`, killing the live event stream for the turn in progress.
- **Fix**:
  1. Replaced fragile compound prompt key with `handledInitialPromptRef` to guarantee single-execution dispatch on mount and immediately cleared route params via `navigation.setParams({ initialPrompt: undefined })`.
  2. Protected active turn streams in `use-chat.ts` during new session ID assignment (`if (!isTurnCurrentlyStreaming)`) so listeners are preserved and live delta streaming continues unbroken.
  3. Re-exported and deployed updated web bundle to `/var/www/ava.mahmudhasan.pro/`.
