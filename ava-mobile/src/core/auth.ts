import { APP } from "@/config/app";
import { storage } from "./storage";

const KEY = "ava.auth";

export interface AuthState {
  serverUrl: string;
  username: string;
  token: string; // base64(user:pass), sent as Basic auth
}

export function getDefaultServerUrl(): string {
  if (typeof window !== "undefined" && window.location && window.location.origin && !window.location.hostname.includes("localhost")) {
    return window.location.origin;
  }
  return APP.defaultServerUrl;
}

export function cleanUrl(url: string) {
  let u = (url.trim() || getDefaultServerUrl()).replace(/\/+$/, "").replace(/\/api$/, "");
  if (typeof window !== "undefined" && window.location) {
    if (u.includes("127.0.0.1") || u.includes("localhost") || u.startsWith("/")) {
      u = window.location.origin;
    }
  }
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    u = `https://${u}`;
  }
  return u;
}

export function loadAuth(): AuthState | null {
  const raw = storage.get(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthState;
    if (typeof window !== "undefined" && window.location) {
      if (!parsed.serverUrl || parsed.serverUrl.includes("127.0.0.1") || parsed.serverUrl.includes("localhost")) {
        parsed.serverUrl = window.location.origin;
      }
    }
    return parsed;
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

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

export function base64Encode(input: string): string {
  if (typeof btoa === "function") {
    try {
      return btoa(input);
    } catch {
      // fallback
    }
  }
  let str = input;
  let output = "";
  for (
    let block = 0, charCode, i = 0, map = chars;
    str.charAt(i | 0) || ((map = "="), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    if (charCode > 0xff) {
      throw new Error("Invalid character in base64 input");
    }
    block = (block << 8) | charCode;
  }
  return output;
}

export function makeToken(username: string, password: string) {
  return base64Encode(`${username}:${password}`);
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
