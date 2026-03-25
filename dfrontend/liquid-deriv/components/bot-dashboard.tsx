'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useBot } from '@/hooks/use-bot'
import { LiquidGlassCard } from './liquid-glass-card'
import { GlassButton } from './glass-button'
import { formatCurrency, formatPercent } from '@/lib/utils'

export function BotDashboard() {
  const { bots, selectedBot, setSelectedBot, fetchBots, startBot, stopBot, pauseBot, resumeBot, deleteBot, isLoading, getBotStats } = useBot()

  useEffect(() => {
    fetchBots()
  }, [fetchBots])

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <LiquidGlassCard className="p-6">
          <h2 className="text-2xl font-bold gradient-text mb-2">Active Bots</h2>
          <p className="text-muted-foreground">Manage and monitor your trading bots</p>
        </LiquidGlassCard>
      </motion.div>

      {bots.length === 0 ? (
        <LiquidGlassCard className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No bots created yet. Start by creating your first bot!</p>
          <GlassButton variant="accent">Create Bot</GlassButton>
        </LiquidGlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bot List */}
          <div className="lg:col-span-1">
            <LiquidGlassCard className="p-6">
              <h3 className="font-semibold mb-4">Bots</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {bots.map((bot) => (
                  <motion.button
                    key={bot.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedBot(bot)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedBot?.id === bot.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{bot.name}</p>
                        <p className="text-xs opacity-75">{bot.symbol}</p>
                      </div>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          bot.status === 'running'
                            ? 'bg-success'
                            : bot.status === 'paused'
                              ? 'bg-warning'
                              : 'bg-muted-foreground'
                        }`}
                      />
                    </div>
                  </motion.button>
                ))}
              </div>
            </LiquidGlassCard>
          </div>

          {/* Bot Details */}
          {selectedBot && (
            <div className="lg:col-span-2 space-y-4">
              <LiquidGlassCard className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{selectedBot.name}</h3>
                    <p className="text-muted-foreground text-sm">{selectedBot.description}</p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedBot.status === 'running'
                        ? 'bg-success/20 text-success'
                        : selectedBot.status === 'paused'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    {selectedBot.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-muted-foreground text-sm">Symbol</p>
                    <p className="text-lg font-semibold">{selectedBot.symbol}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Contract Type</p>
                    <p className="text-lg font-semibold">{selectedBot.contractType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Stake</p>
                    <p className="text-lg font-semibold">{formatCurrency(selectedBot.stake)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Duration</p>
                    <p className="text-lg font-semibold">{selectedBot.duration + ' ' + selectedBot.durationUnit}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {selectedBot.status === 'running' ? (
                    <>
                      <GlassButton onClick={() => pauseBot(selectedBot.id)} size="sm">
                        Pause
                      </GlassButton>
                      <GlassButton onClick={() => stopBot(selectedBot.id)} size="sm" variant="danger">
                        Stop
                      </GlassButton>
                    </>
                  ) : selectedBot.status === 'paused' ? (
                    <>
                      <GlassButton onClick={() => resumeBot(selectedBot.id)} size="sm" variant="success">
                        Resume
                      </GlassButton>
                      <GlassButton onClick={() => stopBot(selectedBot.id)} size="sm" variant="danger">
                        Stop
                      </GlassButton>
                    </>
                  ) : (
                    <>
                      <GlassButton onClick={() => startBot(selectedBot.id)} size="sm" variant="success">
                        Start
                      </GlassButton>
                      <GlassButton onClick={() => deleteBot(selectedBot.id)} size="sm" variant="danger">
                        Delete
                      </GlassButton>
                    </>
                  )}
                </div>
              </LiquidGlassCard>

              {/* Bot Stats */}
              <LiquidGlassCard className="p-6">
                <h4 className="font-semibold mb-4">Performance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Trades</p>
                    <p className="text-2xl font-bold">{selectedBot.totalTrades}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Win Rate</p>
                    <p className="text-2xl font-bold text-success">{formatPercent(selectedBot.winRate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Total Profit</p>
                    <p className={`text-2xl font-bold ${selectedBot.totalProfit >= 0 ? 'text-success' : 'text-error'}`}>
                      {formatCurrency(selectedBot.totalProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Wins / Losses</p>
                    <p className="text-2xl font-bold">
                      <span className="text-success">{selectedBot.winningTrades}</span> / <span className="text-error">{selectedBot.losingTrades}</span>
                    </p>
                  </div>
                </div>
              </LiquidGlassCard>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
