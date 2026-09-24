import { useState, useRef } from 'react'
import { useChatStore } from '../../state/chat-store'
import { useStreaming } from '../../features/chat/streaming'
import { ArrowUp, Square } from 'lucide-react'

interface Props {
  sessionId: string | null
}

export function Composer({ sessionId }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isStreaming } = useChatStore()
  const { sendPrompt, stopGeneration } = useStreaming()

  const handleSend = async () => {
    const prompt = text.trim()
    if (!prompt || isStreaming) return
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    await sendPrompt(prompt, sessionId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasText = text.trim().length > 0

  return (
    <div className="flex items-end gap-2 px-4 py-3 border-t border-border bg-bg-secondary pb-[env(safe-area-inset-bottom)]">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          e.target.style.height = 'auto'
          e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
        }}
        onKeyDown={handleKeyDown}
        placeholder="Send a message..."
        rows={1}
        className="flex-1 resize-none rounded-xl bg-bg-tertiary border border-border px-4 py-2.5 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent max-h-[200px]"
      />
      {isStreaming ? (
        <button
          onClick={stopGeneration}
          className="w-10 h-10 rounded-full bg-error flex items-center justify-center flex-shrink-0"
        >
          <Square size={14} className="text-white" fill="white" />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!hasText}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:bg-bg-elevated disabled:text-text-tertiary bg-accent text-white"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  )
}
