import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { clearAuth, loadAuth, saveAuth, type AuthState } from "@/core/auth";
import { RpcClient } from "@/core/rpc-client";
import { storage } from "@/core/storage";
import { APP } from "@/config/app";
import type { ConnectionStatus, Session } from "@/core/types";
import { keys } from "./queries";

interface AvaContextValue {
  ready: boolean;
  auth: AuthState | null;
  rpc: RpcClient | null;
  status: ConnectionStatus;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  workingSessionId: string | null;
  setWorkingSessionId: (id: string | null) => void;
  runningSessions: Record<string, boolean>;
  setSessionRunning: (id: string, isRunning: boolean) => void;
  modelId: string;
  setModelId: (id: string) => void;
  effort: string;
  setEffort: (v: string) => void;
  sandbox: string;
  setSandbox: (v: string) => void;
  defaultCwd: string;
  setDefaultCwd: (path: string) => void;
  workingCwd: string;
  setWorkingCwd: (path: string) => void;
  signIn: (a: AuthState) => void;
  signOut: () => void;
}

const AvaContext = createContext<AvaContextValue | null>(null);
const MODEL_KEY = "ava.model";
const EFFORT_KEY = "ava.effort";
const SANDBOX_KEY = "ava.sandbox";
const DEFAULT_CWD_KEY = "ava.default.cwd";
const WORKING_CWD_KEY = "ava.working.cwd";

const ACTIVE_SESSION_KEY = "ava.active.session";

export function AvaProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(true);
  const [auth, setAuth] = useState<AuthState | null>(() => loadAuth());
  const [status, setStatus] = useState<ConnectionStatus>("offline");
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(() => storage.get(ACTIVE_SESSION_KEY) || null);
  const [workingSessionId, setWorkingSessionId] = useState<string | null>(null);
  const [runningSessions, setRunningSessions] = useState<Record<string, boolean>>({});
  const [modelId, setModelIdState] = useState(() => storage.get(MODEL_KEY) ?? "");
  const [effort, setEffortState] = useState(() => storage.get(EFFORT_KEY) ?? "medium");
  const [sandbox, setSandboxState] = useState(() => storage.get(SANDBOX_KEY) ?? "danger-full-access");
  const [defaultCwd, setDefaultCwdState] = useState<string>(() => storage.get(DEFAULT_CWD_KEY) || APP.defaultCwd);
  const [workingCwd, setWorkingCwdState] = useState<string>(() => storage.get(WORKING_CWD_KEY) || storage.get(DEFAULT_CWD_KEY) || APP.defaultCwd);

  useEffect(() => {
    const savedAuth = loadAuth();
    if (savedAuth && (!auth || auth.token !== savedAuth.token || auth.serverUrl !== savedAuth.serverUrl)) {
      setAuth(savedAuth);
    }
  }, []);

  const setActiveSessionId = useCallback((id: string | null) => {
    setActiveSessionIdState(id);
    if (id) {
      storage.set(ACTIVE_SESSION_KEY, id);
    } else {
      storage.remove(ACTIVE_SESSION_KEY);
    }
  }, []);

  const setSessionRunning = useCallback((id: string, isRunning: boolean) => {
    if (!id) return;
    setRunningSessions((prev) => {
      if (isRunning) {
        if (prev[id]) return prev;
        return { ...prev, [id]: true };
      } else {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
    });
    if (isRunning) {
      setWorkingSessionId(id);
    } else {
      setWorkingSessionId((prev) => (prev === id ? null : prev));
    }
  }, []);

  const rpc = useMemo(() => (auth ? new RpcClient(auth.serverUrl, auth.token) : null), [auth?.serverUrl, auth?.token]);
  const qc = useQueryClient();

  // Audit C24 — tracks the previous connection status so we can detect
  // offline → online transitions and drop stale running flags from the dead connection.
  const statusRef = useRef<ConnectionStatus>("offline");
  const handleStatus = useCallback((s: ConnectionStatus) => {
    const prev = statusRef.current;
    statusRef.current = s;
    setStatus(s);
    if (prev === "offline" && s === "online") {
      setRunningSessions({});
      setWorkingSessionId(null);
    }
  }, []);

  useEffect(() => {
    if (!rpc) return;
    const offStatus = rpc.onStatus(handleStatus);

    // Global notification listener to accurately track running turns across any session/thread
    const offEvents = rpc.on(({ method, params }) => {
      // Audit P11 — MCP OAuth completion carries no threadId; handle before the thread gate.
      if (method === "mcpServer/oauthLogin/completed") {
        qc.invalidateQueries({ queryKey: keys.mcp });
        return;
      }

      const threadId = params?.threadId ?? params?.thread_id ?? params?.thread?.id;
      if (!threadId) return;

      // Audit P9/P10 — keep the session list in sync with server-side thread events.
      if (method === "thread/name/updated") {
        const name = params?.name ?? params?.thread?.name;
        if (typeof name === "string" && name) {
          qc.setQueryData<Session[]>(keys.sessions, (old) =>
            Array.isArray(old) ? old.map((s) => (s.id === threadId ? { ...s, title: name } : s)) : old
          );
        } else {
          qc.invalidateQueries({ queryKey: keys.sessions });
        }
      } else if (method === "thread/status/changed") {
        qc.invalidateQueries({ queryKey: keys.sessions });
      } else if (method === "thread/deleted" || method === "thread/archived") {
        qc.setQueryData<Session[]>(keys.sessions, (old) =>
          Array.isArray(old) ? old.filter((s) => s.id !== threadId) : old
        );
        setRunningSessions((prev) => {
          if (!prev[threadId]) return prev;
          const next = { ...prev };
          delete next[threadId];
          return next;
        });
        setWorkingSessionId((prev) => (prev === threadId ? null : prev));
      } else if (
        // Audit P12 — the dead `turn/start` branch is gone; only real server events.
        method === "turn/started" ||
        method === "item/started" ||
        method === "item/agentMessage/delta" ||
        method === "item/reasoning/textDelta" ||
        method === "item/reasoning/summaryTextDelta" ||
        method === "item/commandExecution/outputDelta" ||
        method === "command/exec/outputDelta"
      ) {
        setRunningSessions((prev) => (prev[threadId] ? prev : { ...prev, [threadId]: true }));
      } else if (method === "turn/completed") {
        setRunningSessions((prev) => {
          if (!prev[threadId]) return prev;
          const next = { ...prev };
          delete next[threadId];
          return next;
        });
      }
    });

    rpc.connect().catch(() => {});
    return () => {
      offStatus();
      offEvents();
      rpc.close();
    };
  }, [rpc, qc, handleStatus]);

  const setModelId = useCallback((id: string) => {
    setModelIdState(id);
    storage.set(MODEL_KEY, id);
  }, []);

  const setEffort = useCallback((v: string) => {
    setEffortState(v);
    storage.set(EFFORT_KEY, v);
  }, []);

  const setSandbox = useCallback((v: string) => {
    setSandboxState(v);
    storage.set(SANDBOX_KEY, v);
  }, []);

  const setDefaultCwd = useCallback((path: string) => {
    const clean = path.trim().replace(/\/+$/, "") || "/";
    setDefaultCwdState(clean);
    storage.set(DEFAULT_CWD_KEY, clean);
  }, []);

  const setWorkingCwd = useCallback((path: string) => {
    const clean = path.trim().replace(/\/+$/, "") || "/";
    setWorkingCwdState(clean);
    storage.set(WORKING_CWD_KEY, clean);
  }, []);

  const signIn = useCallback((a: AuthState) => {
    saveAuth(a);
    setAuth(a);
  }, []);

  const signOut = useCallback(() => {
    clearAuth();
    setAuth(null);
    setActiveSessionId(null);
    setRunningSessions({});
    setWorkingSessionId(null);
  }, [setActiveSessionId]);

  const contextValue = useMemo<AvaContextValue>(
    () => ({
      ready,
      auth,
      rpc,
      status,
      activeSessionId,
      setActiveSessionId,
      workingSessionId,
      setWorkingSessionId,
      runningSessions,
      setSessionRunning,
      modelId,
      setModelId,
      effort,
      setEffort,
      sandbox,
      setSandbox,
      defaultCwd,
      setDefaultCwd,
      workingCwd,
      setWorkingCwd,
      signIn,
      signOut,
    }),
    [
      ready,
      auth,
      rpc,
      status,
      activeSessionId,
      setActiveSessionId,
      workingSessionId,
      runningSessions,
      setSessionRunning,
      modelId,
      setModelId,
      effort,
      setEffort,
      sandbox,
      setSandbox,
      defaultCwd,
      setDefaultCwd,
      workingCwd,
      setWorkingCwd,
      signIn,
      signOut,
    ]
  );

  return (
    <AvaContext.Provider value={contextValue}>
      {children}
    </AvaContext.Provider>
  );
}

export function useAva() {
  const ctx = useContext(AvaContext);
  if (!ctx) throw new Error("useAva must be used inside AvaProvider");
  return ctx;
}

/** Returns the connected client or throws — use inside signed-in screens only. */
export function useRpc() {
  const { rpc } = useAva();
  if (!rpc) throw new Error("Not signed in");
  return rpc;
}
