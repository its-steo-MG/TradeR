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

  /**
   * STRONGER voice changer - more dramatic and audible effects
   */
  const createVoiceProcessedStream = useCallback(
    async (preset: string = 'default'): Promise<MediaStream> => {
      console.log(`[Voice] Creating stream with preset: ${preset}`)

      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      if (preset === 'default') {
        console.log('[Voice] Using DEFAULT (no processing)')
        return rawStream
      }

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

      const ctx = new AudioCtx()

      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      const source = ctx.createMediaStreamSource(rawStream)
      const dest = ctx.createMediaStreamDestination()

      // === Very strong, noticeable voice transformation ===
      const lowShelf = ctx.createBiquadFilter()
      lowShelf.type = 'lowshelf'
      lowShelf.frequency.value = 250

      const highShelf = ctx.createBiquadFilter()
      highShelf.type = 'highshelf'
      highShelf.frequency.value = 2800

      const midPeaking = ctx.createBiquadFilter()
      midPeaking.type = 'peaking'
      midPeaking.Q.value = 1.8

      const highPeaking = ctx.createBiquadFilter()
      highPeaking.type = 'peaking'
      highPeaking.Q.value = 2.2
      highPeaking.frequency.value = 3200

      const compressor = ctx.createDynamicsCompressor()

      if (preset === 'lady' || preset === 'female') {
        // Strong female / bright voice
        lowShelf.gain.value = -14
        highShelf.gain.value = 26
        midPeaking.frequency.value = 1600
        midPeaking.gain.value = 18
        highPeaking.gain.value = 12
        console.log('[Voice] Applied STRONG LADY preset')
      } 
      else if (preset === 'man' || preset === 'male') {
        // Deep male voice
        lowShelf.gain.value = 18
        highShelf.gain.value = -16
        midPeaking.frequency.value = 280
        midPeaking.gain.value = 10
        console.log('[Voice] Applied STRONG MAN preset')
      } 
      else if (preset === 'child') {
        // Very high pitched child-like
        lowShelf.gain.value = -18
        highShelf.gain.value = 30
        midPeaking.frequency.value = 2100
        midPeaking.gain.value = 22
        highPeaking.gain.value = 16
        console.log('[Voice] Applied STRONG CHILD preset')
      }

      source
        .connect(lowShelf)
        .connect(highShelf)
        .connect(midPeaking)
        .connect(highPeaking)
        .connect(compressor)
        .connect(dest)

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
      const [stream] = event.streams
      if (stream) optsRef.current.onRemoteStreamAvailable?.(stream)
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
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

  const createAndSendOffer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
    setIsConnecting(true)
    const pc = peerConnectionRef.current ?? createPeerConnection()

    const localStream = await createVoiceProcessedStream('default')
    localStreamRef.current = localStream
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream))

    const offer = await pc.createOffer({ offerToReceiveAudio: true })
    await pc.setLocalDescription(offer)
    return offer
  }, [createPeerConnection, createVoiceProcessedStream])

  const handleRemoteOffer = useCallback(
    async (offer: RTCSessionDescriptionInit, voicePreset: string = 'default') => {
      setIsConnecting(true)
      const pc = peerConnectionRef.current ?? createPeerConnection()

      const localStream = await createVoiceProcessedStream(voicePreset)
      localStreamRef.current = localStream
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream))

      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await processPendingIceCandidates()
      return answer
    },
    [createPeerConnection, createVoiceProcessedStream, processPendingIceCandidates]
  )

  const handleRemoteAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current
    if (!pc) throw new Error('No peer connection')
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
    await processPendingIceCandidates()
  }, [processPendingIceCandidates])

  const closeConnection = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    peerConnectionRef.current?.close()
    peerConnectionRef.current = null
    localStreamRef.current = null
    pendingIceCandidates.current = []
    setIsConnected(false)
    setIsConnecting(false)
  }, [])

  useEffect(() => () => closeConnection(), [closeConnection])

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
