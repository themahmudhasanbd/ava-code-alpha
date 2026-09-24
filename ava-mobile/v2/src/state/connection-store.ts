import { create } from 'zustand'

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error'

interface ConnectionState {
  status: ConnectionStatus
  serverUrl: string
  error: string | null
  setStatus: (status: ConnectionStatus) => void
  setServerUrl: (url: string) => void
  setError: (error: string | null) => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  serverUrl: '',
  error: null,
  setStatus: (status) => set({ status }),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setError: (error) => set({ error }),
}))
