"use client"

import { useEffect, useRef, useCallback, useState } from "react"

interface WebSocketMessage {
  type: "message" | "typing" | "connection" | "error"
  data?: any
}

interface UseWebSocketChatOptions {
  url: string
  onMessage?: (message: any) => void
  onTyping?: (isTyping: boolean) => void
  onConnected?: () => void
  onError?: (error: string) => void
}

export function useWebSocketChat({
  url,
  onMessage,
  onTyping,
  onConnected,
  onError,
}: UseWebSocketChatOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    // Validate URL: accept ws://, wss://, http://, https://
    if (!url || typeof url !== "string" || url.trim() === "") {
      console.warn("[WebSocket] No URL provided – connection skipped")
      onError?.("WebSocket URL not configured")
      return
    }

    let wsUrl = url.trim()

    // Auto-convert http(s) → ws(s)
    if (wsUrl.startsWith("http://")) {
      wsUrl = wsUrl.replace("http://", "ws://")
    } else if (wsUrl.startsWith("https://")) {
      wsUrl = wsUrl.replace("https://", "wss://")
    } else if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
      console.warn("[WebSocket] Invalid protocol. Must be ws://, wss://, http://, or https://", url)
      onError?.("WebSocket URL must use ws://, wss://, http://, or https://")
      return
    }

    console.log("[WebSocket] Connecting to:", wsUrl)

    try {
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log("[WebSocket] Connected successfully")
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        onConnected?.()
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          if (message.type === "message" && onMessage) {
            onMessage(message.data)
          } else if (message.type === "typing" && onTyping) {
            onTyping(message.data?.is_typing === true)
          } else if (message.type === "connection" && onConnected) {
            onConnected()
          } else if (message.type === "error" && onError) {
            onError(message.data?.error || "Unknown error")
          }
        } catch (err) {
          console.warn("[WebSocket] Failed to parse message:", event.data)
        }
      }

      wsRef.current.onerror = () => {
        console.warn("[WebSocket] Connection error")
        onError?.("Connection failed")
      }

      wsRef.current.onclose = (event) => {
        const wasExpected = event.code === 1000 || event.code === 1001
        const logLevel = wasExpected ? "log" : "warn"

        console[logLevel]("[WebSocket] Disconnected", {
          code: event.code,
          reason: event.reason || "No reason",
          wasClean: event.wasClean,
        })

        setIsConnected(false)

        if (!wasExpected && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1
          const delay = RECONNECT_DELAY * reconnectAttemptsRef.current
          console.log(
            `[WebSocket] Reconnecting in ${delay}ms... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`,
          )
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay)
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.error("[WebSocket] Max reconnection attempts reached")
          onError?.("Failed to reconnect")
        }
      }
    } catch (e) {
      console.error("[WebSocket] Failed to create WebSocket:", e)
      onError?.("WebSocket initialization failed")
    }
  }, [url, onMessage, onTyping, onConnected, onError])

  const send = useCallback((type: string, data?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({ type, data })
      wsRef.current.send(payload)
      console.debug("[WebSocket] Sent:", payload)
    } else {
      console.warn("[WebSocket] Not connected. readyState:", wsRef.current?.readyState)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect")
      wsRef.current = null
    }
    setIsConnected(false)
    reconnectAttemptsRef.current = 0
    console.log("[WebSocket] Disconnected by client")
  }, [])

  useEffect(() => {
    if (url && url.trim() !== "") {
      connect()
    } else {
      console.warn("[WebSocket] URL is empty – connection skipped")
      onError?.("WebSocket URL not configured")
    }

    return () => disconnect()
  }, [connect, disconnect, url, onError])

  return { isConnected, send, disconnect }
}