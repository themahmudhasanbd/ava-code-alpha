import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../../state/session-store'
import { useConnectionStore } from '../../state/connection-store'
import { sendRpc } from '../../lib/tauri'
import { fetchSessions } from '../../api/client'
import { MessageSquare, Plus, Trash2, RefreshCw } from 'lucide-react'

export function SessionsScreen() {
  const navigate = useNavigate()
  const { sessions, removeSession, setSessions, isLoading, setLoading } = useSessionStore()
  const { status } = useConnectionStore()
  const isConnected = status === 'connected'

  const handleRefresh = async () => {
    if (!isConnected) return
    setLoading(true)
    try {
      const mapped = await fetchSessions()
      setSessions(mapped)
    } catch (e) {
      console.warn('Failed to fetch sessions:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    removeSession(id)
    try {
      await sendRpc('thread/delete', { thread_id: id })
    } catch { /* already removed locally */ }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
        <h1 className="text-base font-semibold text-text-primary">Sessions</h1>
        <div className="flex items-center gap-2">
          {isConnected && (
            <button onClick={handleRefresh} className="p-2 text-text-secondary hover:text-text-primary transition-colors">
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
          <button
            onClick={() => navigate('/chat')}
            disabled={!isConnected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium disabled:opacity-40"
          >
            <Plus size={14} /> New
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare size={40} className="text-text-tertiary mb-3" />
            <p className="text-sm text-text-secondary">{isConnected ? 'No sessions' : 'Not connected'}</p>
            <p className="text-xs text-text-tertiary mt-1">{isConnected ? 'Create a new chat to get started' : 'Connect to a server in Settings'}</p>
          </div>
        )}

        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary border border-border hover:border-accent/30 transition-colors"
          >
            <button
              onClick={() => navigate(`/chat/${session.id}`)}
              className="flex-1 flex items-center gap-3 text-left min-w-0"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${session.status === 'running' ? 'bg-success animate-pulse-dot' : 'bg-text-tertiary'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{session.name}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{new Date(session.updatedAt).toLocaleString()}</p>
              </div>
            </button>
            <button
              onClick={() => handleDelete(session.id)}
              className="p-2 text-text-tertiary hover:text-error transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
