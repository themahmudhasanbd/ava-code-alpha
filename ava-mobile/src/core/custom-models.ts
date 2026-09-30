import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ModelInfo } from "./types";
import { REASONING_EFFORTS } from "@/config/models";

const CUSTOM_PROVIDERS_STORAGE_KEY = "ava_custom_providers_v3";
const CUSTOM_MODELS_STORAGE_KEY = "ava_custom_models_v3";
const MODEL_FALLBACK_CHAIN_STORAGE_KEY = "ava_model_fallback_chain_v1";

export interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  apiKeys?: string[];
  projectId?: string;
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
    id: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    authType: "apiKey",
    wireApi: "responses",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
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
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
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
    name: "Custom Provider",
    baseUrl: "http://127.0.0.1:8000/v1",
    authType: "apiKey",
    wireApi: "responses",
  },
];

// ─────────────────────────────────────────────────────────────
// 1. Generic OpenAI-Compatible Dynamic Model Discovery
// ─────────────────────────────────────────────────────────────

export async function fetchOpenAiCompatibleModels(
  baseUrl: string,
  apiKey?: string,
  providerId: string = "custom"
): Promise<ModelInfo[]> {
  const url = baseUrl.trim().replace(/\/+$/, "");

  // Special handling for Google Antigravity / Gemini Cloud Code
  if (providerId === "antigravity" || url.includes("cloudcode-pa.googleapis.com")) {
    return [
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro (Antigravity)",
        description: "Google Antigravity frontier multimodal model with reasoning",
        provider: "antigravity",
        supportsImages: true,
        reasoning: true,
        reasoningEfforts: [...REASONING_EFFORTS],
      },
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash (Antigravity)",
        description: "Google Antigravity ultra-fast thinking model",
        provider: "antigravity",
        supportsImages: true,
        reasoning: true,
        reasoningEfforts: [...REASONING_EFFORTS],
      },
      {
        id: "claude-3-7-sonnet",
        name: "Claude 3.7 Sonnet (Antigravity)",
        description: "Anthropic Claude 3.7 via Antigravity bridge",
        provider: "antigravity",
        supportsImages: true,
        reasoning: true,
        reasoningEfforts: [...REASONING_EFFORTS],
      },
      {
        id: "gpt-4o",
        name: "GPT-4o (Antigravity)",
        description: "OpenAI GPT-4o via Antigravity bridge",
        provider: "antigravity",
        supportsImages: true,
        reasoning: false,
        reasoningEfforts: [],
      },
    ];
  }

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
// 2. Provider Management (AsyncStorage)
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
  const normalizedKeys: string[] = Array.from(
    new Set(
      (provider.apiKeys && provider.apiKeys.length > 0
        ? provider.apiKeys
        : provider.apiKey
        ? provider.apiKey.split(/[,;\n]/)
        : []
      )
        .map((k) => k.trim())
        .filter(Boolean)
    )
  );

  const updated: CustomProvider = {
    ...provider,
    id: trimmedId,
    name: provider.name.trim() || trimmedId,
    baseUrl: provider.baseUrl.trim(),
    apiKey: normalizedKeys[0] || provider.apiKey?.trim(),
    apiKeys: normalizedKeys,
    projectId: provider.projectId?.trim(),
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
  const nextList = current.filter((p) => p.id.toLowerCase() !== id.trim().toLowerCase());
  await AsyncStorage.setItem(CUSTOM_PROVIDERS_STORAGE_KEY, JSON.stringify(nextList));
  return nextList;
}

export async function toggleCustomProvider(id: string, enabled: boolean): Promise<CustomProvider[]> {
  const current = await getCustomProviders();
  const nextList = current.map((p) => (p.id.toLowerCase() === id.trim().toLowerCase() ? { ...p, enabled } : p));
  await AsyncStorage.setItem(CUSTOM_PROVIDERS_STORAGE_KEY, JSON.stringify(nextList));
  return nextList;
}

// ─────────────────────────────────────────────────────────────
// 3. Standalone Custom Models (AsyncStorage)
// ─────────────────────────────────────────────────────────────

export async function getCustomModels(): Promise<ModelInfo[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_MODELS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCustomModel(input: CustomModelInput): Promise<ModelInfo[]> {
  const current = await getCustomModels();
  const id = input.id.trim();
  if (!id) return current;

  const newModel: ModelInfo = {
    id,
    name: input.name?.trim() || id,
    description: input.description?.trim() || `Custom model (${input.provider || "custom"})`,
    provider: input.provider?.trim() || "custom",
    supportsImages: input.supportsImages ?? true,
    reasoning: input.reasoning ?? true,
    reasoningEfforts: [...REASONING_EFFORTS],
  };

  const filtered = current.filter((m) => m.id.toLowerCase() !== id.toLowerCase());
  const updated = [newModel, ...filtered];
  await AsyncStorage.setItem(CUSTOM_MODELS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteCustomModel(id: string): Promise<ModelInfo[]> {
  const current = await getCustomModels();
  const updated = current.filter((m) => m.id.toLowerCase() !== id.toLowerCase());
  await AsyncStorage.setItem(CUSTOM_MODELS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function getModelFallbackChain(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(MODEL_FALLBACK_CHAIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveModelFallbackChain(chain: string[]): Promise<string[]> {
  const uniqueChain = Array.from(new Set(chain.map((c) => c.trim()).filter(Boolean)));
  await AsyncStorage.setItem(MODEL_FALLBACK_CHAIN_STORAGE_KEY, JSON.stringify(uniqueChain));
  return uniqueChain;
}
