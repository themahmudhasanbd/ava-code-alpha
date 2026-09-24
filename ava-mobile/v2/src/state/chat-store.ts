import { create } from 'zustand'

export interface MessagePart {
  id: string
  type: 'text' | 'reasoning' | 'tool' | 'step' | 'subagent'
  text: string
  tool?: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  input?: unknown
  output?: string
  durationMs?: number
  timestamp: number
}

export interface ChatMessage {
  id: string
  sender: 'user' | 'agent'
  text: string
  timestamp: string
  parentId?: string
  turnId?: string
  parts: MessagePart[]
  isPending: boolean
  isError: boolean
  isCancelled: boolean
  errorMessage?: string
  reasoningText?: string
  modelName?: string
}

interface ChatState {
  messages: ChatMessage[]
  activePendingId: string | null
  activeTurnId: string | null
  isStreaming: boolean
  addMessage: (msg: ChatMessage) => void
  updateMessage: (id: string, update: Partial<ChatMessage> | ((msg: ChatMessage) => Partial<ChatMessage>)) => void
  replaceMessage: (id: string, replacement: ChatMessage) => void
  clearMessages: () => void
  setActivePendingId: (id: string | null) => void
  setActiveTurnId: (id: string | null) => void
  setStreaming: (streaming: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  activePendingId: null,
  activeTurnId: null,
  isStreaming: false,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, update) =>
    set((s) => ({
      messages: s.messages.map((msg) => {
        if (msg.id !== id) return msg
        const patch = typeof update === 'function' ? update(msg) : update
        return { ...msg, ...patch }
      }),
    })),
  replaceMessage: (id, replacement) =>
    set((s) => ({
      messages: s.messages.map((msg) => (msg.id === id ? replacement : msg)),
    })),
  clearMessages: () => set({ messages: [], activePendingId: null, activeTurnId: null, isStreaming: false }),
  setActivePendingId: (activePendingId) => set({ activePendingId }),
  setActiveTurnId: (activeTurnId) => set({ activeTurnId }),
  setStreaming: (isStreaming) => set({ isStreaming }),
}))
