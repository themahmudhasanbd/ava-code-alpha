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
