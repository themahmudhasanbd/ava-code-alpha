import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/app-layout'
import { HomeScreen } from './features/home/home-screen'
import { ChatScreen } from './features/chat/chat-screen'
import { SessionsScreen } from './features/sessions/sessions-screen'
import { SettingsScreen } from './features/settings/settings-screen'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/chat" element={<ChatScreen />} />
        <Route path="/chat/:sessionId" element={<ChatScreen />} />
        <Route path="/sessions" element={<SessionsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
