import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConnectionStore } from '../../state/connection-store'
import { useSessionStore } from '../../state/session-store'
import { useSettingsStore } from '../../state/settings-store'
import { connect, tauriListen, EVENTS } from '../../lib/tauri'
import { fetchSessions } from '../../api/client'
import { MessageSquare, Plus, Wifi, WifiOff, Settings } from 'lucide-react'

export function HomeScreen() {
  const navigate = useNavigate()
  const { status, setStatus, setError } = useConnectionStore()
  const { sessions, setSessions } = useSessionStore()
  const settings = useSettingsStore()
  const recentSessions = sessions.slice(0, 5)
  const isConnected = status === 'connected'

  // Auto-connect on mount and listen for connection status events
  useEffect(() => {
    // Listen for connection status changes from Rust backend
    tauriListen<Record<string, string>>(EVENTS.CONNECTION_STATUS, ({ payload }) => {
      const newStatus = payload.status as string
      if (newStatus === 'connected') setStatus('connected')
      else if (newStatus === 'disconnected') setStatus('disconnected')
      else if (newStatus === 'connecting') setStatus('connecting')
      else if (newStatus === 'reconnecting') setStatus('reconnecting')
    })

    if (settings.serverUrl && settings.username && status === 'disconnected') {
      autoConnect()
    }
  }, [])

  const autoConnect = async () => {
    try {
      setStatus('connecting')
      await connect({
        serverUrl: settings.serverUrl,
        username: settings.username,
        password: settings.password,
      })
      setStatus('connected')
      try {
        const mapped = await fetchSessions()
        setSessions(mapped)
      } catch { /* non-critical */ }
    } catch (e) {
      setStatus('disconnected')
      setError(String(e))
    }
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      {/* Connection status */}
      <button
        onClick={() => navigate('/settings')}
        className={`flex items-center gap-3 p-4 rounded-xl mb-6 w-full text-left transition-colors ${isConnected ? 'bg-success/10 border border-success/20' : 'bg-warning/10 border border-warning/20'}`}
      >
        {isConnected ? <Wifi size={18} className="text-success" /> : <WifiOff size={18} className="text-warning" />}
        <div className="flex-1">
          <p className={`text-sm font-medium ${isConnected ? 'text-success' : 'text-warning'}`}>
            {isConnected ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Not Connected'}
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">
            {isConnected ? settings.serverUrl : 'Tap to configure server'}
          </p>
        </div>
        <Settings size={16} className="text-text-tertiary" />
      </button>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => navigate('/chat')}
          disabled={!isConnected}
          className="flex flex-col items-center gap-2 p-5 rounded-xl bg-bg-secondary border border-border hover:border-accent/40 transition-colors disabled:opacity-40"
        >
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <Plus size={20} className="text-accent" />
          </div>
          <span className="text-sm font-medium text-text-primary">New Chat</span>
        </button>
        <button
          onClick={() => navigate('/sessions')}
          className="flex flex-col items-center gap-2 p-5 rounded-xl bg-bg-secondary border border-border hover:border-accent/40 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <MessageSquare size={20} className="text-accent" />
          </div>
          <span className="text-sm font-medium text-text-primary">Sessions ({sessions.length})</span>
        </button>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">Recent Sessions</h2>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => navigate(`/chat/${session.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-bg-secondary border border-border hover:border-accent/30 transition-colors text-left"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${session.status === 'running' ? 'bg-success animate-pulse-dot' : 'bg-text-tertiary'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{session.name}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{new Date(session.updatedAt).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {recentSessions.length === 0 && isConnected && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare size={40} className="text-text-tertiary mb-3" />
          <p className="text-sm text-text-secondary">No sessions yet</p>
          <p className="text-xs text-text-tertiary mt-1">Start a new chat to begin</p>
        </div>
      )}
    </div>
  )
}
