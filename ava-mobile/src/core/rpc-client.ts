import { APP } from "@/config/app";
import { toCoreError } from "./errors";
import type { ConnectionStatus } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Notification = { method: string; params: any; id?: number | string };
type Listener = (n: Notification) => void;
type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

/** JSON-RPC 2.0 over WebSocket, matching the AvA server `/ws` protocol. Works in browsers and React Native. */
export class RpcClient {
  private ws: WebSocket | null = null;
  private id = 1;
  private pending = new Map<number, Pending>();
  private listeners = new Set<Listener>();
  private statusListeners = new Set<(s: ConnectionStatus) => void>();
  private opening: Promise<void> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private attempts = 0;
  status: ConnectionStatus = "offline";

  constructor(private serverUrl: string, private token: string) {}

  private wsUrl() {
    const u = this.serverUrl.replace(/^http/, "ws");
    return `${u}/ws?client=mobile&token=${encodeURIComponent(this.token)}`;
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.opening) return this.opening;
    this.closed = false;
    this.setStatus("connecting");
    this.opening = new Promise<void>((resolve, reject) => {
      const headers: Record<string, string> = {};
      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }
      const ws =
        typeof WebSocket !== "undefined" && Object.keys(headers).length > 0
          ? new (WebSocket as any)(this.wsUrl(), undefined, { headers })
          : new WebSocket(this.wsUrl());
      this.ws = ws;
      ws.onopen = async () => {
        try {
          await this.send("initialize", {
            clientInfo: { name: APP.clientName, version: APP.version, client: "mobile" },
            capabilities: { experimentalApi: true },
          });
          this.attempts = 0;
          this.setStatus("online");
          resolve();
        } catch (e) {
          reject(e as Error);
        } finally {
          this.opening = null;
        }
      };
      ws.onmessage = (ev: any) => this.handle(ev.data);
      ws.onerror = () => {
        this.opening = null;
        reject(new Error("Could not reach AvA server"));
        try {
          ws.close();
        } catch {}
      };
      ws.onclose = () => {
        this.opening = null;
        this.ws = null;
        this.setStatus("offline");
        this.pending.forEach((p) => p.reject(new Error("Connection closed")));
        this.pending.clear();
        if (!this.closed) {
          // Exponential backoff: 1s, 2s, 4s … capped at 15s.
          const delay = Math.min(15000, 1000 * 2 ** this.attempts++);
          if (this.retry) clearTimeout(this.retry);
          this.retry = setTimeout(() => this.connect().catch(() => {}), delay);
        }
      };
    });
    return this.opening;
  }

  private handle(data: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let msg: any;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }
    if (typeof msg.id === "number" && this.pending.has(msg.id)) {
      const p = this.pending.get(msg.id)!;
      this.pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.error) p.reject(toCoreError(msg.error, "Request failed"));
      else p.resolve(msg.result);
      return;
    }
    if (typeof msg.method === "string") {
      const n: Notification = {
        method: msg.method,
        params: (msg.params as Record<string, unknown>) ?? {},
        id: msg.id,
      };
      this.listeners.forEach((l) => l(n));
    }
  }

  respond(id: number | string, result: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ jsonrpc: "2.0", id, result }));
  }

  private send(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return reject(new Error("Not connected"));
      const id = this.id++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 45000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }

  async call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    await this.connect();
    return (await this.send(method, params)) as T;
  }

  on(l: Listener) {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  }

  onStatus(l: (s: ConnectionStatus) => void) {
    this.statusListeners.add(l);
    return () => void this.statusListeners.delete(l);
  }

  /** Reconnect immediately (e.g. when the app returns to the foreground). */
  reconnectNow() {
    if (this.closed || this.ws?.readyState === WebSocket.OPEN) return;
    if (this.retry) clearTimeout(this.retry);
    this.attempts = 0;
    this.connect().catch(() => {});
  }

  close() {
    this.closed = true;
    if (this.retry) clearTimeout(this.retry);
    this.ws?.close();
  }
}
