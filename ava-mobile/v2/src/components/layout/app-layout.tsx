import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, MessageSquare, List, Settings } from 'lucide-react'

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/sessions', icon: List, label: 'Sessions' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex flex-col h-full w-full bg-bg-primary">
      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="flex items-center justify-around border-t border-border bg-bg-secondary pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = isActive(tab.path)
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-4 min-w-[64px] min-h-[48px] transition-colors ${
                active ? 'text-accent' : 'text-text-tertiary'
              }`}
            >
              <tab.icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
