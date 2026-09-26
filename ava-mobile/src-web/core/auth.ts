import { APP } from "@/config/app";
import { storage } from "./storage";

const KEY = "ava.auth";

export interface AuthState {
  serverUrl: string;
  username: string;
  token: string; // base64(user:pass), sent as Basic auth
}

export function cleanUrl(url: string) {
  return (url.trim() || APP.defaultServerUrl).replace(/\/+$/, "").replace(/\/api$/, "");
}

export function loadAuth(): AuthState | null {
  const raw = storage.get(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function saveAuth(a: AuthState) {
  storage.set(KEY, JSON.stringify(a));
}

export function clearAuth() {
  storage.remove(KEY);
}

export function makeToken(username: string, password: string) {
  return btoa(`${username}:${password}`);
}

/** Checks the server's health endpoint with the given credentials. */
export async function verifyLogin(serverUrl: string, username: string, password: string): Promise<AuthState> {
  const base = cleanUrl(serverUrl);
  const token = makeToken(username.trim() || APP.defaultUsername, password);
  const res = await fetch(`${base}/healthz`, {
    headers: { Authorization: `Basic ${token}`, "x-ava-client": "mobile" },
  });
  if (res.status === 401 || res.status === 403) throw new Error("Wrong username or password");
  if (!res.ok) throw new Error(`Server replied ${res.status}`);
  return { serverUrl: base, username: username.trim() || APP.defaultUsername, token };
}
