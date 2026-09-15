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
    // NEW: agent support
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
  const isStaff = message.sender === 'staff'
  const isSystem = message.sender === 'system'
  const hasAgent = !!message.agent

  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  // System messages (welcome, etc.)
  if (isSystem && !hasAgent) {
    return (
      <div className="flex justify-center my-4 animate-fadeIn">
        <div className="text-xs text-gray-600 bg-gray-100 px-4 py-2 rounded-full shadow-sm">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex gap-2 mb-4 animate-slideUp',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {/* Agent / Staff Avatar (left side) */}
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          {hasAgent && message.agent?.image ? (
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200">
              <Image
                src={message.agent.image}
                alt={message.agent.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
              {hasAgent
                ? message.agent?.name?.charAt(0).toUpperCase()
                : 'C'}
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          'max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl shadow-md backdrop-blur-sm',
          isUser
            ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-br-none'
            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none',
        )}
      >
        {/* Sender name */}
        {!isUser && (
          <div className="text-xs font-semibold mb-1.5 text-teal-600 flex items-center gap-1.5">
            {hasAgent ? (
              <>
                <span>{message.agent?.name}</span>
                <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
                  Agent
                </span>
              </>
            ) : (
              message.senderName || 'CustomerCare'
            )}
          </div>
        )}

        <p className="text-sm break-words leading-relaxed">{message.content}</p>

        <div
          className={cn(
            'text-xs mt-2 flex items-center gap-1',
            isUser ? 'text-white/80' : 'text-gray-500',
          )}
        >
          <span>{formatTime(message.timestamp)}</span>

          {/* Read receipts - only for user's own messages */}
          {isUser && (
            message.is_read ? (
              <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> // Blue double tick = read
            ) : (
              <Check className="w-3.5 h-3.5 text-white/70" /> // Grey single tick = sent
            )
          )}
        </div>
      </div>
    </div>
  )
}