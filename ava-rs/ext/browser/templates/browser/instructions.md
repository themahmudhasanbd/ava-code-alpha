# Browser Automation Subsystem Instructions

## Browser Subagent Architecture (Recommended)
For multi-step web interactions, logins, scraping, forms, and audits:
1. **Prefer `browser_subagent`**: Start an autonomous browser subagent that handles navigation, logins, audits, and verifications in an isolated, persistent session.
2. **Encrypted Auth Credential Vault**: Before prompting users for login credentials, the agent automatically checks the local encrypted credential vault (`browser_credential_lookup`). If credentials for the domain exist, the subagent auto-populates credentials and signs in autonomously.
3. **Persistent Domain-Scoped Cookies & Clean Session**: 
   - Browser sessions preserve cookies and storage states per domain in `~/.config/ava/browser_sessions/<domain>.json`.
   - By default (`clean_session: false`), previously logged-in sites remain logged in across turns.
   - To open a fresh incognito session without previous cookies/state, pass `clean_session: true`.
4. **Save Authentication Credentials Widget**:
   - Whenever the user shares credentials or the agent successfully logs into a site with new credentials, the agent MUST present a Save Authentication Credentials Widget in chat for web, desktop, and mobile clients:
   ```save-credential
   {
     "site_url": "https://example.com/login",
     "domain": "example.com",
     "username": "user@example.com",
     "secret": "user_password_or_token",
     "type": "password"
   }
   ```
   - The user can click "Save to Vault" with one click to store it encrypted with AES-256-GCM.
5. **Obstacle Escalation**: The subagent automatically detects anti-bot obstacles (Cloudflare challenges, CAPTCHAs, 2FA/OTP prompts, login errors). When an obstacle is encountered, it returns `status="obstacle_detected"` along with a screenshot, obstacle details, and the live stream WebSocket URL (`ws://127.0.0.1:40061`).
6. **Mid-Session Dynamic Steering**: When the user provides updated instructions, new credentials, or a 2FA verification code, invoke `browser_subagent` with `reused_subagent_id` set to the returned `subagent_id`. The session, page, and cookies are preserved seamlessly.
7. **Live Takeover & Iframe View**: Users can view the live browser stream or take over mouse/keyboard controls at `ws://127.0.0.1:40061` to solve challenges interactively.

## Viewport, Console Logs & DevTools Inspection
1. **Viewport Resizing**: Use `action="viewport"` with profiles (`"desktop"` 1280x800, `"mobile"` 390x844, `"tablet"` 768x1024) to inspect and debug layouts.
2. **Console Logs & Errors**:
   - Use `action="console_logs"` to retrieve the entire stream of runtime console output (`console.log`, `console.info`, `console.warn`).
   - Use `action="console_errors"` to check unhandled JavaScript exceptions and failed network asset loads.
3. **DevTools Metrics**: Use `action="devtools_metrics"` to inspect DOM node count, JavaScript heap memory, layout duration, and performance timings.

## Atomic `browser` Tool Usage: Observe → Reason → Act → Verify
When fine-grained step-by-step browser control is needed:
1. **Observe First**: Call `browser` with `action="open"` or `action="observe"` before clicking or filling. Observation assigns semantic refs (`e1`, `e2`, `e3`...).
2. **Use Semantic Refs**: Pass `ref="e1"`, `ref="e2"` directly to `click` or `fill`.
3. **Verify Outcomes**: Mutating actions automatically verify page indicators (errors, success, spinners).
4. **Responsive Audits**: Use `action="responsive_audit"` to verify mobile/tablet/desktop layouts and detect horizontal overflow.
5. **Live View**: Use `action="live_frame"` to capture lightweight base64 JPEG frames for real-time viewing.

## Approval Policy
- **Never gated**: observe, screenshot, scrape_*, console_errors, console_logs, devtools_metrics, state, wait, viewport, scroll, responsive_audit, live_frame.
- **Per-origin approval**: `open` to a new origin and `login` ask once per site per session.
- **Mutating**: click, fill, fill_form, evaluate_js, clear_session, close ask once per session.
When the tool responds with "Approval required", ask the user in chat (never include passwords in approval prompts), then retry with `approved=true`.
