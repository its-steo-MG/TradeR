'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useDerivStore } from '@/lib/store'
import { useDerivAPI, useDerivWebSocket } from '@/hooks/use-deriv'
import { API_ENDPOINTS, DERIV_SYMBOLS } from '@/lib/constants'
import { TradePanel } from '@/components/trade-panel'
import { ProposalDisplay } from '@/components/proposal-display'
import { TickDisplay } from '@/components/tick-display'
import { BalanceCard } from '@/components/balance-card'
import { OpenPositions } from '@/components/open-positions'
import { GlassButton } from '@/components/glass-button'
import { LiquidGlassCard } from '@/components/liquid-glass-card'
import { Menu, X, LogOut, Bot, TrendingUp } from 'lucide-react'
import { BotDashboard } from '@/components/bot-dashboard'
import { BotBuilder } from '@/components/bot-builder'
import { useAuth } from '@/hooks/use-auth'

export default function Dashboard() {
  const {
    selectedSymbol,
    setSelectedSymbol,
    currentProposal,
    setCurrentProposal,
    openContracts,
    accountInfo,
    sidebarOpen,
    setSidebarOpen,
    notifications,
    removeNotification,
  } = useDerivStore()

  const { isAuthenticated, loginWithDeriv, logout } = useAuth()

  const { fetchBalance, fetchOpenContracts } = useDerivAPI()
  const { isConnected } = useDerivWebSocket()

  const [isInitialized, setIsInitialized] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState<'trade' | 'bots'>('trade')

  // Initialize symbol
  useEffect(() => {
    if (!selectedSymbol && DERIV_SYMBOLS.length > 0) {
      setSelectedSymbol(DERIV_SYMBOLS[0].code)
    }
  }, [selectedSymbol, setSelectedSymbol])

  // Fetch initial data
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([fetchBalance(), fetchOpenContracts()])
      setIsInitialized(true)
    }

    if (isAuthenticated && !isInitialized) {
      initializeData()
    }
  }, [isAuthenticated, isInitialized, fetchBalance, fetchOpenContracts])

  // Auto-refresh balance
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchBalance])

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const currentTick = useDerivStore((state) => state.getTick(selectedSymbol || ''))
  const selectedSymbolData = DERIV_SYMBOLS.find((s) => s.code === selectedSymbol)
  const precision = selectedSymbolData?.precision || 5

  // Auth Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <LiquidGlassCard className="p-8 space-y-6 text-center">
            <h1 className="text-4xl font-bold gradient-text">Deriv Trading</h1>
            <p className="text-muted-foreground text-lg">
              Connect your Deriv account to start trading
            </p>
            <GlassButton 
              onClick={loginWithDeriv} 
              variant="accent" 
              fullWidth 
              size="lg"
              className="mt-4"
            >
              Connect Deriv Account
            </GlassButton>
          </LiquidGlassCard>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: sidebarOpen ? 0 : -320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`fixed left-0 top-0 h-full w-80 glass-dark z-50 border-r border-border flex flex-col
          ${isMobile ? 'shadow-2xl' : ''}`}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h1 className="text-2xl font-bold gradient-text tracking-tight">DERIV</h1>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* WS Status */}
          <div className="flex items-center gap-3 text-sm">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-muted-foreground">
              {isConnected ? 'Market Live' : 'Connecting...'}
            </span>
          </div>

          {/* Balance */}
          <BalanceCard
            balance={accountInfo?.balance}
            currency={accountInfo?.currency}
            email={accountInfo?.email}
            onRefresh={fetchBalance}
          />

          {/* Quick Trade */}
          <TradePanel />
        </div>

        {/* Logout */}
        <div className="p-6 border-t border-border mt-auto">
          <GlassButton onClick={logout} variant="danger" fullWidth size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </GlassButton>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen && !isMobile ? 'lg:ml-80' : ''} min-h-screen`}>
        {/* Top Navigation */}
        <div className="glass-dark sticky top-0 z-40 border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-3 hover:bg-white/10 rounded-xl transition-colors"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <h2 className="text-xl font-semibold hidden md:block">
              {selectedSymbolData?.name || 'Trading Dashboard'}
            </h2>

            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('trade')}
                  className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'trade' 
                      ? 'bg-white text-black shadow' 
                      : 'hover:bg-white/10'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Trade
                </button>
                <button
                  onClick={() => setActiveTab('bots')}
                  className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'bots' 
                      ? 'bg-white text-black shadow' 
                      : 'hover:bg-white/10'
                  }`}
                >
                  <Bot className="w-4 h-4 inline mr-2" />
                  Bots
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {activeTab === 'trade' ? (
            <div className="space-y-6">
              {/* Market + Proposal */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <TickDisplay
                    tick={currentTick}
                    symbol={selectedSymbol || 'EUR/USD'}
                    precision={precision}
                  />
                </div>

                <div>
                  <ProposalDisplay
                    proposal={currentProposal}
                    onClose={() => setCurrentProposal(null)}
                  />
                </div>
              </div>

              {/* Open Positions */}
              {openContracts.length > 0 && (
                <OpenPositions contracts={openContracts} />
              )}

              {/* Info Cards */}
              <LiquidGlassCard className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground">Symbol</p>
                    <p className="font-semibold mt-1">{selectedSymbolData?.displayName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">WebSocket</p>
                    <p className={`font-semibold mt-1 ${isConnected ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Open Positions</p>
                    <p className="font-semibold mt-1">{openContracts.length}</p>
                  </div>
                  {accountInfo && (
                    <div>
                      <p className="text-muted-foreground">Balance</p>
                      <p className="font-semibold mt-1">
                        ${accountInfo.balance.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </LiquidGlassCard>
            </div>
          ) : (
            /* Bots Tab */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-bold">Trading Bots</h3>
              </div>
              <div className="grid gap-6">
                <BotDashboard />
                <LiquidGlassCard className="p-6">
                  <h3 className="text-2xl font-bold mb-6">Create New Bot</h3>
                  <BotBuilder />
                </LiquidGlassCard>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full px-4 md:px-0">
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20, x: 50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 50 }}
            transition={{ delay: index * 0.05 }}
          >
            <LiquidGlassCard
              className={`p-5 ${
                notification.type === 'error'
                  ? 'border-red-500/30 bg-red-950/50'
                  : notification.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-950/50'
                  : 'border-amber-500/30 bg-amber-950/50'
              }`}
            >
              <div className="flex justify-between">
                <div>
                  {notification.title && (
                    <p className="font-semibold mb-1">{notification.title}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="text-muted-foreground hover:text-white transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </LiquidGlassCard>
          </motion.div>
        ))}
      </div>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}