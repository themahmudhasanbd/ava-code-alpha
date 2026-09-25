import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const memory = new Map<string, string>();
const SECURE_KEYS = new Set(["ava.auth", "ava.token"]);

let initialized = false;

/** Preloads storage into memory so synchronous `storage.get()` works anywhere. */
export async function initStorage(): Promise<void> {
  if (initialized) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length > 0) {
      const pairs = await AsyncStorage.multiGet(keys);
      pairs.forEach(([k, v]) => {
        if (v !== null) memory.set(k, v);
      });
    }

    // Load secure keys
    for (const key of SECURE_KEYS) {
      try {
        const val = await SecureStore.getItemAsync(key);
        if (val !== null) memory.set(key, val);
      } catch {
        // Fallback to async storage if secure store fails
      }
    }
  } catch (err) {
    console.warn("Storage init warning:", err);
  } finally {
    initialized = true;
  }
}

export const storage: KeyValueStore = {
  get: (k: string) => memory.get(k) ?? null,
  set: (k: string, v: string) => {
    memory.set(k, v);
    if (SECURE_KEYS.has(k)) {
      SecureStore.setItemAsync(k, v).catch(() => {
        AsyncStorage.setItem(k, v).catch(() => {});
      });
    } else {
      AsyncStorage.setItem(k, v).catch(() => {});
    }
  },
  remove: (k: string) => {
    memory.delete(k);
    if (SECURE_KEYS.has(k)) {
      SecureStore.deleteItemAsync(k).catch(() => {});
    }
    AsyncStorage.removeItem(k).catch(() => {});
  },
};
