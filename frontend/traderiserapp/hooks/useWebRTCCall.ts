'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface WebRTCCallOptions {
  onIceCandidate?: (candidate: RTCIceCandidate) => void
  onRemoteStreamAvailable?: (stream: MediaStream) => void
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
}

export function useWebRTCCall(options: WebRTCCallOptions = {}) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([])

  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const optsRef = useRef(options)
  useEffect(() => {
    optsRef.current = options
  }, [options])

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ]

  const createVoiceProcessedStream = useCallback(
    async (preset: string = 'default'): Promise<MediaStream> => {
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      if (preset === 'default') {
        return rawStream
      }

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

      const ctx = new AudioCtx()
      const source = ctx.createMediaStreamSource(rawStream)
      const dest = ctx.createMediaStreamDestination()

      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 80

      const peaking = ctx.createBiquadFilter()
      peaking.type = 'peaking'
      peaking.Q.value = 1.2

      const gain = ctx.createGain()
      gain.gain.value = 1.0

      if (preset === 'lady' || preset === 'female') {
        peaking.frequency.value = 900
        peaking.gain.value = 15
        gain.gain.value = 1.1
      } else if (preset === 'man' || preset === 'male') {
        peaking.frequency.value = 180
        peaking.gain.value = -12
        gain.gain.value = 1.0
      } else if (preset === 'child') {
        peaking.frequency.value = 1400
        peaking.gain.value = 18
        gain.gain.value = 1.15
      }

      source.connect(hp)
      hp.connect(peaking)
      peaking.connect(gain)
      gain.connect(dest)

      console.log(`[Voice] Applied preset: ${preset}`)
      return dest.stream
    },
    []
  )

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        optsRef.current.onIceCandidate?.(event.candidate)
      }
    }

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received')
      const [stream] = event.streams
      if (stream) {
        optsRef.current.onRemoteStreamAvailable?.(stream)
      }
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      console.log(`[WebRTC] Connection state: ${state}`)
      setIsConnected(state === 'connected')
      if (state !== 'connecting') setIsConnecting(false)
      optsRef.current.onConnectionStateChange?.(state)
    }

    peerConnectionRef.current = pc
    return pc
  }, [])

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current
    if (!pc) return

    if (!pc.remoteDescription) {
      pendingIceCandidates.current.push(candidate)
      return
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (e) {
      console.error('[WebRTC] addIceCandidate failed:', e)
    }
  }, [])

  const processPendingIceCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current
    if (!pc || pendingIceCandidates.current.length === 0) return

    for (const cand of pendingIceCandidates.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand))
      } catch (e) {
        console.error('[WebRTC] Queued ICE failed:', e)
      }
    }
    pendingIceCandidates.current = []
  }, [])

  // Caller creates offer
  const createAndSendOffer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
    setIsConnecting(true)
    const pc = peerConnectionRef.current ?? createPeerConnection()

    const localStream = await createVoiceProcessedStream('default')
    localStreamRef.current = localStream
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream))

    const offer = await pc.createOffer({ offerToReceiveAudio: true })
    await pc.setLocalDescription(offer)

    console.log('[WebRTC] Offer created and set as local description')
    return offer
  }, [createPeerConnection, createVoiceProcessedStream])

  // Staff handles incoming offer and creates answer
  const handleRemoteOffer = useCallback(
    async (
      offer: RTCSessionDescriptionInit,
      voicePreset: string = 'default'
    ): Promise<RTCSessionDescriptionInit> => {
      setIsConnecting(true)
      const pc = peerConnectionRef.current ?? createPeerConnection()

      const localStream = await createVoiceProcessedStream(voicePreset)
      localStreamRef.current = localStream
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream))

      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await processPendingIceCandidates()

      console.log(`[WebRTC] Created answer with voice preset: ${voicePreset}`)
      return answer
    },
    [createPeerConnection, createVoiceProcessedStream, processPendingIceCandidates]
  )

  // Caller handles answer from staff
  const handleRemoteAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      const pc = peerConnectionRef.current
      if (!pc) {
        throw new Error('No peer connection available')
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer))
      await processPendingIceCandidates()

      console.log('[WebRTC] Remote answer set successfully')
    },
    [processPendingIceCandidates]
  )

  const closeConnection = useCallback(() => {
    console.log('[WebRTC] Closing connection')

    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    peerConnectionRef.current?.getSenders().forEach((s) => {
      try {
        s.track?.stop()
      } catch {
        // ignore
      }
    })

    peerConnectionRef.current?.close()
    peerConnectionRef.current = null
    localStreamRef.current = null
    pendingIceCandidates.current = []

    setIsConnected(false)
    setIsConnecting(false)
  }, [])

  useEffect(() => {
    return () => {
      closeConnection()
    }
  }, [closeConnection])

  return {
    createAndSendOffer,
    handleRemoteOffer,
    handleRemoteAnswer,
    addIceCandidate,
    closeConnection,
    isConnecting,
    isConnected,
    error,
  }
}
