import { sendRpc } from '../lib/tauri'
import type { Session } from '../state/session-store'

export async function fetchSessions(): Promise<Session[]> {
  const res = await sendRpc('thread/list', { limit: 100 }) as Record<string, unknown>
  const threads = (res?.data ?? res?.threads ?? []) as Array<Record<string, unknown>>
  if (!Array.isArray(threads)) return []
  return threads.map((t) => ({
    id: (t.id ?? t.thread_id) as string,
    name: (t.name as string) ?? (t.preview as string) ?? `Session ${((t.id as string) ?? '').slice(0, 8)}`,
    status: ((t.status as Record<string, unknown>)?.type === 'running' ? 'running' : 'idle') as 'running' | 'idle',
    createdAt: ((t.createdAt as number) ?? (t.created_at as number) ?? Date.now() / 1000) * (t.createdAt && t.createdAt > 1e12 ? 1 : 1000),
    updatedAt: ((t.updatedAt as number) ?? (t.updated_at as number) ?? Date.now() / 1000) * (t.updatedAt && t.updatedAt > 1e12 ? 1 : 1000),
  }))
}

export async function fetchModels(): Promise<Array<{ id: string; name: string; reasoning: boolean }>> {
  const res = await sendRpc('model/list', {}) as Record<string, unknown>
  const models = (res?.data ?? res?.models ?? []) as Array<Record<string, unknown>>
  if (!Array.isArray(models)) return []
  return models.map((m) => ({
    id: (m.id ?? m.model) as string,
    name: (m.displayName ?? m.name ?? m.id) as string,
    reasoning: Array.isArray(m.supportedReasoningEfforts) && m.supportedReasoningEfforts.length > 0,
  }))
}
