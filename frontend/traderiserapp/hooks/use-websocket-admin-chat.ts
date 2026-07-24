// hooks/use-websocket-admin-chat.ts
"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface WebSocketAdminChatOptions {
  url: string
  onMessage: (message: any) => void
  onTyping: (isTyping: boolean, fromUserId: number) => void
  onError: (error: string) => void
  onConnected: () => void
}

export function useWebSocketAdminChat(options: WebSocketAdminChatOptions) {
  const { url, onMessage, onTyping, onError, onConnected } = options
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    wsRef.current = new WebSocket(url)

    wsRef.current.onopen = () => {
      setIsConnected(true)
      onConnected()
      // Start heartbeat
      heartbeatIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "ping" }))
        }
      }, 30000) // Every 30 seconds
    }

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "chat_message") {
          onMessage(data.message)
        } else if (data.type === "typing") {
          onTyping(data.is_typing, data.user_id) // Assuming backend sends user_id
        } else if (data.type === "pong") {
          // Heartbeat response
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err)
      }
    }

    wsRef.current.onclose = () => {
      setIsConnected(false)
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }

    wsRef.current.onerror = () => {
      onError("WebSocket error occurred")
      wsRef.current?.close()
    }
  }, [url, onMessage, onTyping, onError, onConnected])

  useEffect(() => {
    if (url) {
      connect()
    }

    return () => {
      wsRef.current?.close()
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
    }
  }, [url, connect])

  const send = (data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      console.warn("WebSocket not open")
    }
  }

  const joinRoom = (userId: number) => {
    send({ action: "join_room", user_id: userId })
  }

  const leaveRoom = (userId: number) => {
    send({ action: "leave_room", user_id: userId })
  }

  // Assuming typing send for specific user
  const sendTyping = (isTyping: boolean, userId: number) => {
    send({ action: "typing", is_typing: isTyping, user_id: userId })
  }

  return { isConnected, send, joinRoom, leaveRoom, sendTyping }
}