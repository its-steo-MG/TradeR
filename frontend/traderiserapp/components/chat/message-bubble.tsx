import type { ChatMessage } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isAdmin = message.sender.is_staff
  const isMe = message.is_me

  return (
    <div className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs px-3.5 py-2 shadow-sm rounded-2xl transition-all ${
          isMe
            ? "bg-green-100 text-gray-900 rounded-br-none"
            : isAdmin
              ? "bg-white text-gray-900 border border-gray-100 rounded-bl-none shadow-md"
              : "bg-gray-100 text-gray-900 rounded-bl-none"
        }`}
      >
        {/* Admin Badge */}
        {isAdmin && !isMe && (
          <div className="mb-1.5 inline-block text-xs font-semibold text-green-700">Customer Care</div>
        )}

        {/* Message Content */}
        <p className="break-words text-sm leading-relaxed font-medium">{message.content}</p>

        {/* Timestamp and Read Status */}
        <div className="mt-1.5 flex items-center gap-1.5 justify-end">
          <span className="text-xs text-gray-600">
            {formatDistanceToNow(new Date(message.sent_at), { addSuffix: true })}
          </span>
          {isMe && (
            <span className={`text-xs font-bold ${message.is_read ? "text-green-600" : "text-gray-500"}`}>
              {message.is_read ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
