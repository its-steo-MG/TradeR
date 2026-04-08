'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SendIcon } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => Promise<void> | void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!message.trim() || disabled || isSending) return

      try {
        setIsSending(true)
        await onSend(message)
        setMessage('')
        inputRef.current?.focus()
      } catch (error) {
        console.error('Failed to send message:', error)
      } finally {
        setIsSending(false)
      }
    },
    [message, disabled, isSending, onSend]
  )

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        disabled={disabled || isSending}
        className="flex-1"
      />
      <Button
        type="submit"
        disabled={!message.trim() || disabled || isSending}
        size="icon"
        className="bg-green-500 hover:bg-green-600 text-white"
      >
        <SendIcon className="h-4 w-4" />
      </Button>
    </form>
  )
}
