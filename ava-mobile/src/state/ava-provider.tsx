import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { clearAuth, loadAuth, saveAuth, type AuthState } from "@/core/auth";
import { RpcClient } from "@/core/rpc-client";
import { storage } from "@/core/storage";
import { APP } from "@/config/app";
import type { ConnectionStatus } from "@/core/types";

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

  useEffect(() => {
    if (!rpc) return;
    const offStatus = rpc.onStatus(setStatus);
    
    // Global notification listener to accurately track running turns across any session/thread
    const offEvents = rpc.on(({ method, params }) => {
      const threadId = params?.threadId ?? params?.thread_id ?? params?.thread?.id;
      if (!threadId) return;

      if (
        method === "turn/started" ||
        method === "turn/start" ||
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
  }, [rpc]);

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
