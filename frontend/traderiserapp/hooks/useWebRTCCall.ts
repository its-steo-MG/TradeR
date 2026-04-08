import { useEffect, useRef, useCallback, useState } from 'react'

interface WebRTCCallOptions {
  onIceCandidate?: (candidate: RTCIceCandidate) => void
  onRemoteStreamAvailable?: (stream: MediaStream) => void
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
}

/**
 * WebRTC hook for audio-only peer connections
 * Handles RTCPeerConnection setup, offer/answer exchange, and ICE candidates
 */
export function useWebRTCCall(
  options: WebRTCCallOptions = {},
) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // STUN servers configuration
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]

  // Initialize WebRTC peer connection
  const initializePeerConnection = useCallback(async () => {
    try {
      setIsConnecting(true)
      setError(null)

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers,
      })

      // Get local audio stream
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      localStreamRef.current = localStream

      // Add local audio track to peer connection
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
      })

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WebRTC] ICE candidate:', event.candidate)
          options.onIceCandidate?.(event.candidate)
        }
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('[WebRTC] Remote stream received:', event.streams)
        options.onRemoteStreamAvailable?.(event.streams[0])
      }

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState
        console.log('[WebRTC] Connection state:', state)

        if (state === 'connected') {
          setIsConnected(true)
          setIsConnecting(false)
        } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          setIsConnected(false)
          setIsConnecting(false)
        }

        options.onConnectionStateChange?.(state)
      }

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state:', peerConnection.iceConnectionState)
      }

      // Handle signaling state changes
      peerConnection.onsignalingstatechange = () => {
        console.log('[WebRTC] Signaling state:', peerConnection.signalingState)
      }

      peerConnectionRef.current = peerConnection

      return peerConnection
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize WebRTC'
      setError(message)
      setIsConnecting(false)
      console.error('[WebRTC] Initialization error:', err)
      throw err
    }
  }, [options])

  // Create and send offer
  const createAndSendOffer = useCallback(async () => {
    try {
      if (!peerConnectionRef.current) {
        await initializePeerConnection()
      }

      const peerConnection = peerConnectionRef.current!
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
      })

      await peerConnection.setLocalDescription(offer)

      console.log('[WebRTC] Offer created:', offer)
      return offer
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create offer'
      setError(message)
      console.error('[WebRTC] Offer creation error:', err)
      throw err
    }
  }, [initializePeerConnection])

  // Handle incoming offer
  const handleRemoteOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      try {
        if (!peerConnectionRef.current) {
          await initializePeerConnection()
        }

        const peerConnection = peerConnectionRef.current!

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))

        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)

        console.log('[WebRTC] Answer created:', answer)
        return answer
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to handle offer'
        setError(message)
        console.error('[WebRTC] Handle offer error:', err)
        throw err
      }
    },
    [initializePeerConnection]
  )

  // Handle incoming answer
  const handleRemoteAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      if (!peerConnectionRef.current) {
        throw new Error('Peer connection not initialized')
      }

      const peerConnection = peerConnectionRef.current
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))

      console.log('[WebRTC] Answer received and set')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to handle answer'
      setError(message)
      console.error('[WebRTC] Handle answer error:', err)
      throw err
    }
  }, [])

  // Add ICE candidate
  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      if (!peerConnectionRef.current) {
        throw new Error('Peer connection not initialized')
      }

      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      console.log('[WebRTC] ICE candidate added')
    } catch (err) {
      console.error('[WebRTC] Add ICE candidate error:', err)
      // Don't throw - ICE candidate errors are often non-critical
    }
  }, [])

  // Close connection and cleanup
  const closeConnection = useCallback(() => {
    try {
      // Stop audio tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop()
        })
        localStreamRef.current = null
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }

      setIsConnected(false)
      setIsConnecting(false)
      setError(null)

      console.log('[WebRTC] Connection closed')
    } catch (err) {
      console.error('[WebRTC] Close error:', err)
    }
  }, [])

  // Get local stream
  const getLocalStream = useCallback(() => {
    return localStreamRef.current
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeConnection()
    }
  }, [closeConnection])

  return {
    isConnecting,
    isConnected,
    error,
    initializePeerConnection,
    createAndSendOffer,
    handleRemoteOffer,
    handleRemoteAnswer,
    addIceCandidate,
    closeConnection,
    getLocalStream,
  }
}
