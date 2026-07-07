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

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]

  const createVoiceProcessedStream = useCallback(async (preset: string = 'default'): Promise<MediaStream> => {
    const rawStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    })

    if (preset === 'default') return rawStream

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const source = audioContext.createMediaStreamSource(rawStream)
    const destination = audioContext.createMediaStreamDestination()

    const filter = audioContext.createBiquadFilter()
    filter.type = 'peaking'
    filter.Q.value = 1.2

    if (preset === 'lady' || preset === 'female') {
      filter.frequency.value = 850; filter.gain.value = 14
    } else if (preset === 'man' || preset === 'male') {
      filter.frequency.value = 180; filter.gain.value = -11
    } else if (preset === 'child') {
      filter.frequency.value = 1350; filter.gain.value = 19
    }

    source.connect(filter)
    filter.connect(destination)

    console.log(`[Voice] Applied preset: ${preset}`)
    return destination.stream
  }, [])

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers })

    pc.onicecandidate = (event) => {
      if (event.candidate) options.onIceCandidate?.(event.candidate)
    }

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote stream received')
      options.onRemoteStreamAvailable?.(event.streams[0])
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      console.log(`[WebRTC] Connection state: ${state}`)
      setIsConnected(state === 'connected')
      setIsConnecting(false)
      options.onConnectionStateChange?.(state)
    }

    peerConnectionRef.current = pc
    return pc
  }, [options])

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current
    if (!pc) {
      pendingIceCandidates.current.push(candidate)
      return
    }
    if (pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error)
    } else {
      pendingIceCandidates.current.push(candidate)
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

  // Caller: Only create offer, NO microphone yet
  const createAndSendOffer = useCallback(async () => {
    try {
      setIsConnecting(true)
      if (!peerConnectionRef.current) createPeerConnection()

      const pc = peerConnectionRef.current!
      const offer = await pc.createOffer({ offerToReceiveAudio: true })
      await pc.setLocalDescription(offer)

      console.log('[WebRTC] Offer created (no media yet)')
      return offer
    } catch (err: any) {
      console.error('[WebRTC] Create offer failed:', err)
      throw err
    }
  }, [createPeerConnection])

  // Staff: Answer → Now get microphone + voice preset
  const handleRemoteOffer = useCallback(async (offer: RTCSessionDescriptionInit, voicePreset: string = 'default') => {
    try {
      setIsConnecting(true)
      if (!peerConnectionRef.current) createPeerConnection()

      const pc = peerConnectionRef.current!

      // ←←← MEDIA ONLY STARTS HERE ←←←
      const localStream = await createVoiceProcessedStream(voicePreset)
      localStreamRef.current = localStream
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream))

      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      await processPendingIceCandidates()

      console.log(`[WebRTC] Staff answered with voice: ${voicePreset}`)
      return answer
    } catch (err: any) {
      console.error('[WebRTC] Handle offer failed:', err)
      throw err
    }
  }, [createPeerConnection, createVoiceProcessedStream, processPendingIceCandidates])

  // Caller: When staff answers → Now get microphone
  const handleRemoteAnswer = useCallback(async (answer: RTCSessionDescriptionInit, voicePreset: string = 'default') => {
    try {
      if (!peerConnectionRef.current) throw new Error('No peer connection')

      const pc = peerConnectionRef.current!

      // ←←← MEDIA ONLY STARTS HERE ←←←
      const localStream = await createVoiceProcessedStream(voicePreset)
      localStreamRef.current = localStream
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream))

      await pc.setRemoteDescription(new RTCSessionDescription(answer))
      await processPendingIceCandidates()

      console.log('[WebRTC] Caller received answer - audio starting')
    } catch (err: any) {
      console.error('[WebRTC] Handle answer failed:', err)
      throw err
    }
  }, [createVoiceProcessedStream, processPendingIceCandidates])

  const closeConnection = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
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