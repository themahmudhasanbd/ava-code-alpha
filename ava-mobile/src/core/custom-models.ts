import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ModelInfo } from "./types";
import {
  ANTIGRAVITY_CLIENT_ID,
  ANTIGRAVITY_CLIENT_SECRET,
  ANTIGRAVITY_REDIRECT_URI,
  REASONING_EFFORTS,
} from "@/config/models";

const CUSTOM_PROVIDERS_STORAGE_KEY = "ava_custom_providers_v3";
const CUSTOM_MODELS_STORAGE_KEY = "ava_custom_models_v3";
const ANTIGRAVITY_AUTH_STORAGE_KEY = "ava_antigravity_auth_v2";
const ANTIGRAVITY_MODELS_CACHE_KEY = "ava_antigravity_models_cache_v2";

export interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  authType?: "apiKey" | "oauth" | "bearer" | "none";
  wireApi?: "responses" | "openai-compatible";
  enabled: boolean;
  models?: ModelInfo[];
  updatedAt?: string;
}

export interface CustomModelInput {
  id: string;
  name?: string;
  provider?: string;
  endpoint?: string;
  apiKey?: string;
  supportsImages?: boolean;
  reasoning?: boolean;
  description?: string;
}

export const BUILTIN_PROVIDER_PRESETS: Omit<CustomProvider, "enabled" | "updatedAt">[] = [
  {
    id: "antigravity",
    name: "Google Antigravity",
    baseUrl: "https://daily-cloudcode-pa.googleapis.com",
    authType: "oauth",
    wireApi: "responses",
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    authType: "apiKey",
    wireApi: "responses",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    authType: "apiKey",
    wireApi: "responses",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    authType: "apiKey",
    wireApi: "responses",
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    authType: "apiKey",
    wireApi: "responses",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    authType: "apiKey",
    wireApi: "responses",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    baseUrl: "http://127.0.0.1:11434/v1",
    authType: "none",
    wireApi: "responses",
  },
  {
    id: "lmstudio",
    name: "LM Studio (Local)",
    baseUrl: "http://127.0.0.1:1234/v1",
    authType: "none",
    wireApi: "responses",
  },
  {
    id: "custom",
    name: "Custom Endpoint",
    baseUrl: "http://127.0.0.1:8000/v1",
    authType: "apiKey",
    wireApi: "responses",
  },
];

// ─────────────────────────────────────────────────────────────
// 1. Antigravity OAuth & Dynamic Model Discovery
// ─────────────────────────────────────────────────────────────

export interface AntigravityAuthData {
  accessToken: string;
  refreshToken?: string;
  updatedAt: string;
}

export async function getAntigravityAuth(): Promise<AntigravityAuthData | null> {
  try {
    const raw = await AsyncStorage.getItem(ANTIGRAVITY_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveAntigravityAuth(accessToken: string, refreshToken?: string): Promise<void> {
  const data: AntigravityAuthData = {
    accessToken: accessToken.trim(),
    refreshToken: refreshToken?.trim(),
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(ANTIGRAVITY_AUTH_STORAGE_KEY, JSON.stringify(data));
}

export async function clearAntigravityAuth(): Promise<void> {
  await AsyncStorage.removeItem(ANTIGRAVITY_AUTH_STORAGE_KEY);
  await AsyncStorage.removeItem(ANTIGRAVITY_MODELS_CACHE_KEY);
}

export async function getCachedAntigravityModels(): Promise<ModelInfo[]> {
  try {
    const raw = await AsyncStorage.getItem(ANTIGRAVITY_MODELS_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCachedAntigravityModels(models: ModelInfo[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ANTIGRAVITY_MODELS_CACHE_KEY, JSON.stringify(models));
  } catch (err) {
    console.warn("[Antigravity] Failed to cache models:", err);
  }
}

/**
 * Exchange authorization code or redirect URI for Google OAuth tokens
 */
export async function exchangeAntigravityOAuthCode(
  codeOrUrl: string
): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; error?: string }> {
  let input = codeOrUrl.trim();

  // If the user directly pasted a ya29 token or API key
  if (input.startsWith("ya29.") || input.startsWith("AIza")) {
    await saveAntigravityAuth(input);
    return { success: true, accessToken: input };
  }

  let code = input;
  if (code.includes("code=")) {
    try {
      const parsedUrl = new URL(code);
      code = parsedUrl.searchParams.get("code") || code;
    } catch {
      const match = code.match(/[?&]code=([^&]+)/);
      if (match && match[1]) {
        code = decodeURIComponent(match[1]);
      }
    }
  }

  if (!code) {
    return { success: false, error: "No valid authorization code or access token found." };
  }

  try {
    const body = new URLSearchParams();
    body.append("client_id", ANTIGRAVITY_CLIENT_ID);
    body.append("client_secret", ANTIGRAVITY_CLIENT_SECRET);
    body.append("code", code);
    body.append("grant_type", "authorization_code");
    body.append("redirect_uri", ANTIGRAVITY_REDIRECT_URI);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const json = await res.json();
    if (res.ok && json.access_token) {
      await saveAntigravityAuth(json.access_token, json.refresh_token);
      return {
        success: true,
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
      };
    }
    return {
      success: false,
      error: json.error_description || json.error || "Token exchange failed.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error during OAuth token exchange." };
  }
}

/**
 * Refresh expired Antigravity access token
 */
export async function refreshAntigravityToken(
  refreshToken: string
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    const body = new URLSearchParams();
    body.append("client_id", ANTIGRAVITY_CLIENT_ID);
    body.append("client_secret", ANTIGRAVITY_CLIENT_SECRET);
    body.append("refresh_token", refreshToken.trim());
    body.append("grant_type", "refresh_token");

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const json = await res.json();
    if (res.ok && json.access_token) {
      await saveAntigravityAuth(json.access_token, refreshToken);
      return { success: true, accessToken: json.access_token };
    }
    return { success: false, error: json.error_description || json.error || "Token refresh failed." };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error refreshing token." };
  }
}

/**
 * Fetch available dynamic models from Google Cloud Code PA
 */
export async function fetchAntigravityModels(accessToken: string): Promise<ModelInfo[]> {
  const token = accessToken.trim();
  if (!token) return [];

  try {
    // 1. Initialize CodeAssist session
    try {
      await fetch("https://daily-cloudcode-pa.googleapis.com/v1internal:loadCodeAssist", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "antigravity/ide/2.5.5 darwin/arm64",
          "X-Goog-Api-Client": "gl-node/22.21.1",
        },
        body: JSON.stringify({
          metadata: { ideType: "ANTIGRAVITY", pluginType: "GEMINI" },
        }),
      });
    } catch {
      /* ignore load errors */
    }

    // 2. Fetch available models
    const res = await fetch("https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "antigravity/ide/2.5.5 darwin/arm64",
        "X-Goog-Api-Client": "gl-node/22.21.1",
      },
      body: JSON.stringify({ project: "aicode-consumers" }),
    });

    if (!res.ok) {
      throw new Error(`Google Cloud Code PA returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const result: ModelInfo[] = [];
    const modelsObj = data.models || {};
    const seen = new Set<string>();

    // Parse agentModelSorts first for prioritized recommended models
    if (Array.isArray(data.agentModelSorts)) {
      for (const sortItem of data.agentModelSorts) {
        if (Array.isArray(sortItem.groups)) {
          for (const grp of sortItem.groups) {
            if (Array.isArray(grp.modelIds)) {
              for (const mid of grp.modelIds) {
                const idStr = String(mid);
                if (seen.has(idStr.toLowerCase())) continue;
                seen.add(idStr.toLowerCase());

                const rawInfo = modelsObj[idStr] || {};
                const name = rawInfo.displayName || formatModelDisplayName(idStr);
                const desc = `Google Antigravity · ${rawInfo.tagDescription || rawInfo.tagTitle || "Reasoning Engine"}`;
                result.push({
                  id: idStr,
                  name,
                  description: desc,
                  provider: "antigravity",
                  supportsImages: rawInfo.supportsImages !== false,
                  reasoning: rawInfo.supportsThinking !== false,
                  reasoningEfforts: [...REASONING_EFFORTS],
                });
              }
            }
          }
        }
      }
    }

    // Parse any remaining models from the map
    for (const [mid, rawInfo] of Object.entries<any>(modelsObj)) {
      if (seen.has(mid.toLowerCase())) continue;
      // Skip internal debug/chat non-agent models
      if (rawInfo.isInternal && !rawInfo.displayName) continue;
      seen.add(mid.toLowerCase());

      const name = rawInfo.displayName || formatModelDisplayName(mid);
      const desc = `Google Antigravity · ${rawInfo.tagDescription || "AI Model"}`;
      result.push({
        id: mid,
        name,
        description: desc,
        provider: "antigravity",
        supportsImages: rawInfo.supportsImages !== false,
        reasoning: rawInfo.supportsThinking !== false,
        reasoningEfforts: [...REASONING_EFFORTS],
      });
    }

    if (result.length > 0) {
      await saveCachedAntigravityModels(result);
    }

    return result;
  } catch (e) {
    console.warn("[Antigravity] Failed to fetch dynamic models:", e);
    // Fall back to cached models if available
    const cached = await getCachedAntigravityModels();
    return cached;
  }
}

function formatModelDisplayName(id: string): string {
  return id
    .replace(/^antigravity\//, "")
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─────────────────────────────────────────────────────────────
// 2. Generic OpenAI-Compatible Dynamic Model Discovery
// ─────────────────────────────────────────────────────────────

export async function fetchOpenAiCompatibleModels(
  baseUrl: string,
  apiKey?: string,
  providerId: string = "custom"
): Promise<ModelInfo[]> {
  const url = baseUrl.trim().replace(/\/+$/, "");
  const target = url.endsWith("/models") ? url : `${url}/models`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey?.trim()) {
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  }

  try {
    const res = await fetch(target, { method: "GET", headers });
    if (!res.ok) {
      throw new Error(`Provider returned HTTP ${res.status}`);
    }
    const json = await res.json();
    const rawList = Array.isArray(json.data) ? json.data : Array.isArray(json.models) ? json.models : [];
    return rawList
      .map((item: any) => {
        const id = String(item.id || item.name || item.model || "");
        const name = item.displayName || item.name || id;
        const desc = item.description || `Provider: ${providerId} (${baseUrl})`;
        return {
          id,
          name,
          description: desc,
          provider: providerId,
          supportsImages: true,
          reasoning: true,
          reasoningEfforts: [...REASONING_EFFORTS],
        };
      })
      .filter((m: ModelInfo) => m.id);
  } catch (err: any) {
    console.warn("[CustomProvider] Failed to fetch models:", err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Provider Management (AsyncStorage)
// ─────────────────────────────────────────────────────────────

export async function getCustomProviders(): Promise<CustomProvider[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_PROVIDERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCustomProvider(provider: CustomProvider): Promise<CustomProvider[]> {
  const current = await getCustomProviders();
  const trimmedId = provider.id.trim().toLowerCase();
  if (!trimmedId) return current;

  const filtered = current.filter((p) => p.id.toLowerCase() !== trimmedId);
  const updated: CustomProvider = {
    ...provider,
    id: trimmedId,
    name: provider.name.trim() || trimmedId,
    baseUrl: provider.baseUrl.trim(),
    apiKey: provider.apiKey?.trim(),
    accessToken: provider.accessToken?.trim(),
    refreshToken: provider.refreshToken?.trim(),
    enabled: provider.enabled !== false,
    models: provider.models || [],
    updatedAt: new Date().toISOString(),
  };

  const nextList = [updated, ...filtered];
  await AsyncStorage.setItem(CUSTOM_PROVIDERS_STORAGE_KEY, JSON.stringify(nextList));
  return nextList;
}

export async function deleteCustomProvider(id: string): Promise<CustomProvider[]> {
  const current = await getCustomProviders();
  const filtered = current.filter((p) => p.id.toLowerCase() !== id.toLowerCase());
  await AsyncStorage.setItem(CUSTOM_PROVIDERS_STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}

export async function toggleCustomProvider(id: string, enabled: boolean): Promise<CustomProvider[]> {
  const current = await getCustomProviders();
  const updated = current.map((p) => (p.id.toLowerCase() === id.toLowerCase() ? { ...p, enabled } : p));
  await AsyncStorage.setItem(CUSTOM_PROVIDERS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

// ─────────────────────────────────────────────────────────────
// 4. Standalone Custom Models (AsyncStorage)
// ─────────────────────────────────────────────────────────────

export async function getCustomModels(): Promise<ModelInfo[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_MODELS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: CustomModelInput[] = JSON.parse(raw);
    return parsed.map((item) => ({
      id: item.id.trim(),
      name: item.name?.trim() || item.id.trim(),
      description: item.endpoint
        ? `Endpoint: ${item.endpoint}`
        : item.description || (item.provider === "antigravity" ? "Google Antigravity Engine" : "Custom Model"),
      provider: item.provider || "custom",
      supportsImages: item.supportsImages !== false,
      reasoning: item.reasoning !== false,
      reasoningEfforts: [...REASONING_EFFORTS],
    }));
  } catch {
    return [];
  }
}

export async function saveCustomModel(input: CustomModelInput): Promise<ModelInfo[]> {
  const current = await getCustomModels();
  const trimmedId = input.id.trim();
  if (!trimmedId) return current;

  const existingFiltered = current.filter((m) => m.id.toLowerCase() !== trimmedId.toLowerCase());
  const newItem: CustomModelInput = {
    id: trimmedId,
    name: input.name?.trim() || trimmedId,
    provider: input.provider || (trimmedId.startsWith("antigravity/") ? "antigravity" : "custom"),
    endpoint: input.endpoint?.trim(),
    apiKey: input.apiKey?.trim(),
    supportsImages: input.supportsImages !== false,
    reasoning: input.reasoning !== false,
    description: input.description?.trim(),
  };

  const updatedRaw = [
    newItem,
    ...existingFiltered.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      endpoint: m.description?.startsWith("Endpoint: ") ? m.description.replace("Endpoint: ", "") : undefined,
      description: m.description,
      supportsImages: m.supportsImages,
      reasoning: m.reasoning,
    })),
  ];

  await AsyncStorage.setItem(CUSTOM_MODELS_STORAGE_KEY, JSON.stringify(updatedRaw));
  return getCustomModels();
}

export async function deleteCustomModel(id: string): Promise<ModelInfo[]> {
  const current = await getCustomModels();
  const filtered = current.filter((m) => m.id !== id);
  const raw = filtered.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    description: m.description,
    supportsImages: m.supportsImages,
    reasoning: m.reasoning,
  }));
  await AsyncStorage.setItem(CUSTOM_MODELS_STORAGE_KEY, JSON.stringify(raw));
  return getCustomModels();
}
