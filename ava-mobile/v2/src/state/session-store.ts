import { create } from 'zustand'

export interface Session {
  id: string
  name: string
  status: 'idle' | 'running' | 'error'
  createdAt: number
  updatedAt: number
}

interface SessionState {
  sessions: Session[]
  activeSessionId: string | null
  isLoading: boolean
  error: string | null
  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  updateSession: (id: string, update: Partial<Session>) => void
  removeSession: (id: string) => void
  setActiveSessionId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,
  isLoading: false,
  error: null,
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
  updateSession: (id, update) =>
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, ...update } : sess)),
    })),
  removeSession: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== id),
      activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
    })),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
