'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

//const API_BASE = 'http://localhost:8000'
//const WS_BASE = 'ws://localhost:8000'

const API_BASE = 'https://traderiserproapp.onrender.com'
const WS_BASE = 'wss://traderiserproapp.onrender.com'

export interface CallEvent {
  type: string
  call_id?: number
  is_staff?: boolean
  offer?: any
  answer?: any
  candidate?: any
  voice_preset?: string
  agent?: string
  user?: { id: number; username: string }
  [key: string]: any
}

type CallEventCallback = (event: CallEvent) => void

export function useWebSocketCall(token: string | null, onCallEvent?: CallEventCallback) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isStaff, setIsStaff] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef<CallEventCallback | undefined>(onCallEvent)

  useEffect(() => {
    callbackRef.current = onCallEvent
  }, [onCallEvent])

  const connect = useCallback(() => {
    if (!token || token.length < 50) {
      console.warn('[CallWS] ❌ Invalid or missing access token')
      setError('Authentication required')
      return
    }

    const wsUrl = `${WS_BASE}/ws/call/?token=${encodeURIComponent(token)}`
    console.log('[CallWS] Connecting to:', wsUrl)

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
      console.log('[CallWS] ✅ Connected successfully')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as CallEvent
        console.log('[CallWS] Received:', data.type, data)
        callbackRef.current?.(data)

        if (data.type === 'connection_established') {
          setIsStaff(!!data.is_staff)
        }
      } catch (e) {
        console.error('[CallWS] Parse error:', e)
      }
    }

    ws.onerror = (event) => {
      console.error('[CallWS] WebSocket error:', event)
      setError('WebSocket connection failed')
    }

    ws.onclose = (event) => {
      setIsConnected(false)
      console.log(`[CallWS] Disconnected (code: ${event.code})`)
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
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

  // ==================== REST API CALLS ====================

  const initiateCall = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/customercare/call/initiate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status} - Failed to initiate call: ${text}`)
    }
    return res.json()
  }, [token])

  const answerCall = useCallback(async (callId: number, voicePreset: string = 'default') => {
    console.log(`[AnswerCall] Attempting to answer call ${callId} with voice: ${voicePreset}`)

    const res = await fetch(`${API_BASE}/api/customercare/call/answer/${callId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ voice_preset: voicePreset }),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'No error message')
      console.error(`[AnswerCall] Failed - Status: ${res.status}`, errorText)
      throw new Error(`HTTP ${res.status} - ${errorText || 'Failed to answer call'}`)
    }

    const data = await res.json()
    console.log('[AnswerCall] Success:', data)
    return data
  }, [token])

  const endCall = useCallback(async (callId: number) => {
    const res = await fetch(`${API_BASE}/api/customercare/call/end/${callId}/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status} - Failed to end call: ${text}`)
    }
    return res.json()
  }, [token])

  const send = useCallback((data: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[CallWS] Cannot send - WebSocket not open')
      return false
    }
    wsRef.current.send(JSON.stringify(data))
    return true
  }, [])

  return {
    isConnected,
    isStaff,
    error,
    initiateCall,
    answerCall,
    endCall,
    sendWebRTCOffer: (callId: number, offer: any) => send({ type: 'webrtc_offer', call_id: callId, offer }),
    sendWebRTCAnswer: (callId: number, answer: any) => send({ type: 'webrtc_answer', call_id: callId, answer }),
    sendICECandidate: (callId: number, candidate: any) => send({ type: 'webrtc_ice', call_id: callId, candidate }),
    joinCallRoom: (callId: number) => send({ type: 'join_call', call_id: callId }),
  }
}