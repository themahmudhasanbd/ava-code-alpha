import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { clearAuth, loadAuth, saveAuth, type AuthState } from "@/core/auth";
import { RpcClient } from "@/core/rpc-client";
import { storage } from "@/core/storage";
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
  modelId: string;
  setModelId: (id: string) => void;
  effort: string;
  setEffort: (v: string) => void;
  sandbox: string;
  setSandbox: (v: string) => void;
  signIn: (a: AuthState) => void;
  signOut: () => void;
}

const AvaContext = createContext<AvaContextValue | null>(null);
const MODEL_KEY = "ava.model";
const EFFORT_KEY = "ava.effort";
const SANDBOX_KEY = "ava.sandbox";

export function AvaProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("offline");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [workingSessionId, setWorkingSessionId] = useState<string | null>(null);
  const [modelId, setModelIdState] = useState("");
  const [effort, setEffortState] = useState("medium");
  const [sandbox, setSandboxState] = useState("danger-full-access");

  useEffect(() => {
    setAuth(loadAuth());
    setModelIdState(storage.get(MODEL_KEY) ?? "");
    setEffortState(storage.get(EFFORT_KEY) ?? "medium");
    setSandboxState(storage.get(SANDBOX_KEY) ?? "danger-full-access");
    setReady(true);
  }, []);

  const rpc = useMemo(() => (auth ? new RpcClient(auth.serverUrl, auth.token) : null), [auth]);

  useEffect(() => {
    if (!rpc) return;
    const off = rpc.onStatus(setStatus);
    rpc.connect().catch(() => {});
    return () => {
      off();
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

  const signIn = useCallback((a: AuthState) => {
    saveAuth(a);
    setAuth(a);
  }, []);

  const signOut = useCallback(() => {
    clearAuth();
    setAuth(null);
    setActiveSessionId(null);
  }, []);

  return (
    <AvaContext.Provider
      value={{ ready, auth, rpc, status, activeSessionId, setActiveSessionId, workingSessionId, setWorkingSessionId, modelId, setModelId, effort, setEffort, sandbox, setSandbox, signIn, signOut }}
    >
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
