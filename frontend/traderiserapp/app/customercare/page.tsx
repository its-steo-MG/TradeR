'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Phone, PhoneOff, Headphones } from 'lucide-react'
import { toast } from 'sonner'

import { MessageBubble } from '@/components/customer-care/MessageBubble'
import { BlockedMessage } from '@/components/customer-care/BlockedMessage'
import { CallAnswerModal } from '@/components/customer-care/CallAnswerModal'
import { ChatInput } from '@/components/customer-care/ChatInput'

import { useWebSocketChat } from '@/hooks/useWebSocketChat'
import { useWebSocketCall } from '@/hooks/useWebSocketCall'
import { useWebRTCCall } from '@/hooks/useWebRTCCall'

import { TopNavbar } from '@/components/top-navbar'
import { Sidebar } from '@/components/sidebar'
import type { Account } from '@/types/account'

// ==================== TYPES ====================

interface Message {
  id: string
  sender: 'user' | 'staff' | 'system'
  content: string
  timestamp: string
  senderName?: string
  is_read?: boolean
}

interface User {
  username: string
  email: string
  is_staff: boolean
  accounts: Account[]
}

interface CallEvent {
  type: string
  call_id?: number
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  voice_preset?: string
  agent?: string
  user?: { id: number; username: string }
  [key: string]: unknown
}

interface ChatMessage {
  id: number | string
  content: string
  sent_at: string
  is_me: boolean
  is_read?: boolean
  sender?: {
    username: string
    is_staff: boolean
  }
}

interface RawAccount {
  id?: string | number
  account_type?: string
  balance?: string | number
}

// ==================== COMPONENT ====================

export default function CustomerCarePage() {
  const [mounted, setMounted] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isCallActive, setIsCallActive] = useState(false)
  const [isCalling, setIsCalling] = useState(false)
  const [isLoadingCall, setIsLoadingCall] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [callId, setCallId] = useState<number | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [showCallModal, setShowCallModal] = useState(false)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  // Store incoming offer for staff when they receive webrtc_offer
  const [pendingOffer, setPendingOffer] = useState<RTCSessionDescriptionInit | null>(null)
  const pendingOfferCallIdRef = useRef<number | null>(null)

  const tokenRef = useRef<string | null>(null)
  const outgoingCallRef = useRef<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null)
  const holdMusicRef = useRef<HTMLAudioElement | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)

  // Load Session + Normalize Account Types
  useEffect(() => {
    setMounted(true)
    const rawSession = localStorage.getItem('user_session')
    const token = localStorage.getItem('access_token')
    tokenRef.current = token?.trim().replace(/^"|"$/g, '') || null

    if (rawSession) {
      try {
        const sessionData = JSON.parse(rawSession)
        const rawAccounts: RawAccount[] = sessionData.accounts || []

        const normalizedAccounts: Account[] = rawAccounts
          .filter((acc): acc is RawAccount & { id: string | number } => acc.id != null)
          .map((acc) => ({
            id: Number(acc.id),
            account_type: acc.account_type || '',
            balance: Number(acc.balance) || 0,
          }))

        const userData: User = {
          username: sessionData.username || 'User',
          email: sessionData.email || '',
          is_staff: Boolean(sessionData.is_staff || false),
          accounts: normalizedAccounts,
        }

        setCurrentUser(userData)

        const activeId = localStorage.getItem('active_account_id')
        const foundAccount =
          userData.accounts.find((acc) => acc.id === Number(activeId)) || userData.accounts[0]

        setActiveAccount(foundAccount || null)
      } catch (e) {
        console.error('Failed to parse user_session in Customer Care:', e)
      }
    }
  }, [])

  const token = tokenRef.current

  // ==================== WEBRTC + CALL HOOKS ====================

  const {
    createAndSendOffer,
    handleRemoteOffer,
    handleRemoteAnswer,
    addIceCandidate,
    closeConnection,
  } = useWebRTCCall({
    onIceCandidate: (candidate) => {
      if (callId) {
        sendICECandidate(callId, candidate)
      }
    },
    onRemoteStreamAvailable: (stream) => {
      console.log('[CustomerCare] Remote stream received')
      setRemoteStream(stream)
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream
        remoteAudioRef.current.play().catch((err) => {
          console.error('Failed to play remote audio:', err)
        })
      }
    },
    onConnectionStateChange: (state) => {
      console.log('[CustomerCare] WebRTC connection state:', state)
      if (state === 'connected') {
        setIsCallActive(true)
      }
      if (state === 'failed' || state === 'closed') {
        handleEndCallLogic()
      }
    },
  })

  const handleCallEvent = useCallback((event: CallEvent) => {
    console.log('Call Event Received:', event.type, event)

    // ==================== INCOMING CALL (for staff) ====================
    if (event.type === 'new_incoming_call' && event.call_id) {
      const id = event.call_id

      const isOwnOutgoingCall =
        outgoingCallRef.current === id ||
        (event.user && event.user.username === currentUser?.username)

      if (currentUser?.is_staff && !isOwnOutgoingCall) {
        setCallId(id)
        pendingOfferCallIdRef.current = id
        localStorage.setItem('pending_incoming_call_id', id.toString())
        setShowCallModal(true)
        toast.success(`Incoming call - ID: ${id}`)
      }
    }

    // ==================== WEBRTC OFFER (staff receives this) ====================
    if (event.type === 'webrtc_offer' && event.call_id && event.offer) {
      // Only staff should process incoming offers
      if (currentUser?.is_staff) {
        console.log('[WebRTC] Received offer for call', event.call_id)
        setPendingOffer(event.offer)
        pendingOfferCallIdRef.current = event.call_id

        // If modal is already open for this call, we can prefill
        if (callId === event.call_id) {
          setCallId(event.call_id)
        }
      }
    }

    // ==================== WEBRTC ANSWER (user receives this) ====================
    if (event.type === 'webrtc_answer' && event.call_id && event.answer) {
      console.log('[WebRTC] Received answer for call', event.call_id)
      handleRemoteAnswer(event.answer).catch((err) => {
        console.error('Failed to handle remote answer:', err)
      })
    }

    // ==================== ICE CANDIDATE ====================
    if (event.type === 'webrtc_ice' && event.call_id && event.candidate) {
      addIceCandidate(event.candidate).catch((err) => {
        console.error('Failed to add ICE candidate:', err)
      })
    }

    // ==================== CALL ANSWERED ====================
    if (event.type === 'call_answered') {
      stopAllAudio()
      setIsCalling(false)
      setIsLoadingCall(false)
      startCallTimer()

      // If we are the caller, we should already have sent offer.
      // If we are staff, we just answered via modal.
      setIsCallActive(true)
      toast.success('Call connected successfully')
    }

    // ==================== CALL ENDED ====================
    if (event.type === 'call_ended') {
      handleEndCallLogic()
    }
  }, [currentUser?.is_staff, currentUser?.username, callId, handleRemoteAnswer, addIceCandidate])

  const {
    initiateCall,
    answerCall,
    endCall,
    sendWebRTCOffer,
    sendWebRTCAnswer,
    sendICECandidate,
    joinCallRoom,
  } = useWebSocketCall(token, handleCallEvent)

  const { messages: chatMessages, isConnected: chatConnected, blockInfo, sendMessage: sendChatMessage } =
    useWebSocketChat(token)

  // ==================== AUDIO & CALL HELPERS ====================

  const playWelcomeSound = () => {
    stopAllAudio()
    welcomeAudioRef.current = new Audio('/audio/welcome.mp3')
    welcomeAudioRef.current.play().catch((err) => console.error('Welcome sound failed:', err))
    welcomeAudioRef.current.onended = playHoldMusic
  }

  const playHoldMusic = () => {
    stopAllAudio()
    holdMusicRef.current = new Audio('/audio/hold-music.mp3')
    holdMusicRef.current.loop = true
    holdMusicRef.current.play().catch((err) => console.error('Hold music failed:', err))
  }

  const stopAllAudio = () => {
    welcomeAudioRef.current?.pause()
    holdMusicRef.current?.pause()
    welcomeAudioRef.current = null
    holdMusicRef.current = null
  }

  const startCallTimer = () => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    setCallDuration(0)
    durationTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000)
  }

  const handleEndCallLogic = useCallback(() => {
    closeConnection()
    stopAllAudio()
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
    setIsCallActive(false)
    setIsCalling(false)
    setCallId(null)
    setCallDuration(0)
    setShowCallModal(false)
    setIsLoadingCall(false)
    setPendingOffer(null)
    setRemoteStream(null)
    outgoingCallRef.current = null
    pendingOfferCallIdRef.current = null
    localStorage.removeItem('pending_incoming_call_id')

    // Clear remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
    }
  }, [closeConnection])

  // Restore pending incoming call for staff
  useEffect(() => {
    if (currentUser?.is_staff && !isCalling && !isCallActive) {
      const savedCallId = localStorage.getItem('pending_incoming_call_id')
      if (
        savedCallId &&
        !showCallModal &&
        outgoingCallRef.current !== Number(savedCallId)
      ) {
        setCallId(Number(savedCallId))
        pendingOfferCallIdRef.current = Number(savedCallId)
        setShowCallModal(true)
      }
    }
  }, [currentUser?.is_staff, showCallModal, isCalling, isCallActive])

  // ==================== CALL INITIATION (USER) ====================

  const handleInitiateCall = async () => {
    if (!token) return toast.error('Please log in again')

    setIsLoadingCall(true)
    setIsCalling(true)

    try {
      const callData = await initiateCall()
      const newCallId = callData.call_id

      outgoingCallRef.current = newCallId
      setCallId(newCallId)

      // Join the specific call room for better signaling
      joinCallRoom(newCallId)

      // Create WebRTC offer and send it
      const offer = await createAndSendOffer()
      sendWebRTCOffer(newCallId, offer)

      playWelcomeSound()
      toast.info('Calling support... Connecting...')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to initiate call'
      toast.error(message)
      handleEndCallLogic()
    } finally {
      setIsLoadingCall(false)
    }
  }

  // ==================== END CALL ====================

  const handleEndCall = async () => {
    if (callId) {
      await endCall(callId).catch(() => {})
    }
    handleEndCallLogic()
  }

  // ==================== ANSWER CALL (STAFF) ====================

  const handleAnswerCall = async (voicePreset: string): Promise<void> => {
    const currentCallId = callId || pendingOfferCallIdRef.current

    if (!currentCallId) {
      toast.error('Call ID not found')
      return
    }

    if (!pendingOffer) {
      toast.error('No offer received yet. Please wait a moment and try again.')
      return
    }

    try {
      // 1. Call REST API to mark call as answered
      await answerCall(currentCallId, voicePreset)

      // 2. Create answer using the pending offer + chosen voice preset
      const answer = await handleRemoteOffer(pendingOffer, voicePreset)

      // 3. Send answer via WebSocket
      sendWebRTCAnswer(currentCallId, answer)

      // 4. Join the call room for ICE + media
      joinCallRoom(currentCallId)

      // 5. Update UI
      setShowCallModal(false)
      localStorage.removeItem('pending_incoming_call_id')
      setPendingOffer(null)
      pendingOfferCallIdRef.current = null

      stopAllAudio()
      setIsCalling(false)
      setIsLoadingCall(false)
      setIsCallActive(true)
      startCallTimer()

      toast.success('Call connected')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to answer call'
      toast.error(message)
      console.error('Answer call error:', error)
    }
  }

  const handleDeclineCall = () => {
    setShowCallModal(false)
    setPendingOffer(null)
    pendingOfferCallIdRef.current = null
    localStorage.removeItem('pending_incoming_call_id')
  }

  // Sync Chat Messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      const formattedMessages: Message[] = chatMessages.map((msg: ChatMessage) => ({
        id: msg.id.toString(),
        sender: msg.is_me ? 'user' : msg.sender?.is_staff ? 'staff' : 'system',
        content: msg.content,
        timestamp: msg.sent_at,
        senderName: msg.sender?.username,
        is_read: msg.is_read,
      }))
      setMessages(formattedMessages)
    }
  }, [chatMessages])

  useEffect(() => {
    if (blockInfo) {
      setIsBlocked(true)
      toast.error(blockInfo.title || 'Account Blocked')
    }
  }, [blockInfo])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!mounted || !token || !currentUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading Support Center...
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopNavbar
        isLoggedIn={true}
        user={currentUser}
        accountBalance={activeAccount?.balance || 0}
        showBalance={true}
        activeAccount={activeAccount}
        accounts={currentUser.accounts || []}
        onSwitchAccount={(account) => {
          setActiveAccount(account)
          localStorage.setItem('active_account_id', String(account.id))
          window.dispatchEvent(new Event('session-updated'))
        }}
        onLogout={() => (window.location.href = '/login')}
      />

      <div className="flex flex-1">
        <Sidebar
          loginType="real"
          activeAccount={activeAccount}
          accounts={currentUser.accounts || []}
          onSwitchAccount={(account) => {
            setActiveAccount(account)
            localStorage.setItem('active_account_id', String(account.id))
            window.dispatchEvent(new Event('session-updated'))
          }}
        />

        <main className="flex-1 w-full overflow-auto md:pl-64 p-6 relative">
          {/* Background */}
          <div className="fixed inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-950/30 to-pink-950/20" />
            <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl animate-float delay-1000" />
            <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-purple-700/8 rounded-full blur-3xl animate-float delay-500" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center">
                <Headphones className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Support Center</h1>
                <p className="text-white/60">TradeRiser Professional Support</p>
              </div>
            </div>

            {/* Call Button Section */}
            <div className="glass rounded-3xl p-8 mb-8 border border-white/10 flex flex-col sm:flex-row gap-6 items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Immediate Assistance</p>
                <p className="text-2xl font-semibold">Speak with our support team</p>
              </div>

              {(isCallActive || isCalling || isLoadingCall) ? (
                <Button
                  onClick={handleEndCall}
                  size="lg"
                  className="rounded-full bg-red-600 hover:bg-red-700 px-10 py-6 text-lg"
                >
                  <PhoneOff className="mr-3 h-6 w-6" />
                  {isCallActive
                    ? `End Call (${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')})`
                    : 'End Call (Calling...)'}
                </Button>
              ) : (
                <Button
                  onClick={handleInitiateCall}
                  size="lg"
                  className="rounded-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 px-10 py-6 text-lg"
                  disabled={!chatConnected}
                >
                  <Phone className="mr-3 h-6 w-6" />
                  Call Support Now
                </Button>
              )}
            </div>

            {/* Chat Area */}
            <div className="glass rounded-3xl overflow-hidden border border-white/10 min-h-[620px] flex flex-col">
              <div className="px-8 py-5 border-b border-white/10 flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="font-semibold">Live Support Chat</span>
                {chatConnected && <span className="text-green-400 text-sm ml-2">• Online</span>}
              </div>

              <div className="flex-1 p-8 overflow-y-auto space-y-6">
                {isBlocked ? (
                  <BlockedMessage />
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <Headphones className="w-16 h-16 text-white/30 mb-6" />
                    <p className="text-xl text-white/80">How can we assist you today?</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isCurrentUser={msg.sender === 'user'}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {!isBlocked && (
                <div className="p-6 border-t border-white/10">
                  <ChatInput
                    onSend={async (message: string) => {
                      const success = sendChatMessage(message)
                      if (!success) {
                        toast.error("Failed to send message")
                      }
                    }}
                    disabled={!chatConnected}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {showCallModal && (
        <CallAnswerModal onAnswer={handleAnswerCall} onDecline={handleDeclineCall} />
      )}
    </div>
  )
}
