# Phase 6: Operations, Deployment & Security Runbook

## 1. System Topology & Infrastructure

```
+--------------------------------------------------------------------------------+
|                             Cloudflare Edge CDN / SSL                          |
|                       DNS: https://ava.mahmudhasan.pro                        |
+--------------------------------------------------------------------------------+
                                       |
                                       v Reverse Proxy (Port 4005 / Port 80)
+--------------------------------------------------------------------------------+
|                             Host Server (Linux VPS)                            |
|                                                                                |
|  +-------------------------------------+   +--------------------------------+  |
|  | Nginx / Static Web App Server       |   | PM2: ava-server (Node.js)      |  |
|  | Docroot: apps/mobile/build/web      |   | Local Port: 4005               |  |
|  +-------------------------------------+   +--------------------------------+  |
|                                     |                   |                      |
|                                     +--------+----------+                      |
|                                              |                                 |
|                                              v                                 |
|                            +----------------------------------+                |
|                            | ava-rs Rust Core Execution Engine|                |
|                            | Sandboxing: Landlock / Seatbelt  |                |
|                            +----------------------------------+                |
+--------------------------------------------------------------------------------+
```

---

## 2. Process Management with PM2

The Node.js JSON-RPC app server is managed via PM2:

```bash
# Status check
pm2 status ava-server

# View live logs
pm2 logs ava-server --lines 100

# Restart server gracefully
pm2 restart ava-server

# Reload environment
pm2 restart ava-server --update-env
```

---

## 3. Frontend Web Compilation & Sync

The Flutter mobile & web client compiles into production static assets:

```bash
# Navigate to mobile app directory
cd /var/www/ava-code/apps/mobile

# Build web distribution bundle
flutter build web --release --base-href "/"

# Ensure proper web asset permissions
chmod -R 755 /var/www/ava-code/apps/mobile/build/web
```

---

## 4. Environment Configuration (`.env`)

Essential environment variables configured for production:

```env
# Server Port
PORT=4005
NODE_ENV=production

# Google Antigravity OAuth Credentials
GOOGLE_ANTIGRAVITY_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_ANTIGRAVITY_CLIENT_SECRET="your-client-secret"
GOOGLE_ANTIGRAVITY_REFRESH_TOKEN="your-refresh-token"

# Sandbox Mode
AVA_SANDBOX_MODE="workspace_write"
AVA_HOME="/root/.config/ava"
```

---

## 5. Security & Isolation Guidelines

1. **Workspace Path Containment**:
   - The agent should only write to directories explicitly approved or under `/var/www/`.
   - Never execute unescaped user queries in shell environments.

2. **Credential Sanitization**:
   - Never expose `GOOGLE_ANTIGRAVITY_CLIENT_SECRET`, API keys, or raw JWTs to the client UI or public logs.
   - Strip authorization headers before logging JSON-RPC payloads.

3. **Cloudflare Cache Invalidation**:
   - Following web builds or asset updates, purge the Cloudflare zone cache for `ava.mahmudhasan.pro` to ensure edge nodes serve updated JavaScript and WebAssembly bundles.
