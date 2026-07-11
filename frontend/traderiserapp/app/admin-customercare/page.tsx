'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAdminChat } from '@/hooks/useAdminChat'
import { useWebSocketCall } from '@/hooks/useWebSocketCall'
import { adminLogin } from '@/lib/api'
import { toast } from 'sonner'
import {
  Phone,
  PhoneOff,
  Send,
  Search,
  MoreVertical,
  Ban,
  CheckCircle,
  MessageSquare,
  Loader2,
  Lock,
  User,
  ArrowLeft,
  Menu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CallAnswerModal } from '@/components/customer-care/CallAnswerModal'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')?.trim().replace(/^"|"$/g, '') || null
}

function isAdminLoggedIn() {
  return localStorage.getItem('is_admin') === 'true' && !!getToken()
}

export default function AdminCustomercarePage() {
  const [mounted, setMounted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Login form
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  // UI state
  const [search, setSearch] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [incomingCallId, setIncomingCallId] = useState<number | null>(null)
  const [showCallModal, setShowCallModal] = useState(false)
  const [activeCallId, setActiveCallId] = useState<number | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const durationRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    threads,
    selectedUserId,
    messages,
    isConnected,
    isTyping,
    loading,
    sending,
    error,
    selectUser,
    sendMessage,
    sendTyping,
    doBlock,
  } = useAdminChat()

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleCallEvent = useCallback((event: any) => {
    if (event.type === 'new_incoming_call' && event.call_id) {
      setIncomingCallId(event.call_id)
      setShowCallModal(true)
      toast.success(`Incoming call from ${event.user?.username || 'User'}`)
    }
    if (event.type === 'call_ended') endActiveCall()
    if (event.type === 'call_answered' && incomingCallId === event.call_id) {
      setShowCallModal(false)
      setIncomingCallId(null)
    }
  }, [incomingCallId])

  const {
    isConnected: callConnected,
    answerCall,
    endCall,
    joinCallRoom,
  } = useWebSocketCall(isAdmin ? token : null, handleCallEvent)

  useEffect(() => {
    setMounted(true)
    setIsAdmin(isAdminLoggedIn())
    setToken(getToken())
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // ---------- LOGIN ----------
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoggingIn(true)
    setLoginError('')
    try {
      const res = await adminLogin({ username: username.trim(), password })
      if (res.error) {
        setLoginError(res.error)
        return
      }
      setIsAdmin(true)
      setToken(getToken())
      toast.success('Welcome, Admin')
    } catch (err: any) {
      setLoginError(err.message || 'Login failed')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('is_admin')
    localStorage.removeItem('user_session')
    setIsAdmin(false)
    setToken(null)
    window.location.href = '/admin-customercare'
  }

  // ---------- HELPERS ----------
  const currentThread = threads.find((t) => t.user.id === selectedUserId) || null

  const filteredThreads = search.trim()
    ? threads.filter(
        (t) =>
          t.user.username.toLowerCase().includes(search.toLowerCase()) ||
          (t.last_message || '').toLowerCase().includes(search.toLowerCase()),
      )
    : threads

  const formatTime = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const handleSend = async () => {
    const text = inputRef.current?.value?.trim()
    if (!text || sending) return
    await sendMessage(text)
    if (inputRef.current) inputRef.current.value = ''
    sendTyping(false)
  }

  const handleAnswer = async (voicePreset: string) => {
    if (!incomingCallId) return
    try {
      await answerCall(incomingCallId, voicePreset)
      joinCallRoom(incomingCallId)
      setActiveCallId(incomingCallId)
      setShowCallModal(false)
      setIncomingCallId(null)
      setCallDuration(0)
      if (durationRef.current) clearInterval(durationRef.current)
      durationRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000)
      toast.success('Call connected')
    } catch (e: any) {
      toast.error(e.message || 'Failed to answer')
    }
  }

  const endActiveCall = async () => {
    if (activeCallId) await endCall(activeCallId).catch(() => {})
    setActiveCallId(null)
    setCallDuration(0)
    if (durationRef.current) {
      clearInterval(durationRef.current)
      durationRef.current = null
    }
  }

  // On mobile: when user is selected → show only chat
  const showList = !isMobile || !selectedUserId
  const showChat = !isMobile || !!selectedUserId

  // ---------- LOADING ----------
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  // ---------- LOGIN SCREEN ----------
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Support Portal</h1>
            <p className="text-white/50 text-sm mt-1">TradeRiser Customer Care Desk</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Email or Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin@traderiser.com"
                  className="pl-10 bg-black/50 border-white/10 text-white h-11"
                  autoFocus
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 bg-black/50 border-white/10 text-white h-11"
                  required
                />
              </div>
            </div>

            {loginError && (
              <p className="text-red-400 text-sm text-center bg-red-950/50 py-2 rounded-lg">
                {loginError}
              </p>
            )}

            <Button
              type="submit"
              disabled={loggingIn}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              {loggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in as Admin'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-white/30 mt-6">
            Only accounts with <code className="text-emerald-400">is_staff=True</code> can access.
          </p>
        </div>
      </div>
    )
  }

  // ---------- MAIN ADMIN DESK (RESPONSIVE) ----------
  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex bg-[#0b141a] text-white">
      {/* ========== THREAD LIST (Sidebar) ========== */}
      <div
        className={`${
          showList ? 'flex' : 'hidden'
        } w-full md:w-[380px] md:flex flex-col border-r border-white/10 bg-[#111b21] flex-shrink-0`}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#202c33] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-sm">
              TR
            </div>
            <div>
              <h1 className="font-semibold text-base">TradeRiser Support</h1>
              <p className="text-xs text-white/50 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected && callConnected ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                {isConnected ? 'Online' : 'Connecting...'} • {threads.length}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white/50 hover:text-white text-xs"
          >
            Logout
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-10 bg-[#202c33] border-none text-white placeholder:text-white/40 rounded-lg h-10"
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-16 text-white/40 text-sm px-4">
              No support chats yet.
              <br />
              Users appear here when they message.
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isSelected = selectedUserId === thread.user.id
              return (
                <button
                  key={`${thread.id}-${thread.user.id}`}
                  onClick={() => selectUser(thread.user.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3.5 hover:bg-[#202c33] transition-colors border-b border-white/5 text-left active:bg-[#2a3942] ${
                    isSelected ? 'bg-[#2a3942]' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-semibold text-lg uppercase">
                      {thread.user.username.charAt(0)}
                    </div>
                    {thread.is_blocked && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-[#111b21] text-[9px] flex items-center justify-center">
                        ⛔
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[15px] truncate">{thread.user.username}</h3>
                      <span className="text-[11px] text-white/40 flex-shrink-0 ml-2">
                        {formatTime(thread.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[13px] text-white/50 truncate max-w-[70%]">
                        {thread.last_message || 'No messages yet'}
                      </p>
                      {(thread.unread_count || 0) > 0 && (
                        <span className="ml-2 bg-emerald-500 text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {thread.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ========== CHAT WINDOW ========== */}
      <div
        className={`${
          showChat ? 'flex' : 'hidden'
        } flex-1 flex-col min-w-0 bg-[#0b141a]`}
      >
        {!currentThread ? (
          // Empty state (desktop only)
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-white/40">
            <MessageSquare className="w-20 h-20 mb-6 opacity-30" />
            <h2 className="text-2xl font-light text-white/70 mb-2">TradeRiser Admin Care</h2>
            <p className="text-sm max-w-sm text-center px-4">
              Select a conversation from the left to reply as{' '}
              <strong className="text-emerald-400">TradeRiser Support</strong>.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-3 py-2.5 bg-[#202c33] flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                {/* Back button - mobile only */}
                <button
                  onClick={() => selectUser(null)} // will clear selection
                  className="md:hidden p-2 -ml-1 rounded-full hover:bg-white/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-semibold uppercase">
                  {currentThread.user.username.charAt(0)}
                </div>
                <div>
                  <h2 className="font-medium text-[16px]">{currentThread.user.username}</h2>
                  <p className="text-xs text-white/50">
                    {isTyping ? (
                      <span className="text-emerald-400">typing...</span>
                    ) : currentThread.is_blocked ? (
                      <span className="text-red-400">Blocked</span>
                    ) : (
                      'TradeRiser Support'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 relative">
                {activeCallId ? (
                  <Button onClick={endActiveCall} size="sm" className="bg-red-600 hover:bg-red-500 rounded-full text-xs">
                    <PhoneOff className="w-4 h-4 mr-1" />
                    {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 rounded-full">
                    <Phone className="w-5 h-5" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>

                {showMenu && (
                  <div className="absolute right-0 top-12 w-52 bg-[#233138] rounded-xl shadow-2xl border border-white/10 py-1 z-50">
                    <button
                      onClick={async () => {
                        await doBlock('temp')
                        setShowMenu(false)
                        toast.success('User blocked 24h')
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2"
                    >
                      <Ban className="w-4 h-4 text-yellow-400" /> Block 24 hours
                    </button>
                    <button
                      onClick={async () => {
                        await doBlock('perm')
                        setShowMenu(false)
                        toast.success('User permanently blocked')
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 text-red-400"
                    >
                      <Ban className="w-4 h-4" /> Block permanently
                    </button>
                    <button
                      onClick={async () => {
                        await doBlock('unblock')
                        setShowMenu(false)
                        toast.success('User unblocked')
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 text-emerald-400"
                    >
                      <CheckCircle className="w-4 h-4" /> Unblock
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
              {messages.map((msg) => {
                const isMe = msg.is_me || msg.sender?.is_staff || msg.is_system
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-1.5 shadow-sm ${
                        isMe
                          ? 'bg-[#005c4b] text-white rounded-tr-none'
                          : 'bg-[#202c33] text-white rounded-tl-none'
                      }`}
                    >
                      {isMe && (
                        <p className="text-[11px] text-emerald-300 font-medium mb-0.5">
                          TradeRiser Support
                        </p>
                      )}
                      {!isMe && (
                        <p className="text-[11px] text-emerald-400 font-medium mb-0.5">
                          {msg.sender?.username || 'User'}
                        </p>
                      )}
                      <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <div className={`flex items-center justify-end gap-1 mt-0.5 text-[11px] ${isMe ? 'text-white/60' : 'text-white/40'}`}>
                        {formatTime(msg.sent_at)}
                      </div>
                    </div>
                  </div>
                )
              })}

              {isTyping && (
                <div className="flex justify-start mb-2">
                  <div className="bg-[#202c33] rounded-lg rounded-tl-none px-4 py-2.5">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2 bg-[#202c33] flex items-end gap-2 safe-area-bottom">
              <div className="flex-1 bg-[#2a3942] rounded-lg">
                <textarea
                  ref={inputRef}
                  placeholder="Reply as TradeRiser Support..."
                  rows={1}
                  className="w-full bg-transparent text-white placeholder-white/40 px-3 py-2.5 text-[15px] outline-none resize-none max-h-32"
                  style={{ minHeight: '42px' }}
                  onChange={() => sendTyping(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  onBlur={() => sendTyping(false)}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={sending}
                className="rounded-full bg-emerald-600 hover:bg-emerald-500 h-10 w-10 p-0 flex-shrink-0"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Call Modal */}
      {showCallModal && (
        <CallAnswerModal
          onAnswer={handleAnswer}
          onDecline={() => {
            setShowCallModal(false)
            setIncomingCallId(null)
          }}
        />
      )}

      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-100 px-4 py-2 rounded-lg text-sm z-50 max-w-[90%]">
          {error}
        </div>
      )}
    </div>
  )
}