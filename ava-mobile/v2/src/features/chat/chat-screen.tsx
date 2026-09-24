import { useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChatStore } from '../../state/chat-store'
import { useSessionStore } from '../../state/session-store'
import { useConnectionStore } from '../../state/connection-store'
import { Composer } from '../../components/chat/composer'
import { MessageBubble } from '../../components/chat/message-bubble'
import { AgentTurn } from '../../components/chat/agent-turn'
import { sendRpc } from '../../lib/tauri'
import { ArrowLeft, Loader2, WifiOff } from 'lucide-react'

export function ChatScreen() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { messages, isStreaming, clearMessages } = useChatStore()
  const { sessions, activeSessionId, setActiveSessionId } = useSessionStore()
  const { status } = useConnectionStore()
  const listRef = useRef<HTMLDivElement>(null)
  const currentSessionId = sessionId || activeSessionId
  const session = sessions.find((s) => s.id === currentSessionId)
  const isConnected = status === 'connected'

  useEffect(() => {
    if (sessionId && sessionId !== activeSessionId) {
      setActiveSessionId(sessionId)
      loadSessionMessages(sessionId)
    }
  }, [sessionId])

  const loadSessionMessages = useCallback(async (sessId: string) => {
    try {
      clearMessages()
      const res = await sendRpc('thread/read', { threadId: sessId, includeTurns: true }) as Record<string, unknown>
      const result = (res?.result ?? res) as Record<string, unknown>
      const thread = (result?.thread ?? result) as Record<string, unknown>
      const turns = (thread?.turns ?? []) as Array<Record<string, unknown>>
      if (!Array.isArray(turns)) return

      // Flatten all items from all turns
      const items: Array<Record<string, unknown>> = []
      for (const turn of turns) {
        const turnItems = turn.items ?? []
        if (Array.isArray(turnItems)) items.push(...turnItems)
      }

      for (const item of items) {
        const itemType = item.type as string
        if (itemType === 'userMessage' || itemType === 'user') {
          useChatStore.getState().addMessage({
            id: (item.id as string) ?? `msg-${Date.now()}`,
            sender: 'user',
            text: (item.text as string) ?? '',
            timestamp: new Date(((item.created_at as number) ?? Date.now() / 1000) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            parts: [],
            isPending: false,
            isError: false,
            isCancelled: false,
          })
        } else if (itemType === 'agentMessage' || itemType === 'assistant') {
          useChatStore.getState().addMessage({
            id: (item.id as string) ?? `msg-${Date.now()}`,
            sender: 'agent',
            text: (item.text as string) ?? '',
            timestamp: new Date(((item.created_at as number) ?? Date.now() / 1000) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            parts: [],
            isPending: false,
            isError: false,
            isCancelled: false,
          })
        }
      }
    } catch (e) {
      console.warn('Failed to load session messages:', e)
    }
  }, [clearMessages])

  // Auto-scroll on new messages
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current
      // Only auto-scroll if near bottom
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
      if (isNearBottom || isStreaming) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight
        })
      }
    }
  }, [messages, isStreaming])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-secondary flex-shrink-0">
        <button onClick={() => navigate('/')} className="p-1.5 -ml-1.5 text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-text-primary truncate">
            {session?.name || 'New Chat'}
          </h1>
          {isStreaming ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Loader2 size={12} className="text-accent animate-spin" />
              <span className="text-xs text-accent">Agent is working...</span>
            </div>
          ) : !isConnected ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <WifiOff size={12} className="text-error" />
              <span className="text-xs text-error">Disconnected</span>
            </div>
          ) : null}
        </div>
      </header>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-accent">A</span>
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">AvA</h2>
            <p className="text-sm text-text-secondary">
              {isConnected ? 'Send a message to start' : 'Connect to a server in Settings first'}
            </p>
          </div>
        )}
        {messages.map((msg) =>
          msg.sender === 'user' ? (
            <MessageBubble key={msg.id} message={msg} />
          ) : (
            <AgentTurn key={msg.id} message={msg} />
          )
        )}
      </div>

      {/* Composer */}
      {isConnected && <Composer sessionId={currentSessionId} />}
    </div>
  )
}
