import { cn } from '@/lib/utils'
import { Check, CheckCheck } from 'lucide-react'

interface MessageBubbleProps {
  message: {
    id: string
    sender: 'user' | 'staff' | 'system'
    content: string
    timestamp: string
    senderName?: string
    is_read?: boolean
  }
  isCurrentUser?: boolean
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const isUser = message.sender === 'user'
  const isStaff = message.sender === 'staff'
  const isSystem = message.sender === 'system'

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

  if (isSystem) {
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
      <div
        className={cn(
          'max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl shadow-md backdrop-blur-sm',
          isUser
            ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-br-none'
            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none',
        )}
      >
        {/* Changed: Always show "CustomerCare" for staff messages */}
        {isStaff && (
          <div className="text-xs font-semibold mb-2 text-teal-600">
            CustomerCare
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
          {isUser && (
            message.is_read ? (
              <CheckCheck className="w-3 h-3" />
            ) : (
              <Check className="w-3 h-3" />
            )
          )}
        </div>
      </div>
    </div>
  )
}