import type { ChatMessage } from '../../state/chat-store'

interface Props {
  message: ChatMessage
}

export function MessageBubble({ message }: Props) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-bg-tertiary border border-border">
        <p className="text-[15px] text-text-primary whitespace-pre-wrap break-words">{message.text}</p>
        {message.isError && message.errorMessage && (
          <p className="text-xs text-error mt-1.5">{message.errorMessage}</p>
        )}
      </div>
    </div>
  )
}
