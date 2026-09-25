/**
 * Tiny key-value storage adapter. On React Native, swap the implementation
 * for AsyncStorage / SecureStore without touching callers.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const memory = new Map<string, string>();

export const storage: KeyValueStore = {
  get: (k) => (typeof window === "undefined" ? memory.get(k) ?? null : window.localStorage.getItem(k)),
  set: (k, v) => (typeof window === "undefined" ? void memory.set(k, v) : window.localStorage.setItem(k, v)),
  remove: (k) => (typeof window === "undefined" ? void memory.delete(k) : window.localStorage.removeItem(k)),
};
