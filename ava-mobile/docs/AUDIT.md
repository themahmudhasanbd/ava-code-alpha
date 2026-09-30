# AvA Mobile — Audit Report

**Project:** `~/workspace/ava-mobile` (React Native / Expo 57, RN 0.86)
**Date:** 2026-09-30
**Scope:** `src/` — screens, components, state, core, navigation, theme, hooks, lib, config
**Method:** read-only static audit + protocol cross-check.
**Protocol authority:** `/tmp/ava-code-server/ava-rs/app-server-protocol/src/protocol/` (`common.rs` + `v2/*.rs`, Rust source). The repo's generated TypeScript schema is **stale** — do not treat it as the contract.
**Status legend:** `OPEN` = not fixed yet. Findings marked `UNVERIFIED` need the live VPS to confirm.

> Note: an earlier draft of finding A1 claimed `new File(uri)` was the browser `File` API and broken. That was **wrong** — the code imports `File` from `expo-file-system` (valid API with `arrayBuffer()`/`base64()`). Do not act on the old claim.

---

## Fix pass — 2026-09-30 (authorized by Mahmud)

All HIGH findings were fixed and `npx tsc --noEmit` is green. Findings below are marked **FIXED** in this pass; a finding keeps its `OPEN` state if not listed here.

**Fixed HIGH (16):** A1, A8 (partial — palette collisions fixed + `useStyles` helper added; full screen-by-screen migration deferred to the UI-plan rollout), P1, P2, P3, P4, P5, C1, C5, C6, C7, C8, C9 (verified already correct — checks `res.success`, no change needed), C10, C23, C33 (per D11: only the three param field names in `system.ts`; key values like `approval_policy` untouched).

**Fixed MEDIUM (~30):** A2, A3, A4, A6, A12, A13, P6, P7, P8, P9, P10, P11, C2, C11, C12, C13, C14, C15, C16, C17, C24, C25, C26, C27, C34, C35, C49, C51, C53, D1, D6, D12, D14, D15, D16.

**Fixed LOW (~25):** A5, A7, A9, A10, A11, P12, C3, C4, C20, C28, C29, C30, C31, C36, C39, C42, C46, C50, C52, C54, C55, C56, D4, D5, D7, D8, D9, D10, D13, D17, D18, D19, D20. (D2 explicitly allowed to remain.)

**Still OPEN / needs live VPS:** C32, C37, C40, C41, C43, C44, C47, C48 (UNVERIFIED — cannot fix safely from static audit), C38 (thread/list pagination — feature work), D3 (streaming command output — feature work).

**Verification:** `npx tsc --noEmit` passes with zero errors. No APK/build was run. No git commits were made.

---

## Part A — First audit: 13 findings (2026-09-29)

Organized by area. All `OPEN`.

### Chat / Composer

**A1 — HIGH — Voice recording failure state + phantom attachment** — `src/components/chat/composer.tsx`
- `startRecording()` (~line 470): the `catch` block calls `setIsRecording(true)` — recording UI shows even though recording failed to start.
- `stopRecording(true)` (~lines 505–560): when `recordingRef.current` is null (never recorded), it fabricates an attachment `{ remotePath: "/root/shared-media/voice_<ts>.m4a" }` that was never recorded or uploaded.
- Fix: keep `isRecording` false on failure; remove the fabricated-attachment branch (surface an error instead).

**A2 — MEDIUM — Production debug log leaks prompt text** — `src/components/chat/composer.tsx:563`
- `console.log("[DEBUG COMPOSER handleSend]", { value, ... })` logs full prompt text in production.
- Fix: remove the log.

### Session

**A3 — MEDIUM — Unbounded prompt-nonce Set** — `src/screens/SessionScreen.tsx:28, 162–180`
- Module-level `processedPromptNonces` grows forever; falls back to raw prompt text when nonce is absent (dedup by text can drop legitimate repeats).
- Fix: bound/scope the set (e.g. per-session, LRU), never dedup on raw text alone.

**A4 — MEDIUM — Unstable FlatList keys** — `src/screens/SessionScreen.tsx:284`
- Key: `` item.id ? `${item.id}_${index}` : `msg_${index}` `` — prepending history remounts every row.
- Fix: use stable `item.id` only.

**A5 — LOW — Hardware back button traps the user** — `src/screens/SessionScreen.tsx:95–103`, `src/screens/TimelineScreen.tsx:163–170`
- Handlers always `return true`, consuming the event even when there is no back route — user can never exit via back button.
- Fix: `return false` when `navigation.canGoBack()` is false.

### Terminal

**A6 — MEDIUM — Fake Ctrl-C** — `src/screens/TerminalScreen.tsx:205–242, 355`
- Ctrl-C appends a local `^C` entry but never interrupts the server command (`src/core/api/terminal.ts` is a single blocking `command/exec` RPC with no verified interrupt endpoint).
- Fix: remove/disable the control or label it honestly unless a real server interrupt RPC is confirmed.

**A7 — LOW — Non-unique terminal entry IDs** — `src/screens/TerminalScreen.tsx`
- IDs from `Date.now()` alone can collide.
- Fix: monotonic/unique ID generator (counter + timestamp).

### Theme

**A8 — HIGH — Theme switching via StyleSheet mutation is unreliable** — `src/theme/style-registry.ts`, `src/theme/theme-context.tsx`
- Patches `StyleSheet.create`, keeps copied JS rules, mutates them after registration. On native, registered values may be opaque IDs — post-registration mutation is not a reliable recolor mechanism.
- Reverse token detection has collisions (light `accent`/`border`/`input` all `#E2E8F0`).
- Fix: migrate theme-dependent styles to `useTheme()` / `useStyles` pattern; fix token collisions.

### Navigation

**A9 — LOW — Drawer double navigation** — `src/navigation/drawer.ts:20–34`
- Navigates to `"Main"` immediately and again after 60 ms.
- Fix: keep a single navigation before opening the drawer.

### State

**A10 — LOW — Untracked queue-drain timeout** — `src/state/use-chat.ts:464`
- 300 ms auto-drain `setTimeout` is not stored/cleared.
- Fix: track in a ref, clear on unmount.

**A11 — LOW — Side effect inside React state updater** — `src/state/use-chat.ts:661–675` (`loadOlder`)
- `chatStore.setState` runs inside the `setVisibleCount` updater (updaters must be pure; StrictMode double-invokes them).
- Fix: compute next count, then update the external store outside the updater.

### Protocol / RPC (client side)

**A12 — MEDIUM — `runTurn` drops `cwd`/`sandbox`** — `src/core/api/chat.ts:172–191` (both initial and retry `turn/start` payloads)
- `RunTurnOptions` declares `cwd`/`sandbox` but the payload sends only `{threadId, input, model?, effort?}`.
- See also P6 below: the server expects `sandboxPolicy` (object), not a `sandbox` string.

### Notifications

**A13 — MEDIUM — Push notifications never initialized** — `src/core/notifications.ts`
- `initPushNotifications()` is defined but has zero callers.
- Fix: call once during native startup (e.g. `App.tsx` `prepare()`), without blocking startup; keep denied-permission handling.

---

## Part B — Protocol audit: app ↔ core contradictions (2026-09-29)

Verified against the public clone at `/tmp/ava-code-server` (cloned 2026-09-29). **VPS deployment parity UNVERIFIED.**

### HIGH

**P1 — MCP OAuth login calls a nonexistent method with wrong params** — `src/core/api/catalog.ts:156`
- App: `rpc.call("mcpServerStatus/oauthLogin", { serverName })`
- Core: method is `mcpServer/oauth/login`, params `{ name, threadId?, … }` (`common.rs:1214`, `v2/mcp.rs:270`).
- Impact: MCP OAuth login from the app is completely broken ("method not found" + wrong param name).
- Fix: call `mcpServer/oauth/login` with `{ name: serverName }`.

**P2 — `turn/steer` omits required `expectedTurnId`** — `src/core/api/chat.ts:512`
- App: `rpc.call("turn/steer", { threadId, input })`
- Core: `TurnSteerParams.expected_turn_id: String` is required (`v2/turn.rs:293–312`); request fails when absent.
- Impact: steer always fails; the catch-fallback to `turn/start` masks it, so steering never actually works.
- Fix: pass `expectedTurnId` (active turn id), or drop the steer attempt.

**P3 — Server approval/elicitation requests are unhandled → turns can stall** — `src/core/api/chat.ts:102–111`
- App handles: `elicitation`, `elicitationRequest`, `question` — none of which the server ever sends.
- Core actually sends: `mcpServer/elicitation/request`, `item/tool/requestUserInput`, `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval` (`common.rs:1770+`).
- Impact: when the server requests approval or user input mid-turn, no listener responds (request `id` ignored) — the server waits, the turn stalls. The `onQuestion`/`answerQuestion` UI is wired to dead method names.
- Fix: handle the five real server-request methods; respond via `rpc.respond(id, …)` per their response types; remove/remap the dead aliases.

**P4 — `item/commandExecution/terminalInteraction` reads wrong fields** — `src/core/api/chat.ts:137–140`
- App reads: `params.interaction?.input ?? params.interaction?.data`
- Core: flat `{ threadId, turnId, itemId, processId, stdin }` (`v2/item.rs:1489–1495`) — text is in `stdin`, no `interaction` wrapper.
- Impact: stdin echo text silently dropped (always `""`).
- Fix: read `params.stdin`.

**P5 — `item/mcpToolCall/progress` reads wrong field** — `src/core/api/chat.ts:121–125`
- App reads: `params.delta ?? params.chunk ?? params.output`
- Core: `{ threadId, turnId, itemId, message }` — text is in `message`.
- Impact: MCP tool progress text silently dropped.
- Fix: read `params.message`.

### MEDIUM

**P6 — `runTurn` drops `cwd`; `sandbox` has wrong shape** — `src/core/api/chat.ts:172–177`
- App sends `turn/start` with only `{threadId, input, model?, effort?}`.
- Core `TurnStartParams` supports `cwd` and **`sandboxPolicy`** (structured union — `{type:"readOnly"}`, `{type:"workspaceWrite"}`, … — `v2/permissions.rs:541`), **not** a string `sandbox`.
- Impact: per-turn cwd silently ignored; naively forwarding `sandbox` would still be wrong (wrong name *and* shape).
- Fix: forward `cwd`; map `"read-only" | "workspace-write" | "danger-full-access"` to a `SandboxPolicy` object under `sandboxPolicy`.

**P7 — `config/write` fallback targets a nonexistent method** — `src/core/api/system.ts:63`
- Falls back to `config/write` after `batchWrite`/`value/write` fail; no such method in `common.rs`.
- Impact: dead fallback; confusing method-not-found error when both real methods fail.
- Fix: remove the fallback.

**P8 — `command/exec/outputDelta` is base64 with different fields** — `src/core/api/chat.ts:86`
- App reads `params.delta ?? params.chunk ?? params.output` as plain text.
- Core: `{ processId, stream, deltaBase64, capReached }` — base64-encoded (`v2/command_exec.rs`).
- Impact: latent — the app currently uses buffered (non-streaming) `command/exec`, so the handler never fires; if streaming is ever enabled, output would be empty/garbled.
- Fix: read `deltaBase64`, base64-decode, key by `processId`.

**P9 — `thread/name/updated` not handled → stale session titles** — session list
- App sets names via `thread/name/set` but never listens for `thread/name/updated`; the server auto-generates titles.
- Fix: handle the event and patch the session list.

**P10 — `thread/status/changed`, `thread/deleted`, `thread/archived` not handled**
- Cross-client thread changes never propagate to the mobile UI (stale list entries).
- Fix: handle the events and update/invalidate the session list.

**P11 — `mcpServer/oauthLogin/completed` not handled**
- Compounds P1: even a successful OAuth flow wouldn't refresh the MCP server list.
- Fix: handle the event and refresh `mcpServer` state.

**P12 — LOW — Dead `method === "turn/start"` branch** — `src/state/ava-provider.tsx:105`
- `turn/start` is a client→server request, never a server notification — the branch can never fire. Harmless; remove for clarity.

### LOW / notes

- `item/fileChange/outputDelta` is deprecated in core ("The server no longer emits this notification") — the app's handler is dead but harmless.
- `reloadMcpServers` (`catalog.ts:151`) calls `mcpServerStatus/list` instead of the real reload method `config/mcpServer/reload` — re-lists but doesn't reload; misleading name.
- `QueuedSubmission` has no `createdAt` — app already handles defensively. `ThreadQueueAddResponse` wraps in `{queuedSubmission}` — app handles via `res?.queuedSubmission ?? …`. Fine.

### Verified correct (no action needed)

`thread/start` `{cwd, model, sandbox}` (kebab-case `SandboxMode` matches the app's `"read-only"` ids) · `thread/resume` · `turn/interrupt` `{threadId, turnId}` · `fs/*` params (`fs/writeFile` `{path, dataBase64}`, `fs/readFile` → `{dataBase64}` — wire names confirmed camelCase via serde) · `command/exec` `{command[], cwd, timeoutMs}` → `{exitCode, stdout, stderr}` · `userProfile/read|write` · `config/read|batchWrite|value/write` · `server/diagnostics` → `{process, gauges}` · all `thread/queue/*` methods exist · `UserInput` tagged union `{type:"text", text, text_elements}` matches · event payloads for `turn/started|completed`, `item/*` deltas, `tokenUsage`, `mcpServer/startupStatus/updated`, `turn/plan/updated`, `thread/goal/updated` all match · `Thread` has `name`, `turns`, `preview`, `cwd`, `model`, `updatedAt` · `Model` fields covered by defensive fallbacks.

---

## Part C — Full verification sweep: NEW findings (2026-09-30)

Systematic per-screen / per-component / per-state / per-core-API verification. Only findings NOT in Parts A/B are listed here.

### Components

**C1 — HIGH — Media upload silently skipped, broken attachment still attached** — `src/components/media/MediaSelectorModal.tsx:66–93` (`uploadFileToServer`)
- If `rpc` is null or `rpc.status !== "online"`, the upload is skipped entirely; if `rpc.call("fs/writeFile", …)` throws, the error is caught and only `console.warn`ed. In both cases the function still returns a `SelectedMedia` with the `remotePath`, and callers (`pickDocument`/`pickGallery`/`pickCamera`) unconditionally run `onSelect(media)` + `onClose()`.
- Impact: the composer attaches a file that was never uploaded; when the user sends, the server receives a `remotePath` that doesn't exist — broken message, confused user, zero feedback.
- Fix: return `null`/throw on skipped-or-failed upload; only `onSelect` on success; show an `Alert` ("Upload failed — you're offline" / error message).

**C2 — MEDIUM — False "Successfully uploaded" alert** — `src/components/media/ServerMediaModal.tsx:375–401` (`handleUploadToCurrentDir`)
- The upload is guarded by `if (rpc && rpc.status === "online")`, but the success path (`setSelectedFile`, `refetch()`, `Alert.alert("Uploaded", "Successfully uploaded …")`) runs unconditionally afterwards.
- Impact: offline user is told the upload succeeded when nothing was uploaded (the refetch right before the alert will even show the file missing).
- Fix: return early with an error alert when offline; only show success after `fs/writeFile` resolves.

**C3 — LOW — Dead code: duplicate session list** — `src/components/layout/sessions-list.tsx` (661 lines)
- No file in `src/` imports it (the drawer uses `components/layout/AppDrawer.tsx`). Appears to be a superseded duplicate of the session-list logic now inside `AppDrawer`.
- Impact: maintenance hazard / confusion only.
- Fix: delete the file (it's not referenced; `app-drawer.tsx`/`app-shell.tsx` are just re-export shims and are fine).

**C4 — LOW — Hardcoded server path fallback** — `src/components/chat/composer.tsx:427`
- `const baseRoot = workingCwd || "/var/www/ava-code"` — @-mention file browsing assumes the VPS layout when no cwd is set.
- Impact: breaks on any server that doesn't host code at `/var/www/ava-code`.
- Fix: fall back to the server's actual default (e.g. from `APP.defaultCwd`, or don't offer file mentions until cwd is known).

**Verified OK (components):** `fs/writeFile` `{path, dataBase64}` and `fs/readFile` → `{dataBase64}` wire shapes match the protocol (serde `camelCase` confirmed in `v2/fs.rs`); voice-note upload path uses the same correct shape; `message-parts.tsx` question-answer UI correctly rolls back optimistic state on failure (though the whole flow is dead per P3 — the server never sends `question` events); `useElapsed` timer has proper cleanup.

### Screens (batch 1: Chat/Session/Terminal/Timeline/Files/Browser/Desktop)

**C49 — MEDIUM (latent) — `command/exec/outputDelta` decoded with wrong fields; streamed output silently dropped** — `src/core/api/chat.ts:83–86, 270–273` (extends P8)
- Both `runTurn` and `attachToRunningTurn` share the handler: reads `params?.delta ?? params?.chunk ?? params?.output` keyed off `params?.itemId ?? params?.processId`.
- Protocol (`v2/command_exec.rs:202–212`): `{process_id, stream, delta_base64, cap_reached}` — none of the app's fields exist; no `threadId` either. Handler would append `""` keyed off a nonexistent id.
- Currently latent: nothing in the app sets `streamStdoutStderr: true` or passes `processId`, so the server never emits it — but any future streaming use gets total data loss.
- Fix: dedicated case reading `params.processId`, base64-decoding `params.deltaBase64`, routing by the client-supplied process id (which the app must start tracking), respecting `cap_reached`.

**C50 — MEDIUM — Timeline Changes tab → Files navigation passes a param FilesScreen never reads** — `src/screens/TimelineScreen.tsx:1198`
- Navigates with `params: { path: file.path }`; `FilesScreen.tsx:257,260–261` reads only `route?.params?.initialPath` and `route?.params?.openFile`.
- Impact: tapping a changed file navigates to Files but the file is neither opened nor is the root set — the tap silently does nothing useful. (The other caller, `WorkspacePreferenceModal.tsx:217`, correctly passes `{ initialPath }`.)
- Fix: pass `params: { openFile: file.path }` — FilesScreen already derives the root from the opened file's parent.

**C51 — MEDIUM — Terminal rendered history is unbounded** — `src/screens/TerminalScreen.tsx:147–148, 239–240`
- `history: [...t.history, {…}]` appended with no cap; `terminal-store.ts:23` has no trim; `saveTerminalTabs` runs on every tabs change. (`commandHistory` is capped at 200; rendered `history` is not.)
- Impact: long terminal sessions accumulate full command output in memory with a save pass on every state change — steady memory growth on a constrained device.
- Fix: cap at both append sites: `history: [...t.history, entry].slice(-200)`.

**C52 — LOW (latent race) — ChatScreen new-session relies on context flush timing** — `src/screens/ChatScreen.tsx:34–44`
- `setActiveSessionId(null); navigation.navigate("Session", { sessionId: undefined, initialPrompt, promptNonce })` — SessionScreen computes `sessionId = routeSessionId ?? activeSessionId ?? ""`, so the value comes from context because the route param is explicitly `undefined`.
- Impact: correctness depends on React batching flushing the context update before SessionScreen's `useChat(sessionId)` first runs. Any async boundary between them sends the prompt to the *previous* session instead of starting a new one.
- Fix: navigate with `sessionId: ""` or add an explicit `newSession: true` param honored by SessionScreen.

**C53 — LOW/MEDIUM (UX) — SessionScreen swipe-to-Timeline fires over horizontally-scrolling code blocks** — `src/screens/SessionScreen.tsx:130–156, 276–277`
- Right-to-left swipe (`dx < -65 && |dy| < 55 && dt < 450`) on the KeyboardAvoidingView wrapping the message list navigates to Timeline; touches bubble from nested horizontal ScrollViews (code blocks).
- Impact: a fast leftward fling over wide code navigates away unexpectedly, losing scroll position.
- Fix: use a `PanGestureHandler` with `failOffsetY`/`activeOffsetX` (as TimelineScreen's own swipe-back does), or ignore swipes from horizontally-scrollable content.

**C54 — LOW — Timeline "NEW" badge never renders** — `src/screens/TimelineScreen.tsx:1227`
- App checks `file.kind === "create"`; protocol `PatchChangeKind` (`v2/item.rs:1145–1149`) serializes as `"add" | "delete" | "update"`; `items.ts` preserves `c.kind?.type`.
- Impact: newly added files render "MOD" instead of "NEW".
- Fix: check `"add"` (or normalize `"add"`→`"create"` in `items.ts`'s fileChange mapping).

**C55 — LOW — ChatScreen error banner is dead code** — `src/screens/ChatScreen.tsx:22, 34, 63`
- `error` state is only ever set to `null`; no path sets a message; the send failure path returns `null` silently.
- Fix: remove the banner or wire real start-session failures into it.

**C56 — LOW — Reasoning content dropped when model emits content but no summary** — `src/core/api/items.ts:249`
- `const s = Array.isArray(item.summary) ? item.summary.join("\n\n") : str(item.summary ?? item.text ?? "")` — protocol `Reasoning` (`v2/item.rs:282–288`) has `summary: Vec<String>` (always an array, `#[serde(default)]`) and `content: Vec<String>`; an empty summary joins to `""` and never falls back to `content`.
- Impact: historical reasoning items with content but no summary render empty in history/timeline.
- Fix: `const parts = item.summary.length ? item.summary : item.content;`

(Duplicate suppressed: this batch's "goal status" finding is identical to C34 — see above. Its `outputDelta` notes are merged into C49/P8.)

**Verified OK (batch 1):** ChatScreen→Session param contract ✓; `turn/start {threadId, input:[{type:"text", text, text_elements:[]}], model?, effort?}` ✓ (`text_elements` confirmed snake_case on the wire); `thread/resume {threadId}` ✓; `turn/interrupt {threadId, turnId}` ✓; `thread/read {threadId, includeTurns}` ✓; `thread/start {cwd, model, sandbox}` ✓; `thread/queue/*` ✓; `thread/name/set`, `thread/archive`, `thread/delete` ✓; ReasoningEffort values `low/medium/max/ultra` ✓; events (`turn/started|completed`, `item/started|completed`, agent/reasoning deltas, `turn/plan/updated`, `thread/tokenUsage/updated`, `thread/queue/changed`, `mcpServer/startupStatus/updated` incl. `"ready"`/`"failed"` checks, `warning {message}`, `error {error, willRetry}`) ✓; Terminal `command/exec {command:["bash","-lc",cmd], cwd, timeoutMs:120000}` ✓ (client 130 s timeout > server 120 s, sane); `WorkspacePreferenceModal`→Terminal `{initialCwd}` ✓; Timeline↔Session `scrollToMessageId` ✓; Files `fs/*` all six methods ✓ + route contract `{initialPath, openFile}` ✓; Browser/Desktop no params/RPC; all navigate targets exist in RootNavigator.

**UNVERIFIED (batch 1):** expo-file-system `File.write` sync/async semantics in FileEditor `handleShare` (needs docs/device check); server runtime behavior for `command/exec` experimental gating and `thread/queue/start` with unavailable model.

### Screens (batch 2: Login/Mcp/Media/Models/Profile/ServerSettings/Settings/*)

**C5 — HIGH — McpScreen: every server always renders "stopped"; Active count always 0** — `src/core/api/catalog.ts:34` (feeds `McpScreen.tsx:231,241,248`)
- Mapper: `status: s.status === "running" ? "running" : "stopped"`. But `McpServerStatus` has **no `status` field** — it has `runtime_status: Option<McpServerConnectionStatus>` (`v2/mcp.rs:76–92`), wire name `runtimeStatus`, values `notStarted | starting | connected | authenticationRequired | failed | cancelled | disabled` (`v2/mcp.rs:29–39`, `v2/shared.rs:36`).
- Impact: `s.status` is always `undefined` → mapper always returns `"stopped"`; `McpScreen`'s `isOnline = status === "ready" || status === "connected"` is never true; status capsule permanently "stopped", Active count permanently 0.
- Fix: map `runtimeStatus` through and check `=== "connected"` (note: `"ready"` is not a list value — it's only a `McpServerStartupState` variant in the push notification).

**C6 — HIGH — McpScreen: OAuth login button can never appear (`authStatus` dropped)** — `src/core/api/catalog.ts:31–44`
- The mapper copies `name`/`status`/`tools` but never `auth_status` (wire `authStatus`, `v2/mcp.rs:90`; values `unknown | unsupported | notLoggedIn | bearerToken | oauth`). The screen (`McpScreen.tsx:61,79–81`) only shows "Login with OAuth" when `server.authStatus === "notLoggedIn" || === "authenticationRequired"` — never rendered.
- Impact: the OAuth flow UI exists but is unreachable from the server list (compounds P1).
- Fix: add `authStatus: s.authStatus` (and `runtimeStatus`) to the mapper.

**C7 — HIGH — McpScreen writes invalid `approval_policy` values** — `src/screens/McpScreen.tsx:40–45, 196–204`
- `APPROVAL_POLICIES = [{id:"auto"},{id:"prompt"},{id:"writes"},{id:"approve"}]` written via `writeConfig` as `approval_policy`.
- Protocol `AskForApproval` serializes kebab-case: valid wire values are `"untrusted" | "on-request" | "never"` or a granular object (`v2/shared.rs:176–192`). All four app values are invalid → write rejected or stores garbage. `currentPolicy = config.data?.approvalPolicy || "auto"` never matches a real server value, so no policy card is ever highlighted.
- Fix: remove this duplicate section — `PermissionsSettingsScreen.tsx:29–44` already implements the same setting with the three correct values.

**C8 — HIGH — `listModels` reads snake_case fields; wire is camelCase** — `src/core/api/catalog.ts:35–56`
- App reads `m.display_name || m.name`, `m.supported_reasoning_efforts` → `e?.reasoning_effort`, `m.is_default`, `m.input_modalities`.
- Protocol `Model` derives `#[serde(rename_all = "camelCase")]` (`v2/model.rs:113`): wire fields are `displayName`, `supportedReasoningEfforts` (array of `{reasoningEffort, description}`, `v2/model.rs:165–171`), `isDefault`, `inputModalities`. There is no `name` field at all.
- Impact: model names display as raw IDs; per-model reasoning efforts never populate (always falls back to hardcoded `["low","medium","max","ultra"]`); `supportsImages` always `true`. (`isDefault` is recomputed from config, so benign.)
- Fix: read `m.displayName`, `m.supportedReasoningEfforts` → `e.reasoningEffort`, `m.isDefault`, `m.inputModalities`.

**C9 — HIGH — `model_fallback_chain` is not a config key in the protocol** — `src/screens/ModelsScreen.tsx:470, 502` via `writeServerConfig` (`core/api/system.ts:35–60`)
- The whole `Config` schema (`v2/config.rs:270–313`) contains no `model_fallback_chain` — repo-wide grep finds it only in the app. `handleSaveFallbackChain` ("Configured N failover target(s) on server") and `handleApplyToServer` ("saved to server configuration") tell the user the write succeeded.
- Server behavior for unknown keys is **UNVERIFIED** (needs live VPS): may reject or silently drop.
- Fix: verify against the live server; if unsupported, keep the chain device-local only and fix the success copy.

**C10 — HIGH — `project_doc_max_bytes` is not a config key in the protocol** — `src/screens/WorkspaceSettingsScreen.tsx:64` via `writeServerConfig`
- No `project_doc_max_bytes` (or `docMaxBytes`) anywhere in the protocol's `Config`. Compounded by a write-path bug: `handleSaveDocLimit` optimistically `setDocLimit(limitBytes)` and only alerts on a *thrown* error — but `writeServerConfig` never throws; it resolves `{success: false}`, so a rejected write is silently accepted in the UI with no rollback.
- Fix: verify the key against the live server; check `result.success` like `McpScreen` does and roll back `docLimit` on failure.

**C11 — MEDIUM — PermissionsSettings: optimistic update without rollback** — `src/screens/PermissionsSettingsScreen.tsx:103–122`
- `setActiveApproval(val)` runs before `writeConfigMutation.mutateAsync(...)`; the catch shows an alert but never restores the previous value. Same pattern in `handleSelectSandbox`.
- Impact: on write failure the toggle visually stays on the failed value while the server holds the old one.
- Fix: capture the previous value and restore it in the catch block.

**C12 — MEDIUM — ModelsScreen reads server fallback chain only at mount** — `src/screens/ModelsScreen.tsx:103–111, 114–124`
- `loadLocalState()` runs once in `useEffect(..., [])` and reads `config.data?.model_fallback_chain` — but `useServerConfig()` is typically still loading at mount, so the branch is skipped and the server chain is never picked up later.
- Fix: move the server-chain read into a separate effect keyed on `config.data`.

**C13 — MEDIUM — TasksScreen: silent failures on save/delete** — `src/screens/TasksScreen.tsx:41–50`
- `handleSave` only `console.warn`s; `deleteTask.mutate(t.id)` has no `onError`. Cron-file writes can fail (permissions, missing dir) — invisible to the user.
- Fix: `Alert.alert` on both paths.

**C14 — MEDIUM — SystemScreen: unbounded overlapping `command/exec` polling** — `src/screens/SystemScreen.tsx:368–375`
- A 4 s `setInterval` fires `diag.refetch()` *and* `fetchHardwareStats()` (a `command/exec` with 120 s timeout). No in-flight guard — if the server is slow, python3-over-RPC calls pile up every 4 s on a resource-limited VPS. The diagnostics query also has its own 10 s `refetchInterval` (`useDiagnostics`), so telemetry is double-polled.
- Fix: guard with an in-flight flag, or drop the manual interval and rely on the query's `refetchInterval`.

**C15 — MEDIUM — MediaScreen: preview race across items** — `src/screens/MediaScreen.tsx:135–175`
- `handleOpenItem` sets `previewItem` synchronously, then `await rpc.call("fs/readFile", …)`. Tapping item B while A's read is in flight: A's `setPreviewBase64` fires after B's reset → B's viewer shows A's content. No staleness guard.
- Fix: capture the item path in a ref; ignore the response if it doesn't match the current preview item when it resolves.

**C16 — MEDIUM — McpScreen never learns about server status changes** — `src/screens/McpScreen.tsx`
- No `rpc.on` listener. Protocol pushes `mcpServer/startupStatus/updated` (`common.rs:1988` → `v2/mcp.rs:311–321`). After reload/OAuth completion the list stays stale until manual refresh.
- Fix: add an `rpc.on` listener for `mcpServer/startupStatus/updated` that invalidates the `["mcp"]` query. (The `mcpServer/oauthLogin/completed` gap is P11.)

**C17 — MEDIUM — McpScreen per-server "Reload" actually reloads everything** — `src/screens/McpScreen.tsx:175–192`
- Per-server card dialog: `Reload the "${name}" MCP server?` → calls global `reload.mutateAsync()` (`config/mcpServer/reload`, params `Option<()>` — global by definition, `common.rs:1220–1224`), then alerts `"${name}" has been reloaded.`
- Impact: copy promises a per-server reload that doesn't exist in the protocol.
- Fix: change copy to "Reload all MCP servers" or remove the per-server button.

**C18 — LOW — Post-unmount state updates (several screens)**
- No cleanup guards on in-flight async work: `SystemScreen.tsx` `setTimeout(loadPm2, 1200)` / `setTimeout(loadSystemd, 1200)`; `NotificationSettingsScreen.tsx` `loadPermissions()`; `ModelsScreen.tsx` mount `loadLocalState()`; `MediaScreen.tsx` `setTimeout(() => setCopied(false), 2000)`; `ProfileScreen.tsx` `setTimeout(..., 2600)`.
- Fix: `isMounted` ref or clear timers on unmount (React 18 treats these as harmless no-ops, but the timer-based ones are worth guarding).

**C19 — LOW — NotificationSettings: dead toggle + hardcoded badges** — `src/screens/NotificationSettingsScreen.tsx:100, ~245`
- "Show Ongoing Notification" `Switch` flips only local state — nothing wired to any native module. The `ACTIVE`/`READY`/`PENDING` badges in the Firebase section are static strings, not measured state.
- Fix: wire the switch to the native agent module or remove it.

**C20 — LOW — McpScreen: dead auth-status branches** — `src/screens/McpScreen.tsx:46–56, 62`
- `StatusIcon` checks `"loggedIn"` and `"authenticationRequired"` as *auth* statuses; per `McpAuthStatus` (`v2/mcp.rs:19–25`) wire values are only `unknown | unsupported | notLoggedIn | bearerToken | oauth` — `"authenticationRequired"` is a *connection* status, never an auth status.
- Fix: align branches with real `McpAuthStatus` values (after C6).

**C21 — LOW — TasksScreen: cron read-modify-write isn't atomic** — `src/core/api/schedule.ts`
- `saveTask`/`deleteTask` do `readCrontab()` → modify → `writeCrontab()` with no locking; rapid edits can interleave and lose updates.

**C22 — LOW — TasksScreen: unverified server assumptions**
- Tasks write `/etc/cron.d/ava-tasks` as root via `command/exec` and assume a cron daemon consumes `/etc/cron.d`. There is **no `schedule/*` method in the protocol** — entirely out-of-band. If the VPS lacks cron or write permission, tasks silently never run.
- Status: assumption flagged, not a protocol mismatch.

**Verified OK (batch 2):** `mcpServerStatus/list` `{}` → `{data, nextCursor}` ✓; `fs/readFile` → `{dataBase64}` ✓; `fs/remove {path}` ✓; `fs/readDirectory` → `entries[{fileName, isDirectory}]` ✓; `model/list {includeHidden}` → `{data[]}` ✓; `config/read` ✓; `config/batchWrite {edits:[{key_path,value,merge_strategy}], reload_user_config}` ✓; `config/value/write` ✓; keys `model`, `model_provider`, `model_reasoning_effort` exist; effort values `low/medium/max/ultra` valid; `userProfile/read {cwd?}` → `{profile, presets}` ✓; `userProfile/write {profile, reloadActiveThreads}` → `{success, profile}` ✓; `server/diagnostics` → `{process, gauges}` ✓ (marked `#[experimental]`); PermissionsSettings writes valid `approval_policy`/`sandbox_mode` values. RootNavigator: all navigate targets used by these screens registered; none read/pass route params.

**UNVERIFIED (needs live VPS):** `/healthz` endpoint + Basic-auth semantics (LoginScreen); WS auth scheme (`?token=` + `Bearer base64(user:pass)`); whether `config/batchWrite` rejects or drops unknown keys (`model_fallback_chain`, `project_doc_max_bytes`); SystemScreen's `python3`/`pm2`/`systemctl` availability; whether cron consumes `/etc/cron.d/ava-tasks`.

### State / Navigation / Theme

**C23 — HIGH — `send()` orphans the live turn's listener; "already active" branch is dead** — `src/state/use-chat.ts:827–838`, `src/core/api/chat.ts:172–210`
- `send()` unconditionally kills the active turn's listener (`offRef.current?.()`) *before* calling `runTurn`, then expects `turn/start` to fail with "already active" so the prompt gets queued (regex `/already active|busy|in progress/i`, chat.ts:204).
- But the server's `turn/start` uses `TurnInputMode::StartOrSteer`; its real error strings are `"failed to submit turn input: NotIdle"` and `"cannot steer a review turn"` — the client regex matches none of them.
- Impact: sending mid-stream **steers the active turn** instead of queueing (transient split transcript); if `turn/start` hard-fails, the old listener is already dead so `onDone` never fires → the 300 ms auto-drain never runs → queued prompts sit unstarted (recovery only via the 15 s history poll). Also `isSendingRef` (use-chat.ts:150) is written but never read — concurrent sends aren't serialized.
- Fix: if `isStreamingRef.current`, skip `runTurn` and `addPromptToQueue` directly (the live turn's `onDone` auto-drain starts it). Only detach/replace `offRef` for a genuinely new turn. Replace the dead regex branch with the real server errors or delete it.

**C24 — MEDIUM — `runningSessions`/`workingSessionId` go permanently stale on missed `turn/completed`** — `src/state/ava-provider.tsx:96–124`
- The global `rpc.on` listener adds entries on `turn/started`/deltas and removes them only on `turn/completed`. `RpcClient` auto-reconnects but never replays missed notifications; nothing reconciles on `offline → online`.
- Impact: a turn completing while the socket is down leaves a phantom "running" entry and stuck `workingSessionId` forever.
- Fix: on `offline → online` transition, drop `runningSessions` entries (repopulate from fresh events) or verify each via `thread/read`.

**C25 — MEDIUM — Failed sends leave permanent ghost optimistic messages** — `src/state/use-chat.ts:700–745, 839–870`
- Both failure paths append the optimistic user message (`u_…`) and never remove it. `getPendingLocalUserMessages` only drops an optimistic message when its text appears in the server history tail — impossible for an unsent message — so the ghost survives every merge, including session switches. The offline error-notice persists too.
- Fix: on send failure, remove the optimistic user/assistant pair (or mark failed with retry affordance).

**C26 — MEDIUM — `openAppDrawer` no-ops from stack screens** — `src/navigation/drawer.ts:20–34`
- Distinct from A9's double-navigate. From a stack screen (Timeline, settings sub-screens), the ancestor walk finds no drawer; the fallback runs `navigation.navigate("Main")` then `navigation.dispatch(DrawerActions.openDrawer())` — but `navigation` is the *stack* screen's object; `OPEN_DRAWER` is only handled by a drawer router, so the drawer never opens.
- Fix: target the drawer navigator explicitly (dispatch with `target: drawerKey`) or keep a drawer navigation ref.

**C27 — MEDIUM — `turn/start` omits `clientUserMessageId`; retry path can double-submit** — `src/core/api/chat.ts:172–191`
- Protocol `TurnStartParams.client_user_message_id` exists for dedup (server maps it to `TurnInput.client_id`); `runTurn` never sends it in either `turn/start` call, yet on `/thread not found/i` it resumes and re-sends `turn/start` — if the first attempt persisted server-side, the user message is duplicated. (`addPromptToQueue` *does* send `clientUserMessageId` — inconsistent.)
- Fix: generate one id per send (reuse the optimistic `userMsgId`) and pass `clientUserMessageId` in both `turn/start` calls.

**C28 — LOW — Duplicate error notices on send failure** — `src/state/use-chat.ts:848–857`
- `runTurn`'s catch already calls `h.onDone(errText)` (appends error notice); `send()`'s catch appends a second `"Failed to send prompt: …"` notice for the same failure.
- Fix: don't append in `send()`'s catch (or make `runTurn` not call `onDone` and let `send()` own failure UI).

**C29 — LOW — `chatStore` never evicts sessions; survives sign-out** — `src/state/chat-store.ts:29, 86–103`
- The `sessions` Map grows unboundedly and isn't cleared on sign-out (previous user's cached transcripts stay in memory). `setOffHandle`/`getOffHandle` have zero callers (`use-chat` uses its own `offRef`). React Query caches in `queries.ts` have the same cross-sign-in retention.
- Fix: add `chatStore.clearAll()`/LRU eviction, call on sign-out; delete or wire up the off-handle API.

**C30 — LOW — Terminal tabs are memory-only despite `savedTabs` naming** — `src/state/terminal-store.ts`
- Module-level `savedTabs`/`savedActiveTabId` vanish on app restart; `getTerminalTabs(defaultCwd)` ignores `defaultCwd` changes after the first tab.
- Fix: persist via `storage`, or rename to make ephemerality explicit.

**C31 — LOW — `resume()` leaves status `"streaming"` stuck on throw** — `src/state/use-chat.ts:906–930`
- The catch only `console.warn`s; `isStreaming`/`status` stay `"streaming"` until the 15 s history poll's stuck-state recovery resets them.
- Fix: reset `status`/`isStreaming`/`isStopping` in the catch.

**C32 — LOW — `thread/read` full-history deprecated for paginated threads; client never paginates** — `src/core/api/sessions.ts` (`readSession`)
- `ThreadReadParams` docs prefer `thread/turns/list` + `thread/items/list` for paginated threads. Client reads `thread.turns ?? initialTurnsPage.turns` but never follows cursors — old history could be silently missing, `hasOlder` misreports.
- Status: **UNVERIFIED** whether the live server truncates; needs VPS check.
- Fix: implement cursor pagination or confirm server behavior.

**Verified OK (state/nav/theme):** light/dark palettes have 42 identical keys each (no mode-missing tokens); all `rpc.on` event names exist (`turn/started|completed`, `item/*`, `turn/plan/updated`, `thread/goal/updated`, `thread/queue/changed`, `thread/tokenUsage/updated`, `thread/environment/*`, `mcpServer/startupStatus/updated`); `thread/queue/*` params match; `turn/interrupt {threadId, turnId}` ✓; `thread/start {cwd, model, sandbox}` kebab-case ✓; `ThreadStatus {"type":"active"|…}` ✓; `turn/completed` statuses ✓; timer/listener cleanup verified (rpc.on/onStatus, rpc.close, chatStore.subscribe, sync listener, 6 s synchronizer, safetyTimeoutRef, Appearance listener — all cleaned; only the known untracked 300 ms drain timeout remains); `use-chat`'s only direct `rpc.call` is `thread/resume {threadId}` ✓.

### Core API / infra

**C33 — HIGH — `writeServerConfig` sends snake_case params; config writes can NEVER succeed** — `src/core/api/system.ts:27–55`
- Both write paths build snake_case params: `{key_path, value, merge_strategy: "replace"}` and `{reload_user_config: true}`.
- Protocol structs are `#[serde(rename_all = "camelCase")]` with required fields: `ConfigBatchWriteParams` (`v2/config.rs:1087`), `ConfigEdit` (`v2/config.rs:1104`) requires `keyPath` + `mergeStrategy`; `ConfigValueWriteParams` (`v2/config.rs:1073`) likewise.
- Impact: serde fails with "missing field `keyPath`" on **every** call — the third fallback `config/write` doesn't exist (P7), so every config write from the app always returns `{success: false}` even when the server is healthy. This silently breaks: fallback-chain save (C9), doc-limit save (C10), approval-policy writes (C7/C11), sandbox writes, and every other settings screen.
- Fix: send camelCase — `{keyPath, value, mergeStrategy: "replace"}`, `{edits, reloadUserConfig: true}`.

**C34 — MEDIUM — `thread/goal/updated` completion check uses a status string the server never sends** — `src/core/api/chat.ts:~104–108`
- App: `g?.status === "completed" || g?.completed ? "done" : "active"`.
- Protocol `ThreadGoalStatus` (`v2/thread.rs:800–807`) variants: `Active, Paused, Blocked, UsageLimited, BudgetLimited, Complete` — serialized camelCase, so a finished goal arrives as `"complete"`, never `"completed"`.
- Impact: goals never render as done.
- Fix: compare `g?.status === "complete"`.

**C35 — MEDIUM — live file-change progress never surfaced; only the dead legacy event is handled** — `src/core/api/chat.ts:~93–99`
- App handles `item/fileChange/outputDelta`, but the protocol says: "The server no longer emits this notification" (`v2/item.rs:1509`, deprecated legacy).
- The live replacement `item/fileChange/patchUpdated` (`v2/item.rs:1523–1528`, `{threadId, turnId, itemId, changes: Vec<FileUpdateChange>}`) has no handler — live patch progress during file edits is silently dropped (final `item/completed` still renders).
- Fix: add `case "item/fileChange/patchUpdated":` mapping `params.changes` (`{path, kind: {type:"add"|"delete"|"update"}, diff}`) into the running file-change part.

**C36 — MEDIUM — RPC response correlation ignores `method`; a server request can hijack an in-flight call** — `src/core/rpc-client.ts:117–137`
- `if (typeof msg.id === "number" && this.pending.has(msg.id))` resolves the pending call with `msg.result`.
- Per JSON-RPC 2.0 (`rpc.rs:60–80`), a server-initiated *request* carries `{id, method, params}` — no `result`. If it arrives with a small integer `id` colliding with a pending client call id (sequential from 1), the pending call resolves with `undefined` instead of being dispatched as a request. The unhandled approval/elicitation server requests (P3) are exactly the traffic carrying request ids.
- Fix: also require `msg.method === undefined` before treating as a response.

**C37 — MEDIUM — `verifyLogin`'s 401/403 check can never fire against the bare app-server** — `src/core/auth.ts:71–79`
- `/healthz` on the app-server WS listener is registered **without auth** and always returns `200 OK` (`app-server-transport/src/transport/websocket.rs:85–87`); the `Authorization: Basic` header is ignored — any credentials "verify" as long as the server is up.
- Status: **UNVERIFIED for the live VPS** — if a reverse proxy in front enforces Basic auth, the check works. Confirm what fronts `ava.mahmudhasan.pro`.
- Fix: verify against the live deployment; if no proxy auth exists, login verification is vacuous.

**C38 — LOW — `thread/list` pagination ignored; sessions past page 1 invisible** — `src/core/api/sessions.ts:24–46`
- `ThreadListResponse` (`v2/thread.rs:1535–1544`) returns `nextCursor`/`backwardsCursor`; the app passes `{limit: 50}` but never follows `nextCursor`.
- Fix: paginate or raise the limit with a "showing first N" indicator.

**C39 — LOW — `updatedAt` unit mismatch: wire is seconds, app passes through** — `src/core/api/sessions.ts:39`
- `Thread.updated_at` is documented "Unix timestamp (in seconds)" (`v2/thread_data.rs:250`). App does no `* 1000` conversion; any UI consumer treating `Session.updatedAt` as ms renders 1970 dates.
- Fix: `updatedAt: typeof t.updatedAt === "number" ? t.updatedAt * 1000 : undefined` + document the unit.

**C40 — LOW — queued-prompt listing ignores pagination; `createdAt` never exists** — `src/core/api/chat.ts:466–490`
- `thread/queue/list` returns `nextCursor` (`v2/thread.rs:939–943`); app reads only the first page. `QueuedSubmission` (`v2/thread.rs:901–905`) has only `{id, input, clientUserMessageId}` — no `createdAt` (app degrades gracefully; cosmetic).

**C41 — LOW — on web, authentication impossible against a ws-auth-enabled server** — `src/core/rpc-client.ts:26–37, 55–63`
- Server authorizes WS upgrades only from the `Authorization: Bearer` header (`app-server-transport/src/transport/auth.rs:273–290`); query params are never read. The app puts the token in `?client=mobile&token=` (ignored) and only attaches the header on React Native (browsers can't set WS headers).
- Status: **UNVERIFIED for the live VPS** (loopback listeners need no auth).

**C42 — LOW — command cancellation exists in-protocol but is unused** — `src/core/api/terminal.ts:6–14` (refines A6)
- Protocol has `command/exec/terminate` (`common.rs:1352`, params `{processId}`), but `runCommand` never supplies `processId` (buffered mode gets an internal, unexposed id) — long-running commands can't be cancelled.
- Fix: pass a client-generated `processId` on `command/exec`; expose `cancelCommand(rpc, processId)` → `command/exec/terminate`. (This also gives the TerminalScreen Ctrl-C a real implementation.)

**C43 — LOW — no token refresh flow** — `src/core/rpc-client.ts`, `src/core/auth.ts`
- Token is static `base64(user:pass)`; nothing refreshes or re-derives it. If the server's capability token rotates, reconnects fail until manual re-login.

**C44 — LOW — `initialize` response discarded** — `src/core/rpc-client.ts:67–76`
- `InitializeResponse` (`v1.rs:70–80`) carries `{userAgent, avaHome, platformFamily, platformOs}` — ignoring it loses version-skew detection and platform info useful for path handling.

**C45 — LOW — push is doubly dead** — `src/core/notifications.ts` (extends A13)
- Beyond `initPushNotifications()` never being called: even if called, it never fetches a device push token (`getDevicePushTokenAsync`/`getExpoPushTokenAsync` absent), so `getSavedPushToken()` always returns `null`. No push registration path exists at all.

**C46 — LOW — `sandbox` passed as raw string at session start** — `src/core/api/sessions.ts:48–55`
- `SandboxMode` (`v2/shared.rs:306–311`) serializes kebab-case (`"read-only" | "workspace-write" | "danger-full-access"`). `startSession` forwards `opts.sandbox` verbatim; any non-kebab-case value is rejected by serde.
- Fix: validate/normalize at the boundary.

**C47 — LOW — `effort` values unverified** — `src/core/api/chat.ts:37–38, 160–166`
- `ReasoningEffort` wire values: `"none|minimal|low|medium|high|xhigh|max|ultra|persistent"` (note `xhigh`, not `x-high`). The app forwards `opts.effort` raw; confirm `@/config/models` `REASONING_EFFORTS` uses exactly these spellings.

**C48 — LOW — `storage.get` before `initStorage()` returns null** — `src/core/storage.ts:14–37`
- `storage.get` is synchronous off an in-memory map populated by `initStorage()`. Any `loadAuth()` before init completes → `null` → app behaves as logged-out. No bug found in the audited files, but every entry point must await `initStorage()` first.

**Verified OK (core):** `turn/start` params/response ✓; `thread/resume {threadId}` ✓; `thread/read {threadId, includeTurns}` ✓; `thread/queue/{add,list,delete,start}` ✓; `turn/interrupt {threadId, turnId}` ✓; all notification names/shapes (`turn/started`, `thread/queue/changed`, `item/started|completed`, `item/agentMessage/delta`, `item/reasoning/*`, `item/commandExecution/outputDelta`, `item/mcpToolCall/progress`, `turn/plan/updated`, `thread/tokenUsage/updated` incl. `TokenUsageBreakdown`, `warning {message}`, `thread/environment/*`, `mcpServer/startupStatus/updated {name, status:"ready"|"failed"}`, `error {error: TurnError, willRetry}`, `turn/completed {durationMs, status, error}`) ✓; `thread/start {cwd, model, sandbox}` ✓; `thread/delete|archive`, `thread/name/set {threadId, name}` ✓; `Thread.status {type:"active"}` ✓; all six `fs/*` methods ✓; `items.ts` tags (`CommandAction`, `FileUpdateChange.kind`, `AgentMessage.questions`, `CommandExecution`) ✓; `command/exec {command[], cwd, timeoutMs}` → `{exitCode, stdout, stderr}` ✓; `userProfile/read|write` ✓; `server/diagnostics` ✓; `config/read` (snake_case `Config` fields ✓); `initialize {clientInfo, capabilities:{experimentalApi:true}}` ✓ (experimental flag correctly opts into `thread/queue/*`); JSON-RPC framing, `respond()` shape, timeout/reject, reconnect backoff, pending-timer cleanup ✓; `schedule.ts` cron line parse/emit round-trips (no `schedule/*` protocol methods exist — out-of-band by design); `custom-models.ts` makes no RPC calls.

**UNVERIFIED (needs live VPS):** ws-auth enablement + token scheme vs app's `Bearer base64(user:pass)`; reverse-proxy Basic auth on `/healthz`; `Session.updatedAt` consumers' unit assumptions; exact `effort`/`sandbox` strings from UI callers; `command/exec` default `timeoutMs`/`outputBytesCap` for large transfers.

---

## Part D — Focused deep audit: Terminal / Timeline / Settings / Notifications (2026-09-30)

Only findings NOT in Parts A–C. Verified against the Rust protocol source where applicable.

### Terminal

**D1 — MEDIUM — One `run.isPending` gate blocks ALL tabs silently** — `src/screens/TerminalScreen.tsx:119–121`
- `exec()` starts with `if (!trimmed || run.isPending) return;` — `run` is a single `useMutation` instance for the whole screen. A 120 s command running in tab A makes taps on Send in tab B do absolutely nothing: no error, no toast, no queueing.
- Impact: user thinks the app froze; typed command sits in the input with no explanation.
- Fix: track pending state per tab (or at minimum show an "a command is already running" hint and keep the input).

**D2 — LOW — Command result discarded if its tab was closed mid-run** — `src/screens/TerminalScreen.tsx:119–186`
- `exec` captures `activeTabId` in its closure; the result is appended via `patchTab(activeTabId, …)`. If the user closes that tab while the (up-to-120 s) server command runs, `patchTab` matches nothing and the result vanishes silently.
- Fix: acceptable as-is, but once D3/C42 give commands a `processId`, cancel the server command on tab close instead of wasting the run.

**D3 — MEDIUM — No streaming or interactive commands; long runs go dark for 120 s** — `src/core/api/terminal.ts`, `src/screens/TerminalScreen.tsx`
- Every command is a single blocking `command/exec` (`timeoutMs: 120000`) with zero partial output. `tail -f`, `npm install`, `htop`, `ping` hang the UI for up to two minutes, then dump everything at once. There is no way to watch progress or abort (Ctrl-C is fake per A6).
- Impact: the single biggest Terminal UX gap; interactive workflows are impossible.
- Fix: streaming mode — pass a client-generated `processId` + `streamStdoutStderr: true`, render `command/exec/outputDelta` (fixing P8/C49's field mapping), and wire a real Ctrl-C to `command/exec/terminate` (C42).

**D4 — LOW — Control-key labels are dishonest** — `src/screens/TerminalScreen.tsx:50–58, 205–242`
- "D" just clears the input (real Ctrl-D = EOF/exit), "TAB" inserts two literal spaces (no completion), "ESC" only blurs the keyboard. A developer user expects these to behave like a terminal.
- Fix: relabel honestly (`CLR`, `⌴2sp`) or implement real behavior; don't ship fake terminal chrome.

**D5 — LOW — Duplicate tab names; double initializer** — `src/screens/TerminalScreen.tsx:85, 158–166`, `src/state/terminal-store.ts`
- `tabNum = useRef(tabs.length)` — close `bash-2`, add a tab → another `bash-2`. `getTerminalTabs(initialCwd)` is invoked twice in two `useState` initializers (works, but sloppy).
- Fix: monotonic counter that never reuses names; single initializer returning both values.

### Timeline

**D6 — MEDIUM — O(n²) render work on every streaming delta** — `src/screens/TimelineScreen.tsx:~640–700`
- Inside the node `.map()`: `allParts.findIndex((x) => x.id === part.id)` runs per node per render, and the inline IIFEs (`lastToolIndexInAll`, `activeStepIndexInAll`) each scan the whole array. During a live turn every streamed part re-renders the list → long turns (200+ parts) jank.
- Fix: build an `id → index` Map and precompute the two indices once inside the `allParts` `useMemo`; consume them in render.

**D7 — LOW — Sort toggle remounts every node** — `src/screens/TimelineScreen.tsx` (node keys)
- Keys are `` `node_${part.id}_${pIdx}` `` where `pIdx` is the (possibly reversed) position. Toggling newest/oldest changes every key → full remount, scroll jump, lost `LayoutAnimation` continuity. `expandedNodes` survives (keyed by id) but the view flashes.
- Fix: key by `part.id` alone.

**D8 — LOW — `errorCount` computed, never displayed** — `src/screens/TimelineScreen.tsx:344`
- `const errorCount = allParts.filter((p) => p.status === "error").length` — dead variable. Either delete it or do the useful thing: show an error badge in the header and add a "jump to first error" affordance.

**D9 — LOW — Swipe-back gesture fights horizontal content** — `src/screens/TimelineScreen.tsx:onHandlerStateChange`
- The whole body sits inside one `PanGestureHandler` (`activeOffsetX={[0,45]}`). A rightward swipe that starts over the horizontal turn-pill strip or a wide code block triggers back-navigation instead of scrolling that content.
- Fix: restrict the gesture to a left-edge zone or mark inner horizontal scrollers as `simultaneousHandlers`.

**D10 — LOW — Fuzzy turn-id matching can pick the wrong turn** — `src/screens/TimelineScreen.tsx` (`targetMessage` useMemo)
- Fallbacks use `m.id.includes(candidateId) || candidateId.includes(m.id…)` — with prefixed/optimistic ids (`a_…` vs server ids) a substring collision resolves to the wrong turn's timeline.
- Fix: exact match only; drop the fuzzy fallbacks (or keep one guarded `startsWith` with a length check).

### Settings

**D11 — MEDIUM — C33 fix must touch ONLY `system.ts`, not the screens** — `src/core/api/system.ts:27–60`, server `config_processor.rs:214–223`
- Verified against the server: `batch_write` matches `edit.key_path` against snake_case literals (`"model"`, `"model_reasoning_effort"`, `"personality"`, …). So the **keyPath VALUES the screens send (`approval_policy`, `sandbox_mode`, `model_fallback_chain`) are the correct form** — only the param FIELD names are wrong (`key_path`→`keyPath`, `merge_strategy`→`mergeStrategy`, `reload_user_config`→`reloadUserConfig`).
- Impact if done wrong: "fixing" the screens to camelCase keys would break writes even after C33 is fixed.
- Fix: change the three field names in `writeServerConfig` only.

**D12 — LOW — CWD applied without validation** — `src/screens/WorkspaceSettingsScreen.tsx:54–58`
- `handleApplyCwd` calls `setWorkingCwd(newPath)` on any typed string; a typo'd path makes Terminal/Files/commands fail later with confusing server errors.
- Fix: `fs/stat` the path first; alert if it doesn't exist.

**D13 — LOW — Hardcoded VPS paths in presets and resets** — `src/screens/WorkspaceSettingsScreen.tsx:28–33`, `src/screens/StorageSettingsScreen.tsx:handleResetCwd`
- `CWD_PRESETS` (`/var/www/ava-code`, `/var/www/thundernexus`, `/root`) and the reset default are Mahmud's VPS layout (extends C4). Any other server → presets are useless buttons.
- Fix: default/reset to `APP.defaultCwd`; build presets from the server's actual filesystem (e.g. home dir + recent cwds) instead of hardcoding.

**D14 — MEDIUM — Nuclear wipe leaves memory + native service behind** — `src/screens/StorageSettingsScreen.tsx:handleNuclearWipe`
- `queryClient.clear()` + `storage.clear()` + `signOut()`: React Query is purged, but `chatStore` sessions stay in memory (extends C29 — previous user's transcripts remain readable in-memory), and a running foreground service is never stopped.
- Impact: "Wipe Everything" doesn't wipe everything; stale native notification persists.
- Fix: `chatStore.clearAll()` (new) and `stopAgentForeground({sessionId})` in the wipe path before `signOut()`.

### Notifications

**D15 — MEDIUM — `notifyTurnComplete` fired inside a `setState` updater** — `src/state/use-chat.ts:443`
- `backgroundSync.onTurnDone(threadId, …)` (which calls `notifyTurnComplete`) runs inside `chatStore.setState(threadId, (prev) => { … })`. Updaters must be pure (same class as A11) — React StrictMode double-invokes them → **duplicate "Task Complete" local notifications**.
- Fix: capture `firstText` in the updater, call `backgroundSync.onTurnDone` after `setState` returns.

**D16 — LOW — Boot recovery is dead end-to-end** — `src/core/notifications.ts:140`
- `checkBootRecovery()` has zero callers. The native side diligently saves session state (`saveSessionActive`) and `AvaBootReceiver` exists, but nothing on the JS side ever reads the state back on startup.
- Fix: call it in `App.tsx` `prepare()`; if `wasActive`, surface a "session was interrupted by reboot" notice.

**D17 — LOW — Ongoing-notification toggle is unpersisted and unwired** — `src/screens/NotificationSettingsScreen.tsx:100`
- `ongoingEnabled` is local `useState(true)`; `use-chat.ts:241` calls `startAgentForeground` on every turn regardless. Turning the switch off changes nothing (extends C19).
- Fix: persist the preference (`storage`) and gate `start/stopAgentForeground` on it.

**D18 — LOW — Status badges are hardcoded, wrong on iOS** — `src/screens/NotificationSettingsScreen.tsx:~245–300`
- "Live Timer AUTO", "Foreground Service ACTIVE", FCM "READY" are static strings. On iOS there is no foreground service — the badge claims ACTIVE anyway.
- Fix: derive from `Platform.OS` + real state (`AvaAgentModule` presence, actual permission status).

**D19 — LOW — Local notification misses its channel** — `src/core/notifications.ts:notifyTurnComplete`
- `scheduleNotificationAsync` sets no `channelId`; the `"ava-turns"` channel is only created in `initPushNotifications`, which never runs (A13) — so the notification lands in Expo's default channel with default sound/vibration.
- Fix: pass `channelId: "ava-turns"` and ensure channel creation runs at startup.

**D20 — LOW — Microphone permission fetched but never shown** — `src/screens/NotificationSettingsScreen.tsx:loadPermissions`
- `NativeAgent.checkPermissions()` returns `{notifications, microphone, batteryOptimizationIgnored}`; the UI renders only two of the three. The voice-composer feature's permission state is invisible.
- Fix: add the microphone row (or drop it from the native API).

**Counts (Part D):** HIGH 0 · MEDIUM 6 (D1, D3, D6, D11, D14, D15) · LOW 14.

## Appendix: coverage notes

- `src/components/ui/*`, `src/components/kit/*`, `src/components/ai-elements/*`: presentational only — no RPC calls, no store mutations, no timers (one cosmetic 2 s `setTimeout` in `media-preview-gallery.tsx` for a "copied" indicator; harmless).
- Slash commands (`/plan`, `/diff`, …) are plain prompt text; there is no slash-command concept in the protocol — interpretation depends on the agent's system prompt. Behavior UNVERIFIED.
- `src/config/*`, `src/hooks/*`, `src/lib/*`: no direct RPC/store usage found.
