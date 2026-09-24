import { useCallback, useRef } from 'react'
import { useChatStore, type MessagePart } from '../../state/chat-store'
import { useSessionStore } from '../../state/session-store'
import { useSettingsStore } from '../../state/settings-store'
import { sendRpc, tauriListen, EVENTS } from '../../lib/tauri'

export function useStreaming() {
  const chat = useChatStore()
  const sessions = useSessionStore()
  const settings = useSettingsStore()
  const unlistenRef = useRef<(() => void) | null>(null)

  const sendPrompt = useCallback(async (prompt: string, sessionId?: string | null) => {
    if (!prompt.trim() || chat.isStreaming) return

    const userMsgId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const pendingId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    chat.addMessage({
      id: userMsgId, sender: 'user', text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      parts: [], isPending: false, isError: false, isCancelled: false,
    })

    chat.addMessage({
      id: pendingId, sender: 'agent', text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      parentId: userMsgId, parts: [], isPending: true, isError: false, isCancelled: false,
      modelName: settings.selectedModel || undefined,
    })

    chat.setActivePendingId(pendingId)
    chat.setStreaming(true)

    let accumulatedText = ''
    let accumulatedReasoning = ''
    const liveParts = new Map<string, MessagePart>()
    let currentTurnId: string | null = null

    try {
      const unlisten = await tauriListen<Record<string, unknown>>(EVENTS.RPC_NOTIFICATION, ({ payload }) => {
        const method = payload.method as string ?? ''
        const params = (payload.params ?? payload) as Record<string, unknown>
        const eventThreadId = params.threadId as string | undefined
        const activeSid = useSessionStore.getState().activeSessionId
        if (eventThreadId && activeSid && eventThreadId !== activeSid) return

        switch (method) {
          case 'turn/started': {
            currentTurnId = (params.turn as Record<string, unknown>)?.id as string ?? params.turnId as string ?? null
            if (currentTurnId) useChatStore.getState().setActiveTurnId(currentTurnId)
            break
          }

          case 'item/started': {
            const item = params.item as Record<string, unknown>
            if (!item) break
            const itemType = item.type as string
            const itemId = (item.id as string) ?? `item-${Date.now()}`

            if (itemType === 'agentMessage') {
              liveParts.set(itemId, {
                id: itemId, type: 'text', text: (item.text as string) ?? '',
                status: 'running', timestamp: Date.now(),
              })
              if (item.text) accumulatedText = item.text as string
            } else if (itemType === 'reasoning') {
              liveParts.set(itemId, {
                id: itemId, type: 'reasoning', text: '', status: 'running', timestamp: Date.now(),
              })
            } else if (itemType === 'commandExecution') {
              liveParts.set(itemId, {
                id: itemId, type: 'tool', text: '', tool: (item.command as string) ?? 'command',
                status: 'running', input: { command: item.command, cwd: item.cwd }, timestamp: Date.now(),
              })
            } else if (itemType === 'fileChange') {
              liveParts.set(itemId, {
                id: itemId, type: 'tool', text: '', tool: 'file_change',
                status: 'running', input: { path: item.path ?? item.filePath }, timestamp: Date.now(),
              })
            } else if (itemType === 'mcpToolCall' || itemType === 'dynamicToolCall' || itemType === 'collabAgentToolCall') {
              liveParts.set(itemId, {
                id: itemId, type: 'tool', text: '',
                tool: (item.tool ?? item.name ?? 'tool') as string,
                status: 'running', input: item.args ?? item.input ?? item.arguments, timestamp: Date.now(),
              })
            } else if (itemType === 'plan') {
              liveParts.set(itemId, {
                id: itemId, type: 'step', text: (item.text as string) ?? '',
                status: 'running', timestamp: Date.now(),
              })
            } else if (itemType === 'subAgentActivity') {
              liveParts.set(itemId, {
                id: itemId, type: 'subagent', text: (item.agentPath as string) ?? '',
                tool: 'agent', status: 'running', timestamp: Date.now(),
              })
            }
            chat.updateMessage(pendingId, { parts: Array.from(liveParts.values()), isPending: true })
            break
          }

          case 'item/agentMessage/delta': {
            const delta = params.delta as string ?? ''
            if (delta) {
              accumulatedText += delta
              for (const [id, part] of liveParts) {
                if (part.type === 'text') { liveParts.set(id, { ...part, text: accumulatedText, status: 'running' }); break }
              }
              chat.updateMessage(pendingId, { text: accumulatedText, parts: Array.from(liveParts.values()), isPending: true })
            }
            break
          }

          case 'item/reasoning/textDelta':
          case 'item/reasoning/summaryTextDelta': {
            const delta = params.delta as string ?? ''
            if (delta) {
              accumulatedReasoning += delta
              for (const [id, part] of liveParts) {
                if (part.type === 'reasoning') { liveParts.set(id, { ...part, text: accumulatedReasoning, status: 'running' }); break }
              }
              chat.updateMessage(pendingId, { reasoningText: accumulatedReasoning, parts: Array.from(liveParts.values()), isPending: true })
            }
            break
          }

          case 'item/commandExecution/outputDelta': {
            const delta = params.delta as string ?? ''
            const itemId = params.itemId as string
            if (delta && itemId && liveParts.has(itemId)) {
              const part = liveParts.get(itemId)!
              liveParts.set(itemId, { ...part, output: (part.output ?? '') + delta, status: 'running' })
              chat.updateMessage(pendingId, { parts: Array.from(liveParts.values()), isPending: true })
            }
            break
          }

          case 'item/fileChange/patchUpdated': {
            const itemId = params.itemId as string
            const changes = params.changes ?? params.patch
            if (itemId && liveParts.has(itemId)) {
              const part = liveParts.get(itemId)!
              liveParts.set(itemId, { ...part, output: typeof changes === 'string' ? changes : JSON.stringify(changes), status: 'running' })
              chat.updateMessage(pendingId, { parts: Array.from(liveParts.values()), isPending: true })
            }
            break
          }

          case 'item/completed': {
            const item = params.item as Record<string, unknown>
            if (item) {
              const itemId = item.id as string
              if (itemId && liveParts.has(itemId)) {
                const part = liveParts.get(itemId)!
                const output = (item.aggregatedOutput ?? item.output ?? item.result ?? part.output) as string | undefined
                const text = (item.text as string) || part.text
                liveParts.set(itemId, { ...part, status: 'completed', output: output ?? undefined, text, durationMs: (item.durationMs as number) ?? undefined })
                if (part.type === 'text' && text) accumulatedText = text
                chat.updateMessage(pendingId, {
                  text: accumulatedText || chat.messages.find(m => m.id === pendingId)?.text || '',
                  parts: Array.from(liveParts.values()), reasoningText: accumulatedReasoning || undefined, isPending: true,
                })
              }
            }
            break
          }

          case 'turn/completed': {
            const turn = params.turn as Record<string, unknown>
            if (turn?.items && Array.isArray(turn.items)) {
              for (const item of turn.items) {
                const it = item as Record<string, unknown>
                if (it.type === 'agentMessage' && it.text) {
                  const itId = it.id as string
                  if (itId && liveParts.has(itId)) liveParts.set(itId, { ...liveParts.get(itId)!, text: it.text as string, status: 'completed' })
                  accumulatedText = it.text as string
                }
              }
            }
            finalizeTurn(false)
            break
          }

          case 'error': {
            const errObj = params.error as Record<string, unknown>
            const errMsg = errObj?.message as string ?? params.message as string ?? 'An error occurred'
            if (params.willRetry !== true) finalizeTurn(true, errMsg)
            break
          }

          default: break
        }
      })

      unlistenRef.current = unlisten

      let threadId = sessionId || sessions.activeSessionId
      if (!threadId) {
        const threadRes = await sendRpc('thread/start', {
          cwd: settings.workspacePath || '/',
          ...(settings.selectedModel ? { model: settings.selectedModel } : {}),
        }) as Record<string, unknown>
        const thread = threadRes?.thread as Record<string, unknown>
        threadId = thread?.id as string
        if (threadId) {
          sessions.setActiveSessionId(threadId)
          sessions.addSession({
            id: threadId, name: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
            status: 'running', createdAt: Date.now(), updatedAt: Date.now(),
          })
        }
      }
      if (!threadId) throw new Error('Failed to create or find session')

      await sendRpc('turn/start', {
        threadId: threadId,
        input: [{ type: 'text', text: prompt }],
        ...(settings.selectedModel ? { model: settings.selectedModel } : {}),
        ...(settings.reasoningEffort ? { effort: settings.reasoningEffort } : {}),
      })
      sessions.updateSession(threadId, { status: 'running', updatedAt: Date.now() })

    } catch (err) {
      chat.updateMessage(pendingId, {
        isPending: false, isError: true, errorMessage: String(err),
        text: accumulatedText || 'Failed to send prompt.',
        parts: Array.from(liveParts.values()).map(p => p.status === 'running' ? { ...p, status: 'failed' as const } : p),
      })
      chat.setStreaming(false)
      chat.setActivePendingId(null)
      unlistenRef.current?.()
    }

    function finalizeTurn(isError: boolean, errorMsg?: string) {
      const finalParts = Array.from(liveParts.values()).map(p =>
        p.status === 'running' ? { ...p, status: (isError ? 'failed' : 'completed') as 'failed' | 'completed' } : p
      )
      chat.updateMessage(pendingId, {
        isPending: false, isError, errorMessage: errorMsg,
        text: accumulatedText || (isError ? 'An error occurred.' : 'Task completed.'),
        reasoningText: accumulatedReasoning || undefined, parts: finalParts,
        turnId: currentTurnId ?? undefined,
      })
      chat.setStreaming(false)
      chat.setActivePendingId(null)
      chat.setActiveTurnId(null)
      unlistenRef.current?.()
      const activeId = sessions.activeSessionId
      if (activeId) sessions.updateSession(activeId, { status: isError ? 'error' : 'idle', updatedAt: Date.now() })
    }
  }, [chat, sessions, settings])

  const stopGeneration = useCallback(async () => {
    const activeId = sessions.activeSessionId
    const turnId = useChatStore.getState().activeTurnId
    if (activeId) {
      try {
        await sendRpc('turn/interrupt', { threadId: activeId, ...(turnId ? { turnId: turnId } : {}) })
      } catch { /* ignore */ }
    }
    const pendingId = chat.activePendingId
    if (pendingId) {
      const msg = chat.messages.find(m => m.id === pendingId)
      chat.updateMessage(pendingId, {
        isPending: false, isCancelled: true,
        text: msg?.text || 'Turn stopped by user.',
        parts: msg?.parts.map(p => p.status === 'running' ? { ...p, status: 'cancelled' as const } : p) ?? [],
      })
    }
    chat.setStreaming(false)
    chat.setActivePendingId(null)
    chat.setActiveTurnId(null)
    unlistenRef.current?.()
    if (activeId) sessions.updateSession(activeId, { status: 'idle', updatedAt: Date.now() })
  }, [chat, sessions])

  return { sendPrompt, stopGeneration }
}
