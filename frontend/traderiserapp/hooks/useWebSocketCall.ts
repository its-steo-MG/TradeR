'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { answerAudioCall, endAudioCall, initiateAudioCall } from '@/lib/api'

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'wss://traderiserproapp.onrender.com'

export interface CallEvent {
  type: string
  call_id?: number
  is_staff?: boolean
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  voice_preset?: string
  agent?: string
  user?: { id: number; username: string }
  [key: string]: any
}

type CallEventCallback = (event: CallEvent) => void

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')?.trim().replace(/^"|"$/g, '') || null
}

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
      setError('Authentication required')
      return
    }

    const wsUrl = `${WS_BASE}/ws/call/?token=${encodeURIComponent(token)}`
    console.log('[CallWS] Connecting:', wsUrl)
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
      console.log('[CallWS] ✅ Connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as CallEvent
        callbackRef.current?.(data)
        if (data.type === 'connection_established') {
          setIsStaff(!!data.is_staff)
        }
      } catch (e) {
        console.error('[CallWS] parse error', e)
      }
    }

    ws.onerror = () => setError('WebSocket connection failed')
    ws.onclose = (event) => {
      setIsConnected(false)
      if (event.code !== 1000) {
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

  const send = useCallback((data: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false
    wsRef.current.send(JSON.stringify(data))
    return true
  }, [])

  const initiateCall = useCallback(async () => {
    const res = await initiateAudioCall()
    if (res.error) throw new Error(res.error)
    return res.data!
  }, [])

  const answerCall = useCallback(async (callId: number, voicePreset = 'default') => {
    const res = await answerAudioCall(callId, voicePreset)
    if (res.error) throw new Error(res.error)
    return res.data!
  }, [])

  const endCall = useCallback(async (callId: number) => {
    const res = await endAudioCall(callId)
    if (res.error) throw new Error(res.error)
    return res.data!
  }, [])

  return {
    isConnected,
    isStaff,
    error,
    initiateCall,
    answerCall,
    endCall,
    sendWebRTCOffer: (callId: number, offer: RTCSessionDescriptionInit) =>
      send({ type: 'webrtc_offer', call_id: callId, offer }),
    sendWebRTCAnswer: (callId: number, answer: RTCSessionDescriptionInit) =>
      send({ type: 'webrtc_answer', call_id: callId, answer }),
    sendICECandidate: (callId: number, candidate: RTCIceCandidateInit) =>
      send({ type: 'webrtc_ice', call_id: callId, candidate }),
    joinCallRoom: (callId: number) => send({ type: 'join_call', call_id: callId }),
  }
}