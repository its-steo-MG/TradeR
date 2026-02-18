"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"

interface ChatInputProps {
  onSendMessage: (content: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const newHeight = Math.min(textareaRef.current.scrollHeight, 100)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [message])

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-full px-3 sm:px-4 py-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={disabled ? "Blocked" : "Message..."}
              className="w-full resize-none rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-green-500 focus:ring-1 focus:ring-green-200 disabled:cursor-not-allowed disabled:opacity-50"
              rows={1}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className="flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 p-2 text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex-shrink-0"
            title="Send message"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
