import { cn } from '@/lib/utils'
import { Check, CheckCheck } from 'lucide-react'
import Image from 'next/image'

interface MessageBubbleProps {
  message: {
    id: string
    sender: 'user' | 'staff' | 'system'
    content: string
    timestamp: string
    senderName?: string
    is_read?: boolean
    agent?: {
      id: number
      name: string
      image?: string | null
    } | null
  }
  isCurrentUser?: boolean
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const isUser = message.sender === 'user'
  const hasAgent = !!message.agent
  const isSystem = message.sender === 'system'

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  if (isSystem && !hasAgent) {
    return (
      <div className="flex justify-center my-4 animate-fadeIn">
        <div className="text-xs text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-4 py-2 rounded-full">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2 mb-4 animate-slideUp', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          {hasAgent && message.agent?.image ? (
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-zinc-700">
              <Image src={message.agent.image} alt={message.agent.name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
              {hasAgent ? message.agent?.name?.charAt(0).toUpperCase() : 'C'}
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          'max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl shadow-md',
          isUser
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-none'
            : 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 rounded-bl-none',
        )}
      >
        {!isUser && (
          <div className="text-xs font-semibold mb-1.5 text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
            {hasAgent ? (
              <>
                <span>{message.agent?.name}</span>
                <span className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 px-1.5 py-0.5 rounded-full">Agent</span>
              </>
            ) : (
              message.senderName || 'CustomerCare'
            )}
          </div>
        )}

        <p className="text-sm break-words leading-relaxed">{message.content}</p>

        <div className={cn('text-xs mt-2 flex items-center gap-1', isUser ? 'text-white/80' : 'text-slate-500 dark:text-zinc-400')}>
          <span>{formatTime(message.timestamp)}</span>
          {isUser && (message.is_read ? <CheckCheck className="w-3.5 h-3.5 text-blue-200" /> : <Check className="w-3.5 h-3.5 text-white/70" />)}
        </div>
      </div>
    </div>
  )
}
