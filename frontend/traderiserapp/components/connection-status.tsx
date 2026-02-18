"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true)
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking")

  useEffect(() => {
    checkConnection()
    const interval = setInterval(checkConnection, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [])

  const checkConnection = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000", {
        method: "HEAD",
        mode: "no-cors",
      })
      setApiStatus("online")
      setIsConnected(true)
    } catch (error) {
      setApiStatus("offline")
      setIsConnected(false)
    }
  }

  if (apiStatus === "checking") return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge variant={isConnected ? "default" : "destructive"} className="gap-2">
        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {isConnected ? "Connected" : "Disconnected"}
      </Badge>
    </div>
  )
}