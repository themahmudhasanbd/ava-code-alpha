#!/usr/bin/env python3
"""
AvA Hot-Reload Service & Real-Time Sync Daemon
Listens on 127.0.0.1:4097 (proxied by Nginx for /reload and /api/reload).
Allows zero-downtime hot reload of AI providers, dynamic default models, and native server auth without restarting the server or dropping client connections.
Includes an automatic file watcher that instantly pushes configuration changes to all connected clients.
"""

import sys
import os
import json
import time
import base64
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from pathlib import Path
from datetime import datetime
import threading

DEFAULT_PORT = 4097
WS_PORT = 4096

AUTH_PATHS = [
    Path("/root/.ava-code/server-auth.json"),
    Path("/var/www/ava-code/.ava-code/server-auth.json"),
]

MODEL_CONFIG_PATHS = [
    Path("/root/.ava-code/auth.json"),
    Path("/var/www/ava-code/.ava-code/auth.json"),
]

CONFIG_TOML_PATHS = [
    Path("/root/.ava-code/config.toml"),
    Path("/var/www/ava-code/.ava-code/config.toml"),
]


def load_server_auth():
    for p in AUTH_PATHS:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return {"auth_enabled": True, "users": []}


def load_model_config():
    provider = "omniroute"
    model = "ultra-working-combo"
    base_url = "http://127.0.0.1:20128/v1"

    for p in MODEL_CONFIG_PATHS:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    d = json.load(f)
                    provider = d.get("provider", provider)
                    model = d.get("model", model)
                    base_url = d.get("base_url", base_url)
                    break
            except Exception:
                pass
    return {"provider": provider, "model": model, "base_url": base_url}


def verify_auth_header(auth_header, query_params):
    auth_data = load_server_auth()
    if not auth_data.get("auth_enabled", True) or not auth_data.get("users"):
        return True, "anonymous"

    # Extract token or credentials
    token = None
    if query_params.get("token"):
        token = query_params["token"][0]
    elif query_params.get("auth"):
        token = query_params["auth"][0]
    elif auth_header:
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        elif auth_header.startswith("Basic "):
            raw_b64 = auth_header[6:].strip()
            try:
                decoded = base64.b64decode(raw_b64).decode("utf-8")
                if ":" in decoded:
                    u, p = decoded.split(":", 1)
                    # Check username and password or token
                    for user in auth_data.get("users", []):
                        if user.get("username") == u:
                            if user.get("token") == p or user.get("password") == p:
                                return True, u
            except Exception:
                pass
            token = raw_b64

    if not token:
        return False, None

    # Check token against users
    for user in auth_data.get("users", []):
        u_tok = user.get("token", "")
        u_name = user.get("username", "")
        # Raw token match
        if token == u_tok:
            return True, u_name
        # Basic auth base64 match
        b64_comb = base64.b64encode(f"{u_name}:{u_tok}".encode("utf-8")).decode("utf-8")
        if token == b64_comb:
            return True, u_name

    return False, None


def broadcast_reload_to_clients():
    """Notify live server clients over WebSocket connection."""
    try:
        import asyncio
        import websockets

        auth_data = load_server_auth()
        users = auth_data.get("users", [])
        token = users[0].get("token") if users else ""
        mcfg = load_model_config()

        async def send_ws():
            uri = f"ws://127.0.0.1:{WS_PORT}/ws?client=mobile&token={token}"
            async with websockets.connect(uri, open_timeout=2.0) as ws:
                init_msg = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {"clientInfo": {"name": "reload-bridge", "version": "1.0"}},
                }
                await ws.send(json.dumps(init_msg))
                await asyncio.wait_for(ws.recv(), timeout=2.0)

                # Send reload notification
                notif = {
                    "jsonrpc": "2.0",
                    "method": "server/reloaded",
                    "params": {
                        "provider": mcfg["provider"],
                        "defaultModel": mcfg["model"],
                        "reloaded_at": int(time.time()),
                    },
                }
                await ws.send(json.dumps(notif))

        asyncio.run(send_ws())
        return 1
    except Exception as e:
        return 0


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class ReloadHTTPHandler(BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS, HEAD")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Authorization, Content-Type, Accept, Origin, User-Agent, x-ava-client, x-avacode-client",
        )

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_HEAD(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def handle_credentials_api(self):
        try:
            import ava_credentials_vault as vault
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path.rstrip("/")
            query = urllib.parse.parse_qs(parsed.query)

            if self.command == "GET":
                if path.endswith("/lookup"):
                    target = query.get("domain", [""])[0] or query.get("url", [""])[0] or query.get("site_url", [""])[0]
                    if not target:
                        self.send_json_response(400, {"success": False, "error": "domain or url query parameter is required"})
                        return
                    cred = vault.lookup_credential(target)
                    if not cred:
                        self.send_json_response(404, {"success": False, "message": f"No credentials found for '{target}'"})
                        return
                    self.send_json_response(200, {"success": True, "credential": cred})
                    return
                else:
                    creds = vault.list_credentials()
                    self.send_json_response(200, {"success": True, "count": len(creds), "credentials": creds})
                    return

            elif self.command == "POST":
                content_len = int(self.headers.get("Content-Length", 0))
                raw_body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
                data = json.loads(raw_body)
                site_url = data.get("site_url", "").strip()
                username = data.get("username", "").strip()
                secret = data.get("password") or data.get("token") or data.get("secret", "").strip()
                auth_type = data.get("auth_type", "password")
                domain = data.get("domain")
                notes = data.get("notes")

                if not site_url or not username:
                    self.send_json_response(400, {"success": False, "error": "site_url and username are required"})
                    return
                if not secret:
                    self.send_json_response(400, {"success": False, "error": "password, token, or secret is required"})
                    return

                saved = vault.save_credential(site_url, username, secret, auth_type, domain, notes)
                self.send_json_response(200, {
                    "success": True,
                    "id": saved["id"],
                    "message": f"Credentials saved securely to AvA vault for {saved['domain']}",
                    "credential": saved
                })
                return

            elif self.command == "DELETE":
                parts = path.split("/")
                cred_id = parts[-1] if len(parts) > 1 and parts[-1] != "credentials" else ""
                if not cred_id:
                    self.send_json_response(400, {"success": False, "error": "credential id is required in path"})
                    return
                deleted = vault.delete_credential(cred_id)
                self.send_json_response(200, {"success": deleted, "message": "Deleted" if deleted else "Not found"})
                return

            else:
                self.send_json_response(405, {"success": False, "error": "Method Not Allowed"})
        except Exception as e:
            self.send_json_response(500, {"success": False, "error": str(e)})

    def send_json_response(self, code: int, data: dict):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(code)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/api/browser/credentials"):
            self.handle_credentials_api()
        else:
            self.handle_reload()

    def do_POST(self):
        if self.path.startswith("/api/browser/credentials"):
            self.handle_credentials_api()
        else:
            self.handle_reload()

    def do_DELETE(self):
        if self.path.startswith("/api/browser/credentials"):
            self.handle_credentials_api()
        else:
            self.send_response(405)
            self.end_headers()

    def handle_reload(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        query = urllib.parse.parse_qs(parsed.query)

        # Health check
        if path in ("", "/healthz", "/readyz"):
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"OK\n")
            return

        # Reload endpoints
        if path not in ("/reload", "/api/reload", "/api/v1/reload"):
            self.send_response(404)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": False, "error": "Not Found"}).encode("utf-8"))
            return

        # Check authentication
        auth_hdr = self.headers.get("Authorization", "")
        # Allow loopback/localhost requests without auth, or verify auth credentials
        is_loopback = self.client_address[0] in ("127.0.0.1", "::1", "localhost")
        is_authed, username = verify_auth_header(auth_hdr, query)

        if not is_authed and not is_loopback:
            self.send_response(401)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = {
                "ok": False,
                "error": "Unauthorized: valid token or credentials required to reload server configuration",
                "status": "unauthorized",
            }
            self.wfile.write(json.dumps(resp, indent=2).encode("utf-8"))
            return

        # Perform Hot Reload
        mcfg = load_model_config()
        auth_data = load_server_auth()
        users_count = len(auth_data.get("users", []))
        notified = broadcast_reload_to_clients()

        now_iso = datetime.utcnow().isoformat() + "Z"
        now_ts = int(time.time())

        result = {
            "ok": True,
            "status": "reloaded",
            "message": "Configuration reloaded successfully without restarting server",
            "reloaded_at": now_iso,
            "timestamp": now_ts,
            "provider": mcfg["provider"],
            "default_model": mcfg["model"],
            "base_url": mcfg["base_url"],
            "active_users": users_count,
            "clients_notified": notified,
        }

        body = json.dumps(result, indent=2).encode("utf-8")
        self.send_response(200)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

        print(
            f"[{now_iso}] Hot-reload applied: Model='{mcfg['model']}', Provider='{mcfg['provider']}', Users={users_count}"
        )


def start_file_watcher():
    """Background file watcher for instant live apply on config modifications."""
    watch_paths = [
        Path("/root/.ava-code/auth.json"),
        Path("/root/.ava-code/config.toml"),
        Path("/root/.ava-code/server-auth.json"),
        Path("/var/www/ava-code/.ava-code/auth.json"),
        Path("/var/www/ava-code/.ava-code/server-auth.json"),
    ]

    last_mtimes = {}
    for p in watch_paths:
        if p.exists():
            last_mtimes[p] = p.stat().st_mtime

    print("✓ Config file watcher active (watching auth.json, config.toml, server-auth.json)")

    while True:
        time.sleep(1.5)
        changed = False
        for p in watch_paths:
            if p.exists():
                mt = p.stat().st_mtime
                prev = last_mtimes.get(p)
                if prev is None or mt != prev:
                    last_mtimes[p] = mt
                    changed = True

        if changed:
            mcfg = load_model_config()
            print(
                f"[AUTO-RELOAD] Config modification detected on disk! Live syncing model '{mcfg['model']}' across clients..."
            )
            broadcast_reload_to_clients()


def main():
    port = int(os.environ.get("AVA_RELOAD_PORT", DEFAULT_PORT))
    server = ThreadingHTTPServer(("127.0.0.1", port), ReloadHTTPHandler)
    print(f"AvA Hot-Reload Service listening on http://127.0.0.1:{port}")
    print("Endpoints: /reload, /api/reload, /readyz")

    # Start background watcher in separate thread
    watcher_thread = threading.Thread(target=start_file_watcher, daemon=True)
    watcher_thread.start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nReload service shutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
