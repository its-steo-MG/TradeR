// hooks/use websocket.ts  ← Keep as is, or update if needed
import { useCallback, useRef, useState } from "react"

export function useWebSocket(onMessage: (data: any) => void) {
  const ws = useRef<WebSocket | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const connect = useCallback(
    async (url: string) => {
      return new Promise((resolve, reject) => {
        try {
          ws.current = new WebSocket(url)

          ws.current.onopen = () => {
            console.log("[v0] WebSocket connected")
            setIsLoading(false)
            resolve(true)
          }

          ws.current.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data)
              console.log("[v0] WebSocket message:", data)
              onMessage(data)
            } catch (e) {
              console.error("[v0] Failed to parse WebSocket message:", e)
            }
          }

          ws.current.onerror = (error) => {
            console.error("[v0] WebSocket error:", error)
            setIsLoading(false)
            reject(error)
          }

          ws.current.onclose = () => {
            console.log("[v0] WebSocket disconnected")
          }
        } catch (error) {
          console.error("[v0] Failed to create WebSocket:", error)
          reject(error)
        }
      })
    },
    [onMessage],
  )

  const sendMessage = useCallback((message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log("[v0] Sending message:", message)
      ws.current.send(JSON.stringify(message))
    } else {
      console.warn("[v0] WebSocket not ready")
    }
  }, [])

  return { connect, sendMessage, isLoading }
}