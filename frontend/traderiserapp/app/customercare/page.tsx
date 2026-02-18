"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getChatThread, sendChatMessage, markMessagesAsRead } from "@/lib/api"
import { useWebSocketChat } from "@/hooks/use-websocket-chat"
import MessageBubble from "@/components/chat/message-bubble"
import TypingIndicator from "@/components/chat/typing-indicator"
import ChatInput from "@/components/chat/chat-input"
import ChatHeader from "@/components/chat/chat-header"
import BlockedMessage from "@/components/chat/blocked-message"
import { Sidebar } from "@/components/sidebar"
import { TopNavbar } from "@/components/top-navbar"
import { toast } from "sonner"
import type { ChatThread, ChatMessage } from "@/lib/api"

interface Account {
  id: number
  account_type: string
  balance: number
  kyc_verified?: boolean
}

interface User {
  username: string
  email: string
  phone: string
  is_sashi: boolean
  is_email_verified: boolean
  accounts: Account[]
}

export default function CustomerCarePage() {
  const [thread, setThread] = useState<ChatThread | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [loginType, setLoginType] = useState<string>("real")
  const router = useRouter()

  // Load token and user session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("access_token") || ""
    setToken(storedToken)

    const raw = localStorage.getItem("user_session")
    if (raw) {
      try {
        const data: User = JSON.parse(raw)
        setUser(data)
        setIsLoggedIn(true)

        const activeId = localStorage.getItem("active_account_id")
        const account = data.accounts.find((acc: Account) => acc.id === Number(activeId)) || data.accounts[0]
        setActiveAccount(account)
        setLoginType(account.account_type === "demo" ? "demo" : "real")
      } catch (err) {
        console.error("Failed to parse user session:", err)
      }
    }
  }, [])

  // Build WebSocket URL with token
  const wsUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/chat/"
    if (!token) return ""
    const separator = base.includes("?") ? "&" : "?"
    return `${base}${separator}token=${encodeURIComponent(token)}`
  }, [token])

  // Memoize WebSocket hook to prevent re-creation
  const { isConnected, send: wsSend } = useWebSocketChat(
    useMemo(
      () => ({
        url: wsUrl,
        onMessage: (message: ChatMessage) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev
            return [...prev, message]
          })
        },
        onTyping: (typing: boolean) => setIsTyping(typing),
        onError: (errorMsg: string) => {
          console.log("[Chat] WebSocket error:", errorMsg)
          setError("Connection issue. Reconnecting...")
        },
        onConnected: () => {
          setError(null)
        },
      }),
      [wsUrl],
    ),
  )

  // Fetch initial chat thread
  useEffect(() => {
    const loadChat = async () => {
      try {
        const response = await getChatThread()
        if (response.data) {
          setThread(response.data)
          setMessages(response.data.messages || [])
          await markMessagesAsRead()
        } else {
          setError(response.error || "Failed to load chat")
        }
      } catch (err) {
        setError("Failed to load chat history")
      } finally {
        setIsLoading(false)
      }
    }

    loadChat()
  }, [])

  // Handle sending message
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    try {
      const response = await sendChatMessage(content)
      if (response.data) {
        const newMessage = response.data
        setMessages((prev) => [...prev, newMessage])
      } else {
        setError(response.error || "Failed to send message")
      }
    } catch (err) {
      setError("Failed to send message")
    }
  }

  const handleSwitchAccount = async (account: Account) => {
    try {
      localStorage.setItem("active_account_id", account.id.toString())
      localStorage.setItem("account_type", account.account_type)
      localStorage.setItem("login_type", account.account_type === "demo" ? "demo" : "real")

      const updatedUser: User = {
        ...user!,
        accounts: user!.accounts.map((acc: Account) =>
          acc.id === account.id ? { ...acc, balance: Number(account.balance) || 0 } : acc,
        ),
      }
      setUser(updatedUser)
      setActiveAccount(account)
      setLoginType(account.account_type === "demo" ? "demo" : "real")
      localStorage.setItem("user_session", JSON.stringify(updatedUser))
      window.dispatchEvent(new Event("session-updated"))
    } catch (error) {
      console.error("Error switching account:", error)
      setError("Failed to switch account. Please try again.")
      toast.error("Failed to switch account. Please try again.")
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    setIsLoggedIn(false)
    setUser(null)
    setActiveAccount(null)
    setLoginType("real")
    router.push("/login")
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const availableAccounts =
    loginType === "real"
      ? (user?.accounts || []).filter((acc: Account) => acc.account_type !== "demo")
      : (user?.accounts || []).filter((acc: Account) => acc.account_type === "demo")

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-500"></div>
          <p className="text-sm text-gray-600">Loading your support chat...</p>
        </div>
      </div>
    )
  }

  if (thread?.block_info) {
    return <BlockedMessage blockInfo={thread.block_info} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopNavbar
        isLoggedIn={isLoggedIn}
        user={user}
        accountBalance={Number(activeAccount?.balance) || 0}
        showBalance={true}
        activeAccount={activeAccount}
        accounts={availableAccounts}
        onSwitchAccount={handleSwitchAccount}
        onLogout={handleLogout}
      />
      <div className="flex flex-1">
        <Sidebar
          loginType={loginType}
          activeAccount={activeAccount}
          accounts={availableAccounts}
          //onSwitchAccount={handleSwitchAccount}
        />
        <main className="flex-1 w-full overflow-auto md:pl-64 flex flex-col bg-gray-50">
          {/* Header */}
          <ChatHeader />

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto bg-white p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-4 text-4xl">Chat</div>
                  <p className="text-base font-semibold text-gray-800">Start a conversation</p>
                  <p className="mt-2 text-sm text-gray-600">Our support team is here to help</p>
                </div>
              </div>
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}

            {/* Typing Indicator */}
            {isTyping && <TypingIndicator />}

            {/* Connection Status */}
            {!isConnected && (
              <div className="mx-auto rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800 max-w-xs">
                Reconnecting to support...
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mx-auto rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 max-w-xs">
                {error}
                <button onClick={() => setError(null)} className="ml-2 font-semibold underline hover:no-underline">
                  Dismiss
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <ChatInput onSendMessage={handleSendMessage} disabled={!!thread?.block_info} />
        </main>
      </div>
    </div>
  )
}
