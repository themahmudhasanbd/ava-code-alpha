import { useState } from 'react'
import type { MessagePart } from '../../state/chat-store'
import { ChevronDown, ChevronRight, Terminal, FileCode, Search, Globe, Loader2, Check, X } from 'lucide-react'

interface Props {
  part: MessagePart
}

const TOOL_ICONS: Record<string, typeof Terminal> = {
  command: Terminal,
  file_change: FileCode,
  search: Search,
  web_search: Globe,
}

const STATUS_COLORS = {
  running: 'text-accent',
  completed: 'text-success',
  failed: 'text-error',
}

export function ToolCard({ part }: Props) {
  const [expanded, setExpanded] = useState(part.status === 'running')
  const Icon = TOOL_ICONS[part.tool ?? ''] ?? Terminal
  const statusColor = STATUS_COLORS[part.status]

  return (
    <div className="rounded-xl bg-bg-secondary border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left"
      >
        {expanded ? <ChevronDown size={14} className="text-text-tertiary" /> : <ChevronRight size={14} className="text-text-tertiary" />}
        <Icon size={14} className={statusColor} />
        <span className="text-xs font-medium text-text-primary flex-1 truncate">{part.tool ?? 'tool'}</span>
        {part.status === 'running' && <Loader2 size={12} className="text-accent animate-spin" />}
        {part.status === 'completed' && <Check size={12} className="text-success" />}
        {part.status === 'failed' && <X size={12} className="text-error" />}
      </button>
      {expanded && part.output && (
        <div className="px-3 pb-3 pt-0">
          <pre className="text-[12px] font-mono text-text-secondary bg-bg-tertiary rounded-lg p-2.5 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
            {part.output}
          </pre>
        </div>
      )}
    </div>
  )
}
