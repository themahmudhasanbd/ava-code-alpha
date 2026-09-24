# AvA Mobile V2 — MVP Scope

## In Scope (MVP)

| # | Feature | Priority | API Methods |
|---|---------|----------|-------------|
| 1 | **Server connection** | P0 | `initialize`, WebSocket connect |
| 2 | **Connection health/status** | P0 | `healthz`, connection state tracking |
| 3 | **Session list** | P0 | `thread/list` |
| 4 | **Session creation** | P0 | `thread/start` |
| 5 | **Session selection** | P0 | `thread/read` |
| 6 | **Agent conversation** | P0 | `turn/start`, `item/started`, `item/completed` |
| 7 | **Streaming responses** | P0 | `item/agentMessage/delta` |
| 8 | **Stop/cancel generation** | P0 | `turn/interrupt` |
| 9 | **Model selection** | P1 | `model/list` |
| 10 | **Tool execution visualization** | P1 | `item/started` (commandExecution), `item/commandExecution/outputDelta`, `item/completed` |
| 11 | **Reasoning/thinking display** | P1 | `item/started` (reasoning), `item/reasoning/textDelta` |
| 12 | **Basic project info** | P1 | `project/list` |
| 13 | **Settings** | P1 | Local persistence |
| 14 | **Persistent server config** | P1 | Tauri secure storage |
| 15 | **Dark/light mode** | P2 | Local preference |
| 16 | **Session rename** | P2 | `thread/name/set` |
| 17 | **Session delete** | P2 | `thread/delete` |
| 18 | **Reconnect behavior** | P1 | Auto-reconnect with backoff |
| 19 | **Error states** | P1 | Error boundary, toast notifications |
| 20 | **Empty states** | P2 | Welcome screen, no-session state |

## Out of Scope (Post-MVP)

- Voice input/output (realtime API)
- File attachments
- Image attachments / gallery
- Terminal emulator
- Remote desktop (VNC)
- Browser viewer
- MCP server management
- Scheduled tasks
- Prompt queue
- Slash commands
- Git integration details
- Memory management
- Context compaction trigger
- Session fork
- Session search
- Multi-workspace
- Background tasks
- Push notifications
- OAuth flows
- Plugin management

## Quality Gates

Every MVP feature must have:
- Loading state
- Empty state
- Error state
- Retry behavior (where applicable)
- Cancellation (where applicable)
- Dark mode support
- Mobile touch targets (48dp minimum)
- Android back navigation handling
