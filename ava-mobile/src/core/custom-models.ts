import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ModelInfo } from "./types";
import { REASONING_EFFORTS } from "@/config/models";

const CUSTOM_MODELS_STORAGE_KEY = "ava_custom_models_v2";

export interface CustomModelInput {
  id: string;
  name?: string;
  provider?: "omniroute" | "antigravity" | "custom" | string;
  endpoint?: string;
  apiKey?: string;
  supportsImages?: boolean;
  reasoning?: boolean;
  description?: string;
}

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

  // Remove existing entry with identical ID (case-insensitive)
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
