import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  serverUrl: string
  username: string
  password: string
  workspacePath: string
  selectedModel: string
  reasoningEffort: 'low' | 'medium' | 'high'
  theme: 'dark' | 'light'
  setServerUrl: (url: string) => void
  setCredentials: (username: string, password: string) => void
  setWorkspacePath: (path: string) => void
  setSelectedModel: (model: string) => void
  setReasoningEffort: (effort: 'low' | 'medium' | 'high') => void
  setTheme: (theme: 'dark' | 'light') => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      serverUrl: '',
      username: '',
      password: '',
      workspacePath: '/',
      selectedModel: '',
      reasoningEffort: 'medium',
      theme: 'dark',
      setServerUrl: (serverUrl) => set({ serverUrl }),
      setCredentials: (username, password) => set({ username, password }),
      setWorkspacePath: (workspacePath) => set({ workspacePath }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      setReasoningEffort: (reasoningEffort) => set({ reasoningEffort }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'ava-settings' }
  )
)
