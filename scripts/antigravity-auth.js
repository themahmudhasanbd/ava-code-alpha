#!/usr/bin/env node
/**
 * AvA Code Alpha - Google Antigravity Provider CLI & Auth Bridge
 *
 * Usage:
 *   node scripts/antigravity-auth.js status
 *   node scripts/antigravity-auth.js login
 *   node scripts/antigravity-auth.js models
 *   node scripts/antigravity-auth.js setup-config
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import url from "node:url";

const CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
];

const CALLBACK_PORT = 51121;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;
const RUNTIME_BASE = "https://daily-cloudcode-pa.googleapis.com";
const BOOTSTRAP_BASES = [
  "https://daily-cloudcode-pa.googleapis.com",
  "https://cloudcode-pa.googleapis.com",
  "https://daily-cloudcode-pa.sandbox.googleapis.com",
];

const AUTH_PATHS = [
  path.join(process.env.HOME || "/root", ".config/ava/auth.json"),
  path.join(process.env.HOME || "/root", ".local/share/ava/auth.json"),
];

function readAuth() {
  for (const p of AUTH_PATHS) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (data && data.antigravity) return { path: p, data };
      } catch (_) {}
    }
  }
  return { path: AUTH_PATHS[0], data: {} };
}

function saveAuth(antigravityData) {
  for (const p of AUTH_PATHS) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let current = {};
      if (fs.existsSync(p)) {
        try { current = JSON.parse(fs.readFileSync(p, "utf-8")); } catch (_) {}
      }
      current.antigravity = antigravityData;
      fs.writeFileSync(p, JSON.stringify(current, null, 2), "utf-8");
      console.log(`[Antigravity] Saved credentials to ${p}`);
    } catch (err) {
      console.error(`[Antigravity] Failed to save to ${p}:`, err.message);
    }
  }
}

async function postForm(endpoint, body) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(body).toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function exchangeCode(code) {
  return postForm(TOKEN_URL, {
    grant_type: "authorization_code",
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
  });
}

async function refreshAccessToken(refresh) {
  return postForm(TOKEN_URL, {
    grant_type: "refresh_token",
    refresh_token: refresh,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
}

async function loadCodeAssist(access) {
  for (const base of BOOTSTRAP_BASES) {
    try {
      const res = await fetch(`${base}/v1internal:loadCodeAssist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "antigravity/ide/2.5.5 darwin/arm64",
          "X-Goog-Api-Client": "gl-node/22.21.1",
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ metadata: { ideType: "ANTIGRAVITY", pluginType: "GEMINI" } }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const project = json?.cloudaicompanionProject;
      if (typeof project === "string" && project) return project;
      if (project?.id) return String(project.id);
    } catch (_) {}
  }
  return "aicode-consumers";
}

async function fetchModels(access, project = "aicode-consumers") {
  for (const base of BOOTSTRAP_BASES) {
    try {
      const res = await fetch(`${base}/v1internal:fetchAvailableModels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "antigravity/ide/2.5.5 darwin/arm64",
          "X-Goog-Api-Client": "gl-node/22.21.1",
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ project }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      return json?.models || json?.availableModels || json;
    } catch (_) {}
  }
  return null;
}

const command = process.argv[2] || "status";

async function main() {
  if (command === "status") {
    const { data } = readAuth();
    const ag = data.antigravity;
    if (!ag || (!ag.access && !ag.key)) {
      console.log("❌ Google Antigravity Provider: Not Connected");
      console.log("Run 'node scripts/antigravity-auth.js login' to connect your Google account.");
      process.exit(1);
    }

    const isExpired = ag.expires && Date.now() > ag.expires;
    console.log("✅ Google Antigravity Provider: Connected");
    console.log(`   Account ID / Project: ${ag.accountId || "aicode-consumers"}`);
    console.log(`   Type: ${ag.type || "oauth"}`);
    console.log(`   Token Status: ${isExpired ? "Expired (will auto-refresh on request)" : "Valid"}`);
    console.log(`   Has Refresh Token: ${Boolean(ag.refresh)}`);
    console.log(`   Endpoint: ${RUNTIME_BASE}`);
  } else if (command === "login") {
    const state = Math.random().toString(36).substring(2);
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });
    const authUrl = `${AUTHORIZE_URL}?${params.toString()}`;

    console.log("\n=======================================================");
    console.log(" Google Antigravity OAuth Login for AvA Code Alpha");
    console.log("=======================================================\n");
    console.log("Please open this URL in your browser to sign in:\n");
    console.log(authUrl);
    console.log("\nWaiting for redirect on http://localhost:51121/callback ...\n");

    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      if (parsedUrl.pathname === "/callback") {
        const code = parsedUrl.query.code;
        if (code) {
          try {
            const tokens = await exchangeCode(code);
            const project = await loadCodeAssist(tokens.access_token);
            saveAuth({
              type: "oauth",
              access: tokens.access_token,
              refresh: tokens.refresh_token,
              expires: Date.now() + (tokens.expires_in || 3600) * 1000,
              accountId: project || "aicode-consumers",
            });

            res.writeHead(200, { "Content-Type": "text/html" });
            res.end("<h2>AvA Code Alpha</h2><p>Google Antigravity login successful! You can close this window.</p>");
            console.log("🎉 Login Successful! Connected to project:", project);
            server.close();
            process.exit(0);
          } catch (err) {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end(`<h2>Login Failed</h2><p>${err.message}</p>`);
            console.error("Login failed:", err.message);
          }
        }
      }
    });

    server.listen(CALLBACK_PORT);
  } else if (command === "models") {
    const { data } = readAuth();
    const ag = data.antigravity;
    if (!ag || !ag.access) {
      console.error("No active Antigravity credentials found.");
      process.exit(1);
    }
    let access = ag.access;
    if (ag.refresh && ag.expires && Date.now() > ag.expires - 60000) {
      const fresh = await refreshAccessToken(ag.refresh).catch(() => null);
      if (fresh?.access_token) {
        access = fresh.access_token;
        ag.access = fresh.access_token;
        ag.expires = Date.now() + (fresh.expires_in || 3600) * 1000;
        saveAuth(ag);
      }
    }
    console.log("Fetching live available models from Google Antigravity...");
    const models = await fetchModels(access, ag.accountId);
    console.log(JSON.stringify(models, null, 2));
  } else if (command === "setup-config") {
    const configPath = path.join(process.cwd(), ".ava/config.toml");
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let content = "";
    if (fs.existsSync(configPath)) {
      content = fs.readFileSync(configPath, "utf-8");
    }

    const snippet = `
# ------------------------------------------------------------------------------
# Google Antigravity Provider Settings
# ------------------------------------------------------------------------------
model_provider = "antigravity"
model = "gemini-3.7-flash-tiered"

[model_providers.antigravity]
name = "Google Antigravity"
base_url = "https://daily-cloudcode-pa.googleapis.com"
env_key = "ANTIGRAVITY_API_KEY"
wire_api = "responses"

[model_providers.antigravity.http_headers]
"User-Agent" = "antigravity/ide/2.5.5 darwin/arm64"
"X-Goog-Api-Client" = "gl-node/22.21.1"
`;

    if (!content.includes("[model_providers.antigravity]")) {
      content += snippet;
      fs.writeFileSync(configPath, content, "utf-8");
      console.log(`[Antigravity] Configured Google Antigravity in ${configPath}`);
    } else {
      console.log(`[Antigravity] Google Antigravity is already configured in ${configPath}`);
    }
  } else {
    console.log("Unknown command. Supported: status, login, models, setup-config");
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
