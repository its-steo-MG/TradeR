'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'wss://traderiserproapp.onrender.com'

export interface Message {
  id: number
  content: string
  sent_at: string
  is_read: boolean
  is_system: boolean
  sender: { username: string; is_staff: boolean }
  is_me: boolean
  user_id?: number
}

export interface BlockInfo {
  type: 'permanent' | 'temporary'
  title: string
  message: string
  can_request_review?: boolean
}

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')?.trim().replace(/^"|"$/g, '') || null
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
    if (!token || token.length < 50 || typeof window === 'undefined') return

    const wsUrl = `${WS_BASE}/ws/chat/?token=${encodeURIComponent(token)}`
    console.log('[ChatWS] Connecting:', wsUrl)
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
      setBlockInfo(null)
      console.log('[ChatWS] ✅ Connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'chat_history') {
          setMessages(data.messages || [])
        } else if (data.type === 'new_message' || data.type === 'chat_message') {
          const message = data.message || data
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev
            return [...prev, message]
          })
        } else if (data.type === 'typing') {
          setIsTyping(!!data.is_typing)
        } else if (data.type === 'blocked') {
          setBlockInfo(data.block_info)
          setError('Your account has been blocked.')
        }
      } catch (e) {
        console.error('[ChatWS] parse error', e)
      }
    }

    ws.onerror = () => setError('WebSocket connection failed')
    ws.onclose = (event) => {
      setIsConnected(false)
      if (event.code !== 4001 && event.code !== 4003) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }
    }

    wsRef.current = ws
  }, [token])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
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
    } catch {
      return false
    }
  }, [])

  const setTyping = useCallback((typing: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', is_typing: typing }))
    }
  }, [])

  return { messages, isConnected, isTyping, error, blockInfo, sendMessage, setTyping }
}