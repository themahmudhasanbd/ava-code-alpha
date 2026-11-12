import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { n as twMerge } from "../_libs/streamdown+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ava-provider-C7vD2Dgg.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
/** Single source of truth for brand + server settings. Change here, applies everywhere. */
var APP = {
	name: "AvA Code",
	tagline: "Coding workspace",
	version: "2.0.0",
	logo: "/ava-code-mark.png",
	defaultServerUrl: "https://ava.mahmudhasan.pro",
	defaultUsername: "ava",
	clientName: "ava-web",
	defaultCwd: "/var/www/ava-code",
	mediaDir: "/root/shared-media",
	defaultBrowserUrl: "https://ava.mahmudhasan.pro"
};
var memory = /* @__PURE__ */ new Map();
var storage = {
	get: (k) => typeof window === "undefined" ? memory.get(k) ?? null : window.localStorage.getItem(k),
	set: (k, v) => typeof window === "undefined" ? void memory.set(k, v) : window.localStorage.setItem(k, v),
	remove: (k) => typeof window === "undefined" ? void memory.delete(k) : window.localStorage.removeItem(k)
};
var KEY = "ava.auth";
function cleanUrl(url) {
	return (url.trim() || APP.defaultServerUrl).replace(/\/+$/, "").replace(/\/api$/, "");
}
function loadAuth() {
	const raw = storage.get(KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
function saveAuth(a) {
	storage.set(KEY, JSON.stringify(a));
}
function clearAuth() {
	storage.remove(KEY);
}
function makeToken(username, password) {
	return btoa(`${username}:${password}`);
}
/** Checks the server's health endpoint with the given credentials. */
async function verifyLogin(serverUrl, username, password) {
	const base = cleanUrl(serverUrl);
	const token = makeToken(username.trim() || APP.defaultUsername, password);
	const res = await fetch(`${base}/healthz`, { headers: {
		Authorization: `Basic ${token}`,
		"x-ava-client": "mobile"
	} });
	if (res.status === 401 || res.status === 403) throw new Error("Wrong username or password");
	if (!res.ok) throw new Error(`Server replied ${res.status}`);
	return {
		serverUrl: base,
		username: username.trim() || APP.defaultUsername,
		token
	};
}
/** Splits a Basic token (base64 "username:password") back into its parts. In-memory use only. */
function decodeCredentials(token) {
	const raw = atob(token);
	const i = raw.indexOf(":");
	return i === -1 ? {
		username: raw,
		password: ""
	} : {
		username: raw.slice(0, i),
		password: raw.slice(i + 1)
	};
}
/** Error that keeps the exact details the AvA core sent. */
var CoreError = class extends Error {
	code;
	details;
	constructor(message, code, details) {
		super(message);
		this.code = code;
		this.details = details;
		this.name = "CoreError";
	}
};
var text = (v) => v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
/** Turns any core error shape (JSON-RPC error, turn error, error event) into one exact, readable string. */
function formatCoreError(err, fallback = "Something went wrong") {
	if (!err) return fallback;
	if (typeof err === "string") return err;
	if (err instanceof Error && !(err instanceof CoreError)) return err.message || fallback;
	const e = err.error && typeof err.error === "object" ? err.error : err;
	const message = text(e.message) || fallback;
	const info = e.avaErrorInfo ?? e.errorInfo ?? e.code;
	const extra = [info && typeof info === "object" ? Object.keys(info)[0] ?? text(info) : info ? String(info) : "", text(e.additionalDetails ?? e.details ?? (e instanceof CoreError ? e.details : e.data))].filter((s) => s && !message.includes(s));
	return extra.length ? `${message}\n${extra.join(" · ")}` : message;
}
function toCoreError(err, fallback) {
	return new CoreError(formatCoreError(err, fallback), err?.code);
}
/** JSON-RPC 2.0 over WebSocket, matching the AvA server `/ws` protocol. Works in browsers and React Native. */
var RpcClient = class {
	serverUrl;
	token;
	ws = null;
	id = 1;
	pending = /* @__PURE__ */ new Map();
	listeners = /* @__PURE__ */ new Set();
	statusListeners = /* @__PURE__ */ new Set();
	opening = null;
	retry = null;
	closed = false;
	heartbeat = null;
	status = "offline";
	constructor(serverUrl, token) {
		this.serverUrl = serverUrl;
		this.token = token;
	}
	wsUrl() {
		return `${this.serverUrl.replace(/^http/, "ws")}/ws?client=mobile&token=${encodeURIComponent(this.token)}`;
	}
	setStatus(s) {
		this.status = s;
		this.statusListeners.forEach((l) => l(s));
	}
	/** App-level keepalive: a socket that dies without firing `onclose` (half-open
	* after a server crash) would otherwise look connected forever. A cheap
	* server/diagnostics round trip every 30s proves the connection is live; a
	* failed ping force-closes the socket so the normal onclose -> retry flow
	* recovers the connection. */
	startHeartbeat() {
		this.stopHeartbeat();
		this.heartbeat = setInterval(() => void this.ping(), 3e4);
	}
	stopHeartbeat() {
		if (this.heartbeat) clearInterval(this.heartbeat);
		this.heartbeat = null;
	}
	async ping() {
		if (this.closed || this.status !== "online") return;
		try {
			await Promise.race([this.send("server/diagnostics", {}), new Promise((_, reject) => setTimeout(() => reject(/* @__PURE__ */ new Error("ping timeout")), 1e4))]);
		} catch {
			try {
				this.ws?.close();
			} catch {}
		}
	}
	connect() {
		if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();
		if (this.opening) return this.opening;
		this.closed = false;
		this.setStatus("connecting");
		this.opening = new Promise((resolve, reject) => {
			const ws = new WebSocket(this.wsUrl());
			this.ws = ws;
			ws.onopen = async () => {
				try {
					await this.send("initialize", {
						clientInfo: {
							name: APP.clientName,
							version: APP.version,
							client: "mobile"
						},
						capabilities: { experimentalApi: true }
					});
					this.setStatus("online");
					this.startHeartbeat();
					resolve();
				} catch (e) {
					reject(e);
				} finally {
					this.opening = null;
				}
			};
			ws.onmessage = (ev) => this.handle(ev.data);
			ws.onerror = () => {
				this.stopHeartbeat();
				this.opening = null;
				reject(/* @__PURE__ */ new Error("Could not reach AvA server"));
			};
			ws.onclose = () => {
				this.stopHeartbeat();
				this.opening = null;
				this.ws = null;
				this.setStatus("offline");
				this.pending.forEach((p) => p.reject(/* @__PURE__ */ new Error("Connection closed")));
				this.pending.clear();
				if (!this.closed) this.retry = setTimeout(() => this.connect().catch(() => {}), 3e3);
			};
		});
		return this.opening;
	}
	handle(data) {
		let msg;
		try {
			msg = JSON.parse(String(data));
		} catch {
			return;
		}
		if (typeof msg.id === "number" && msg.method === void 0 && this.pending.has(msg.id)) {
			const p = this.pending.get(msg.id);
			this.pending.delete(msg.id);
			clearTimeout(p.timer);
			if (msg.error) p.reject(toCoreError(msg.error, "Request failed"));
			else p.resolve(msg.result);
			return;
		}
		if (typeof msg.method === "string") {
			const n = {
				method: msg.method,
				params: msg.params ?? {},
				id: msg.id
			};
			this.listeners.forEach((l) => l(n));
		}
	}
	send(method, params) {
		return new Promise((resolve, reject) => {
			if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return reject(/* @__PURE__ */ new Error("Not connected"));
			const id = this.id++;
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(/* @__PURE__ */ new Error(`${method} timed out`));
			}, 45e3);
			this.pending.set(id, {
				resolve,
				reject,
				timer
			});
			this.ws.send(JSON.stringify({
				jsonrpc: "2.0",
				id,
				method,
				params
			}));
		});
	}
	/** Answers a server-initiated request ({jsonrpc:"2.0", id, result}). */
	respond(id, result) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
		this.ws.send(JSON.stringify({
			jsonrpc: "2.0",
			id,
			result
		}));
	}
	async call(method, params = {}) {
		await this.connect();
		return await this.send(method, params);
	}
	on(l) {
		this.listeners.add(l);
		return () => void this.listeners.delete(l);
	}
	onStatus(l) {
		this.statusListeners.add(l);
		return () => void this.statusListeners.delete(l);
	}
	close() {
		this.closed = true;
		if (this.retry) clearTimeout(this.retry);
		this.ws?.close();
	}
};
var AvaContext = (0, import_react.createContext)(null);
var MODEL_KEY = "ava.model";
var EFFORT_KEY = "ava.effort";
var SANDBOX_KEY = "ava.sandbox";
function AvaProvider({ children }) {
	const [ready, setReady] = (0, import_react.useState)(false);
	const [auth, setAuth] = (0, import_react.useState)(null);
	const [status, setStatus] = (0, import_react.useState)("offline");
	const [activeSessionId, setActiveSessionId] = (0, import_react.useState)(null);
	const [workingSessionId, setWorkingSessionId] = (0, import_react.useState)(null);
	const [modelId, setModelIdState] = (0, import_react.useState)("");
	const [effort, setEffortState] = (0, import_react.useState)("medium");
	const [sandbox, setSandboxState] = (0, import_react.useState)("danger-full-access");
	(0, import_react.useEffect)(() => {
		setAuth(loadAuth());
		setModelIdState(storage.get(MODEL_KEY) ?? "");
		setEffortState(storage.get(EFFORT_KEY) ?? "medium");
		setSandboxState(storage.get(SANDBOX_KEY) ?? "danger-full-access");
		setReady(true);
	}, []);
	const rpc = (0, import_react.useMemo)(() => auth ? new RpcClient(auth.serverUrl, auth.token) : null, [auth]);
	(0, import_react.useEffect)(() => {
		if (!rpc) return;
		const off = rpc.onStatus(setStatus);
		rpc.connect().catch(() => {});
		return () => {
			off();
			rpc.close();
		};
	}, [rpc]);
	const setModelId = (0, import_react.useCallback)((id) => {
		setModelIdState(id);
		storage.set(MODEL_KEY, id);
	}, []);
	const setEffort = (0, import_react.useCallback)((v) => {
		setEffortState(v);
		storage.set(EFFORT_KEY, v);
	}, []);
	const setSandbox = (0, import_react.useCallback)((v) => {
		setSandboxState(v);
		storage.set(SANDBOX_KEY, v);
	}, []);
	const signIn = (0, import_react.useCallback)((a) => {
		saveAuth(a);
		setAuth(a);
	}, []);
	const signOut = (0, import_react.useCallback)(() => {
		clearAuth();
		setAuth(null);
		setActiveSessionId(null);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvaContext.Provider, {
		value: {
			ready,
			auth,
			rpc,
			status,
			activeSessionId,
			setActiveSessionId,
			workingSessionId,
			setWorkingSessionId,
			modelId,
			setModelId,
			effort,
			setEffort,
			sandbox,
			setSandbox,
			signIn,
			signOut
		},
		children
	});
}
function useAva() {
	const ctx = (0, import_react.useContext)(AvaContext);
	if (!ctx) throw new Error("useAva must be used inside AvaProvider");
	return ctx;
}
//#endregion
export { decodeCredentials as a, useAva as c, cn as i, verifyLogin as l, AvaProvider as n, formatCoreError as o, cleanUrl as r, storage as s, APP as t };
