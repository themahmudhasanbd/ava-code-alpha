import { useState } from 'react'
import type { ChatMessage } from '../../state/chat-store'
import { ToolCard } from './tool-card'
import { ChevronDown, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'

interface Props {
  message: ChatMessage
}

export function AgentTurn({ message }: Props) {
  const [reasoningOpen, setReasoningOpen] = useState(false)
  const hasReasoning = message.reasoningText && message.reasoningText.trim().length > 0
  const toolParts = message.parts.filter((p) => p.type === 'tool')
  const textParts = message.parts.filter((p) => p.type === 'text')
  const reasoningParts = message.parts.filter((p) => p.type === 'reasoning')
  const isRunning = message.isPending

  return (
    <div className="space-y-2">
      {/* Agent header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center">
          <span className="text-xs font-bold text-accent">A</span>
        </div>
        <span className="text-xs font-medium text-text-secondary">AvA</span>
        {message.modelName && <span className="text-[11px] text-text-tertiary">{message.modelName}</span>}
        {isRunning && <Loader2 size={12} className="text-accent animate-spin ml-auto" />}
      </div>

      {/* Reasoning */}
      {hasReasoning && (
        <button
          onClick={() => setReasoningOpen(!reasoningOpen)}
          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          {reasoningOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Reasoning</span>
          {reasoningParts.some((p) => p.status === 'running') && (
            <Loader2 size={10} className="animate-spin" />
          )}
        </button>
      )}
      {hasReasoning && reasoningOpen && (
        <div className="ml-2 pl-3 border-l-2 border-border-light">
          <p className="text-[13px] text-text-secondary whitespace-pre-wrap">{message.reasoningText}</p>
        </div>
      )}

      {/* Tool cards */}
      {toolParts.map((part) => (
        <ToolCard key={part.id} part={part} />
      ))}

      {/* Text content */}
      {textParts.map((part) => (
        <div key={part.id} className="text-[15px] text-text-primary whitespace-pre-wrap break-words">
          {part.text}
        </div>
      ))}

      {/* Fallback: show text if no parts */}
      {message.parts.length === 0 && message.text && (
        <div className="text-[15px] text-text-primary whitespace-pre-wrap break-words">
          {message.text}
        </div>
      )}

      {/* Error */}
      {message.isError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-error/10 border border-error/20">
          <AlertCircle size={16} className="text-error flex-shrink-0 mt-0.5" />
          <p className="text-sm text-error">{message.errorMessage || 'An error occurred'}</p>
        </div>
      )}

      {/* Cancelled */}
      {message.isCancelled && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20">
          <AlertCircle size={16} className="text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-warning">Turn stopped by user</p>
        </div>
      )}
    </div>
  )
}
