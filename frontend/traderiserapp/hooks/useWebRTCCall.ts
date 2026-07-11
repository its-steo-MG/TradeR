'use client'

import { useRef, useCallback } from 'react'

interface UseWebRTCCallOptions {
  onIceCandidate: (candidate: RTCIceCandidateInit) => void
  onRemoteStreamAvailable: (stream: MediaStream) => void
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
}

export function useWebRTCCall({
  onIceCandidate,
  onRemoteStreamAvailable,
  onConnectionStateChange,
}: UseWebRTCCallOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current
    const pc = new RTCPeerConnection({ iceServers })
    pcRef.current = pc

    pc.onicecandidate = (e) => {
      if (e.candidate) onIceCandidate(e.candidate.toJSON())
    }
    pc.ontrack = (e) => {
      if (e.streams[0]) onRemoteStreamAvailable(e.streams[0])
    }
    pc.onconnectionstatechange = () => {
      onConnectionStateChange?.(pc.connectionState)
    }
    return pc
  }, [onIceCandidate, onRemoteStreamAvailable, onConnectionStateChange])

  const createAndSendOffer = useCallback(async () => {
    const pc = ensurePC()
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    localStreamRef.current = stream
    stream.getTracks().forEach((track) => pc.addTrack(track, stream))
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    return offer
  }, [ensurePC])

  const handleRemoteOffer = useCallback(
    async (offer: RTCSessionDescriptionInit, _voicePreset?: string) => {
      const pc = ensurePC()
      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        localStreamRef.current = stream
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      return answer
    },
    [ensurePC],
  )

  const handleRemoteAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!pcRef.current) return
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
  }, [])

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!pcRef.current) return
    try {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (e) {
      console.warn('ICE add failed', e)
    }
  }, [])

  const closeConnection = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
  }, [])

  return {
    createAndSendOffer,
    handleRemoteOffer,
    handleRemoteAnswer,
    addIceCandidate,
    closeConnection,
  }
}