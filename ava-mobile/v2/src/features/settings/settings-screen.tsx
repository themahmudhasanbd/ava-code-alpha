import { useState, useEffect } from 'react'
import { useSettingsStore } from '../../state/settings-store'
import { useConnectionStore } from '../../state/connection-store'
import { useSessionStore } from '../../state/session-store'
import { connect, disconnect } from '../../lib/tauri'
import { fetchSessions, fetchModels } from '../../api/client'
import { Wifi, WifiOff, Server, Check, X, RefreshCw } from 'lucide-react'

export function SettingsScreen() {
  const settings = useSettingsStore()
  const { status, setStatus, setError, error: connError } = useConnectionStore()
  const sessions = useSessionStore()
  const [serverInput, setServerInput] = useState(settings.serverUrl)
  const [userInput, setUserInput] = useState(settings.username)
  const [passInput, setPassInput] = useState(settings.password)
  const [connecting, setConnecting] = useState(false)
  const isConnected = status === 'connected'

  // Auto-connect on mount if we have saved credentials
  useEffect(() => {
    if (settings.serverUrl && settings.username && !isConnected && status === 'disconnected') {
      setServerInput(settings.serverUrl)
      setUserInput(settings.username)
      setPassInput(settings.password)
    }
  }, [])

  const fetchSessionsAndModels = async () => {
    try {
      const mapped = await fetchSessions()
      sessions.setSessions(mapped)
    } catch (e) {
      console.warn('Failed to fetch sessions:', e)
    }
    try {
      const models = await fetchModels()
      if (models.length > 0 && !settings.selectedModel) {
        settings.setSelectedModel(models[0].id)
      }
    } catch (e) {
      console.warn('Failed to fetch models:', e)
    }
  }

  const handleConnect = async () => {
    if (!serverInput.trim()) return
    setConnecting(true)
    setError(null)
    try {
      settings.setServerUrl(serverInput.trim())
      settings.setCredentials(userInput, passInput)
      setStatus('connecting')
      await connect({ serverUrl: serverInput.trim(), username: userInput, password: passInput })
      setStatus('connected')
      // Fetch sessions and models after connecting
      await fetchSessionsAndModels()
    } catch (e) {
      setStatus('disconnected')
      setError(String(e))
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
    } catch { /* ignore */ }
    setStatus('disconnected')
    sessions.setSessions([])
  }

  return (
    <div className="h-full overflow-y-auto p-5 space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">Settings</h1>

      {/* Connection */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
          <Server size={14} /> Server Connection
        </h2>
        <div className="space-y-3 p-4 rounded-xl bg-bg-secondary border border-border">
          <input
            type="url"
            placeholder="Server URL (e.g. https://ava.example.com)"
            value={serverInput}
            onChange={(e) => setServerInput(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
          <input
            type="text"
            placeholder="Username"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            placeholder="Password"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConnect() }}
            className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />

          {connError && (
            <p className="text-xs text-error px-1">{connError}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            {isConnected ? (
              <>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-error/10 text-error text-sm font-medium"
                >
                  <WifiOff size={14} /> Disconnect
                </button>
                <button
                  onClick={fetchSessionsAndModels}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary text-text-secondary text-sm"
                >
                  <RefreshCw size={14} /> Sync
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting || !serverInput.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40"
              >
                {connecting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Wifi size={14} />
                )}
                Connect
              </button>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              {isConnected ? <Check size={14} className="text-success" /> : <X size={14} className="text-error" />}
              <span className="text-xs text-text-tertiary">{isConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Model */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary">Default Model</h2>
        <div className="p-4 rounded-xl bg-bg-secondary border border-border">
          <input
            type="text"
            placeholder="Model ID (e.g. gpt-4o)"
            value={settings.selectedModel}
            onChange={(e) => settings.setSelectedModel(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
          <div className="flex items-center gap-2 mt-3">
            {(['low', 'medium', 'high'] as const).map((effort) => (
              <button
                key={effort}
                onClick={() => settings.setReasoningEffort(effort)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  settings.reasoningEffort === effort
                    ? 'bg-accent text-white'
                    : 'bg-bg-tertiary text-text-secondary border border-border'
                }`}
              >
                {effort.charAt(0).toUpperCase() + effort.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary">Appearance</h2>
        <div className="p-4 rounded-xl bg-bg-secondary border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-primary">Dark Mode</span>
            <button
              onClick={() => settings.setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.theme === 'dark' ? 'bg-accent' : 'bg-bg-elevated'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.theme === 'dark' ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="text-center pt-4 pb-8">
        <p className="text-xs text-text-tertiary">AvA Mobile v0.1.0</p>
        <p className="text-xs text-text-tertiary mt-0.5">Tauri 2 + React + TypeScript + Rust</p>
      </section>
    </div>
  )
}
