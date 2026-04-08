'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

//const WS_BASE = 'ws://localhost:8000'

const WS_BASE = 'wss://traderiserproapp.onrender.com'    // ← Point directly to Django

export interface Message {
  id: number
  content: string
  sent_at: string
  is_read: boolean
  is_system: boolean
  sender: {
    username: string
    is_staff: boolean
  }
  is_me: boolean
}

export interface BlockInfo {
  type: 'permanent' | 'temporary'
  title: string
  message: string
  can_request_review?: boolean
}

export function useWebSocketChat(token: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!token || token.length < 50 || typeof window === 'undefined') {
      if (token) console.warn('[ChatWS] Invalid token length')
      return
    }

    const wsUrl = `${WS_BASE}/ws/chat/?token=${encodeURIComponent(token)}`

    console.log('[ChatWS] Connecting to Django WebSocket:', wsUrl)
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
      setBlockInfo(null)
      console.log('[ChatWS] ✅ Chat WebSocket connected to Django')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[ChatWS] Received:', data.type)

        if (data.type === 'chat_history') {
          setMessages(data.messages || [])
        } else if (data.type === 'new_message' || data.type === 'chat_message') {
          const message = data.message || data
          setMessages((prev) => [...prev, message])
        } else if (data.type === 'typing') {
          setIsTyping(data.is_typing)
        } else if (data.type === 'blocked') {
          setBlockInfo(data.block_info)
          setError('Your account has been blocked.')
        }
      } catch (parseError) {
        console.error('[ChatWS] Failed to parse message:', parseError)
      }
    }

    ws.onerror = (event) => {
      console.error('[ChatWS] WebSocket error:', event)
      setError('WebSocket connection failed')
    }

    ws.onclose = (event) => {
      setIsConnected(false)
      console.log(`[ChatWS] Disconnected (code: ${event.code})`)
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }

    wsRef.current = ws
  }, [token])

  useEffect(() => {
    connect()

    return () => {
      if (wsRef.current) wsRef.current.close()
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    }
  }, [connect])

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to chat')
      return false
    }

    try {
      wsRef.current.send(JSON.stringify({ type: 'message', content: content.trim() }))
      return true
    } catch (err) {
      console.error('[ChatWS] Failed to send message:', err)
      return false
    }
  }, [])

  const setTyping = useCallback((typing: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', is_typing: typing }))
    }
  }, [])

  return {
    messages,
    isConnected,
    isTyping,
    error,
    blockInfo,
    sendMessage,
    setTyping,
  }
}