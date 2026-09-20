/**
 * Google Antigravity Provider for AvA Code Alpha
 *
 * Implements real OAuth against Google's public Antigravity desktop client,
 * Cloud Code project resolution (v1internal:loadCodeAssist), model catalog discovery,
 * and request/response envelope wrapping for Google Generative AI / Cloud Code runtime.
 */

export const ANTIGRAVITY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
export const ANTIGRAVITY_CLIENT_SECRET = "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";
export const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const ANTIGRAVITY_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
];

export const CALLBACK_PORT = 51121;
export const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;

export const ANTIGRAVITY_RUNTIME_BASE = "https://daily-cloudcode-pa.googleapis.com";
export const BOOTSTRAP_BASES = [
  "https://daily-cloudcode-pa.googleapis.com",
  "https://cloudcode-pa.googleapis.com",
  "https://daily-cloudcode-pa.sandbox.googleapis.com",
];

export const CLIENT_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "antigravity/ide/2.5.5 darwin/arm64",
  "X-Goog-Api-Client": "gl-node/22.21.1",
};

export interface ModelDef {
  name: string;
  tool_call: boolean;
  reasoning: boolean;
  attachment: boolean;
  limit: { context: number; output: number };
}

const M = (name: string, reasoning = true, context = 1048576, output = 65536): ModelDef => ({
  name,
  tool_call: true,
  reasoning,
  attachment: true,
  limit: { context, output },
});

export const ANTIGRAVITY_MODELS: Record<string, ModelDef> = {
  "gemini-3.7-flash-high": M("Gemini 3.7 Flash (High)", true, 1048576, 65536),
  "gemini-3.7-flash-medium": M("Gemini 3.7 Flash (Medium)", true, 1048576, 65536),
  "gemini-3.7-flash-low": M("Gemini 3.7 Flash (Low)", true, 1048576, 65536),
  "gemini-3.7-flash-tiered": M("Gemini 3.7 Flash (Tiered)", true, 1048576, 65536),
  "gemini-3.8-flash-high": M("Gemini 3.8 Flash (High)", true, 1048576, 65536),
  "gemini-3.8-flash-medium": M("Gemini 3.8 Flash (Medium)", true, 1048576, 65536),
  "gemini-3.8-flash-low": M("Gemini 3.8 Flash (Low)", true, 1048576, 65536),
  "gemini-3.8-flash-tiered": M("Gemini 3.8 Flash (Tiered)", true, 1048576, 65536),
  "claude-opus-4-6-thinking": M("Claude Opus 4.6 (Thinking)", true, 250000, 65536),
  "claude-sonnet-4-6": M("Claude Sonnet 4.6 (Thinking)", true, 250000, 65536),
  "gemini-pro-agent": M("Gemini 3.1 Pro (High)", true, 1048576, 65536),
  "gemini-3.1-pro-low": M("Gemini 3.1 Pro (Low)", true, 1048576, 65536),
  "gemini-3.1-flash-lite": M("Gemini 3.1 Flash Lite", true, 1048576, 65536),
  "gemini-3-flash": M("Gemini 3 Flash", true, 1048576, 65536),
  "gemini-2.5-pro": M("Gemini 2.5 Pro", true, 1048576, 65536),
  "gemini-2.5-flash": M("Gemini 2.5 Flash", true, 1048576, 65536),
  "gpt-oss-120b-medium": M("GPT-OSS 120B (Medium)", true, 131072, 32768),
};

export const ANTIGRAVITY_MODEL_ALIASES: Record<string, string> = {
  "gemini-3.7-flash": "gemini-3.7-flash-tiered",
  "gemini-3.7-flash-high": "gemini-3.7-flash-tiered",
  "gemini-3.7-flash-medium": "gemini-3.7-flash-tiered",
  "gemini-3.7-flash-low": "gemini-3.7-flash-tiered",
  "gemini-3.1-pro-high": "gemini-pro-agent",
  "gpt-oss-120b": "gpt-oss-120b-medium",
  "gemini-claude-sonnet-4-5": "claude-sonnet-4-6",
  "gemini-claude-sonnet-4-5-thinking": "claude-sonnet-4-6",
  "gemini-claude-opus-4-5-thinking": "claude-opus-4-6-thinking",
  "gemini-2.0-flash": "gemini-2.5-flash",
  "gemini-2.0-flash-001": "gemini-2.5-flash",
};

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: ANTIGRAVITY_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: ANTIGRAVITY_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

async function postForm(url: string, body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(body).toString(),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Antigravity token request failed (${response.status}): ${text}`);
  return JSON.parse(text) as TokenResponse;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  return postForm(TOKEN_URL, {
    grant_type: "authorization_code",
    code,
    client_id: ANTIGRAVITY_CLIENT_ID,
    client_secret: ANTIGRAVITY_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
  });
}

export async function refreshAccessToken(refresh: string): Promise<TokenResponse> {
  return postForm(TOKEN_URL, {
    grant_type: "refresh_token",
    refresh_token: refresh,
    client_id: ANTIGRAVITY_CLIENT_ID,
    client_secret: ANTIGRAVITY_CLIENT_SECRET,
  });
}

export async function loadCodeAssist(access: string): Promise<string | undefined> {
  for (const base of BOOTSTRAP_BASES) {
    try {
      const response = await fetch(`${base}/v1internal:loadCodeAssist`, {
        method: "POST",
        headers: { ...CLIENT_HEADERS, Authorization: `Bearer ${access}` },
        body: JSON.stringify({ metadata: { ideType: "ANTIGRAVITY", pluginType: "GEMINI" } }),
      });
      if (!response.ok) continue;
      const json: any = await response.json();
      const project = json?.cloudaicompanionProject;
      if (typeof project === "string" && project) return project;
      if (project?.id) return String(project.id);

      // Onboard user to free tier if unprovisioned
      const tier = (json?.allowedTiers ?? []).find((t: any) => t?.isDefault) ?? { id: "free-tier" };
      const onboard = await fetch(`${base}/v1internal:onboardUser`, {
        method: "POST",
        headers: { ...CLIENT_HEADERS, Authorization: `Bearer ${access}` },
        body: JSON.stringify({
          tierId: tier.id,
          metadata: { ideType: "ANTIGRAVITY", pluginType: "GEMINI" },
        }),
      });
      if (!onboard.ok) continue;
      const done: any = await onboard.json();
      const onboarded = done?.response?.cloudaicompanionProject;
      if (typeof onboarded === "string" && onboarded) return onboarded;
      if (onboarded?.id) return String(onboarded.id);
    } catch {}
  }
  return undefined;
}

export async function fetchAvailableModels(access: string, project?: string): Promise<Record<string, ModelDef> | undefined> {
  const reqProject = project || "aicode-consumers";
  for (const base of BOOTSTRAP_BASES) {
    try {
      const response = await fetch(`${base}/v1internal:fetchAvailableModels`, {
        method: "POST",
        headers: { ...CLIENT_HEADERS, Authorization: `Bearer ${access}` },
        body: JSON.stringify({ project: reqProject }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) continue;
      const json: any = await response.json();
      const rawModels = json?.models ?? json?.availableModels ?? {};
      const out: Record<string, ModelDef> = {};

      if (typeof rawModels === "object" && !Array.isArray(rawModels)) {
        for (const [id, model] of Object.entries<any>(rawModels)) {
          if (!id) continue;
          out[id] = {
            name: model?.displayName || id,
            tool_call: true,
            reasoning: model?.supportsThinking ?? true,
            attachment: true,
            limit: {
              context: Number(model?.maxTokens ?? model?.inputTokenLimit ?? 1048576),
              output: Number(model?.maxOutputTokens ?? model?.outputTokenLimit ?? 65536),
            },
          };
        }
      }
      if (Object.keys(out).length > 0) return out;
    } catch {}
  }
  return undefined;
}
