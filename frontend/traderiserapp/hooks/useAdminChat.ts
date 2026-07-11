'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getActiveThreads,
  getAdminChat,
  sendAdminMessage,
  adminBlockUser,
  adminMarkMessagesRead,
  ChatMessage,
  ChatThread,
} from '@/lib/api'

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'wss://traderiserproapp.onrender.com'

export interface Thread {
  id: number
  user: { id: number; username: string; email?: string }
  last_message?: string | null
  last_message_at?: string | null
  is_blocked?: boolean
  unread_count?: number
}

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')?.trim().replace(/^"|"$/g, '') || null
}

function getAdminChatWSUrl(userId?: number | null) {
  const token = getToken()
  const params = new URLSearchParams()
  if (token) params.set('token', token)
  if (userId) params.set('user_id', String(userId))
  return `${WS_BASE}/ws/admin-chat/?${params.toString()}`
}

export function useAdminChat() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<NodeJS.Timeout | null>(null)
  const selectedRef = useRef<number | null>(null)
  const typingTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    selectedRef.current = selectedUserId
  }, [selectedUserId])

  const sortThreads = useCallback((list: Thread[]) => {
    return [...list].sort((a, b) => {
      const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return tb - ta
    })
  }, [])

  const loadThreads = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getActiveThreads()
      if (res.error) throw new Error(res.error)

      const list = (res.data || []).map((t: any) => ({
        id: t.id,
        user: t.user || { id: t.user_id || 0, username: t.username || 'User' },
        last_message: t.last_message ?? t.last_message_content ?? null,
        last_message_at: t.last_message_at ?? null,
        is_blocked: t.is_blocked ?? false,
        unread_count: t.unread_count ?? 0,
      })) as Thread[]

      setThreads(sortThreads(list))
    } catch (e: any) {
      setError(e.message || 'Failed to load threads')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [sortThreads])

  const connectWS = useCallback((userId?: number | null) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }

    const url = getAdminChatWSUrl(userId)
    console.log('[AdminChat] Connecting', url)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[AdminChat] ✅ Connected')
      setIsConnected(true)
      setError(null)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleMessage(data)
      } catch (err) {
        console.error('[AdminChat] parse error', err)
      }
    }

    ws.onclose = (e) => {
      setIsConnected(false)
      if (e.code !== 4003 && e.code !== 1000) {
        reconnectRef.current = setTimeout(() => connectWS(selectedRef.current), 3000)
      }
    }

    ws.onerror = () => setError('Admin chat WebSocket error')
  }, [])

  const handleMessage = useCallback(
    (data: any) => {
      if (data.type === 'chat_history') {
        const msgs = (data.messages || []).map((m: any) => ({
          ...m,
          is_me: m.is_me ?? m.sender?.is_staff === true,
        }))
        setMessages(msgs)
        return
      }

      if (data.type === 'new_message' || data.type === 'chat_message') {
        const msg: ChatMessage = {
          id: data.id,
          content: data.content,
          sent_at: data.sent_at,
          is_read: data.is_read,
          is_system: data.is_system,
          is_me: data.is_me ?? false,
          user_id: data.user_id,
          sender: data.sender || { username: 'User', is_staff: false },
        }

        const msgUserId = data.user_id as number | undefined

        // Only append if this conversation is open
        if (msgUserId && selectedRef.current === msgUserId) {
          setMessages((prev) => {
            // Already have this exact message ID
            if (prev.some((m) => m.id === msg.id)) return prev

            // Prevent double: if we just optimistically added the same content
            // (temp ID is a large timestamp), skip the WS echo
            const isRecentOptimistic = prev.some(
              (m) =>
                typeof m.id === 'number' &&
                m.id > 1e12 &&
                m.content === msg.content &&
                Math.abs(new Date(m.sent_at).getTime() - Date.now()) < 8000
            )
            if (isRecentOptimistic && (msg.is_system || msg.is_me || msg.sender?.is_staff)) {
              return prev
            }

            return [...prev, msg]
          })
        }

        // Update sidebar (most recent on top)
        if (msgUserId) {
          setThreads((prev) => {
            const exists = prev.some((t) => t.user.id === msgUserId)
            let next: Thread[]
            if (exists) {
              next = prev.map((t) =>
                t.user.id === msgUserId
                  ? {
                      ...t,
                      last_message: msg.content,
                      last_message_at: msg.sent_at,
                      unread_count: msg.is_me
                        ? t.unread_count || 0
                        : (t.unread_count || 0) + 1,
                    }
                  : t,
              )
            } else {
              next = [
                {
                  id: Date.now(),
                  user: {
                    id: msgUserId,
                    username: msg.sender?.username || `User ${msgUserId}`,
                  },
                  last_message: msg.content,
                  last_message_at: msg.sent_at,
                  unread_count: msg.is_me ? 0 : 1,
                },
                ...prev,
              ]
            }
            return sortThreads(next)
          })
        } else {
          loadThreads()
        }
        return
      }

      if (data.type === 'typing') {
        setIsTyping(!!data.is_typing)
        if (data.is_typing) {
          if (typingTimeout.current) clearTimeout(typingTimeout.current)
          typingTimeout.current = setTimeout(() => setIsTyping(false), 2500)
        }
      }
    },
    [loadThreads, sortThreads],
  )

  const selectUser = useCallback(
    async (userId: number | null) => {
      if (userId === null) {
        setSelectedUserId(null)
        setMessages([])
        setIsTyping(false)
        return
      }
      setSelectedUserId(userId)
      setMessages([])
      setIsTyping(false)

      // Clear unread for this thread
      setThreads((prev) =>
        prev.map((t) => (t.user.id === userId ? { ...t, unread_count: 0 } : t)),
      )

      try {
        // GET already marks user messages as read on backend
        const res = await getAdminChat(userId)
        if (res.data?.messages) {
          const msgs = res.data.messages.map((m: any) => ({
            ...m,
            is_me: m.is_me ?? m.sender?.is_staff === true,
          }))
          setMessages(msgs)
        }
        // Explicit mark-read (safe even if backend already did it)
        await adminMarkMessagesRead(userId).catch(() => {})
      } catch (e) {
        console.error(e)
      }

      // Focused WS connection for this user
      connectWS(userId)
    },
    [connectWS],
  )

  const sendMessage = useCallback(
    async (content: string) => {
      if (!selectedUserId || !content.trim() || sending) return
      setSending(true)
      try {
        // Optimistic UI
        const tempId = Date.now()
        const optimistic: ChatMessage = {
          id: tempId,
          content: content.trim(),
          sent_at: new Date().toISOString(),
          is_read: false,
          is_system: false,
          is_me: true,
          sender: { username: 'CustomerCare', is_staff: true },
        }
        setMessages((prev) => [...prev, optimistic])

        // REST (creates in DB + fires email signals)
        const res = await sendAdminMessage(selectedUserId, content.trim(), true)  // always system
        if (res.error) throw new Error(res.error)

        const saved = res.data!
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...saved,
                  is_me: true,
                  sender: { username: 'CustomerCare', is_staff: true },
                }
              : m,
          ),
        )

        // NOTE: Do NOT send via WebSocket here.
        // REST already creates the message.
        // Backend AdminChatView broadcasts it to the user via channel layer.
        // Sending here would create the message twice.

        // Move to top of sidebar
        setThreads((prev) =>
          sortThreads(
            prev.map((t) =>
              t.user.id === selectedUserId
                ? {
                    ...t,
                    last_message: content.trim(),
                    last_message_at: new Date().toISOString(),
                    unread_count: 0,
                  }
                : t,
            ),
          ),
        )
      } catch (e: any) {
        setError(e.message)
        setMessages((prev) => prev.filter((m) => m.id !== Date.now()))
      } finally {
        setSending(false)
      }
    },
    [selectedUserId, sending, sortThreads],
  )

  const sendTyping = useCallback(
    (isTypingNow: boolean) => {
      if (!selectedUserId || wsRef.current?.readyState !== WebSocket.OPEN) return
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          is_typing: isTypingNow,
          user_id: selectedUserId,
        }),
      )
    },
    [selectedUserId],
  )

  const doBlock = useCallback(
    async (action: 'temp' | 'perm' | 'unblock') => {
      if (!selectedUserId) return
      const res = await adminBlockUser(selectedUserId, action)
      if (res.error) throw new Error(res.error)
      await loadThreads()
    },
    [selectedUserId, loadThreads],
  )

  // Initial load + broad connection
  useEffect(() => {
    loadThreads()
    connectWS(null)
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
      wsRef.current?.close()
    }
  }, [loadThreads, connectWS])

  return {
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
    reloadThreads: loadThreads,
  }
}