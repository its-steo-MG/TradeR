'use client'

import { useCallback, useState } from 'react'
import { useDerivStore } from '@/lib/store'
import type { Bot, BotConfig, BotStats } from '@/lib/types'
import { API_ENDPOINTS } from '@/lib/constants'

export function useBot() {
  const {
    bots,
    setBots,
    addBot,
    updateBot,
    removeBot,
    selectedBot,
    setSelectedBot,
    setError,
    addNotification,
  } = useDerivStore()

  const [isLoading, setIsLoading] = useState(false)
  const [botStats, setBotStats] = useState<Record<string, BotStats>>({})

  // Fetch all bots
  const fetchBots = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(API_ENDPOINTS.BOTS_LIST, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch bots')
      }

      const data = await response.json()
      const botsList = Array.isArray(data) ? data : data.results || data.bots || []
      setBots(botsList)
      return botsList
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch bots'
      setError(message)
      addNotification({
        type: 'error',
        message,
        title: 'Bot Fetch Error',
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [setBots, setError, addNotification])

  // Create a new bot
  const createBot = useCallback(
    async (config: BotConfig) => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(API_ENDPOINTS.BOT_CREATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(config),
        })

        if (!response.ok) {
          throw new Error('Failed to create bot')
        }

        const newBot = await response.json()
        addBot(newBot)
        addNotification({
          type: 'success',
          message: `Bot "${newBot.name}" created successfully`,
          title: 'Bot Created',
        })
        return newBot
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create bot'
        setError(message)
        addNotification({
          type: 'error',
          message,
          title: 'Bot Creation Error',
        })
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [addBot, setError, addNotification],
  )

  // Start a bot
  const startBot = useCallback(
    async (botId: string) => {
      try {
        setError(null)

        const response = await fetch(`${API_ENDPOINTS.BOT_DETAIL}${botId}/start/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to start bot')
        }

        const updatedBot = await response.json()
        updateBot(botId, { status: 'running' })
        addNotification({
          type: 'success',
          message: 'Bot started successfully',
          title: 'Bot Running',
        })
        return updatedBot
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start bot'
        setError(message)
        addNotification({
          type: 'error',
          message,
          title: 'Start Bot Error',
        })
        return null
      }
    },
    [updateBot, setError, addNotification],
  )

  // Stop a bot
  const stopBot = useCallback(
    async (botId: string) => {
      try {
        setError(null)

        const response = await fetch(`${API_ENDPOINTS.BOT_DETAIL}${botId}/stop/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to stop bot')
        }

        const updatedBot = await response.json()
        updateBot(botId, { status: 'stopped' })
        addNotification({
          type: 'success',
          message: 'Bot stopped successfully',
          title: 'Bot Stopped',
        })
        return updatedBot
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to stop bot'
        setError(message)
        addNotification({
          type: 'error',
          message,
          title: 'Stop Bot Error',
        })
        return null
      }
    },
    [updateBot, setError, addNotification],
  )

  // Pause a bot
  const pauseBot = useCallback(
    async (botId: string) => {
      try {
        setError(null)

        const response = await fetch(`${API_ENDPOINTS.BOT_DETAIL}${botId}/pause/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to pause bot')
        }

        const updatedBot = await response.json()
        updateBot(botId, { status: 'paused' })
        addNotification({
          type: 'success',
          message: 'Bot paused successfully',
          title: 'Bot Paused',
        })
        return updatedBot
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to pause bot'
        setError(message)
        addNotification({
          type: 'error',
          message,
          title: 'Pause Bot Error',
        })
        return null
      }
    },
    [updateBot, setError, addNotification],
  )

  // Resume a bot
  const resumeBot = useCallback(
    async (botId: string) => {
      try {
        setError(null)

        const response = await fetch(`${API_ENDPOINTS.BOT_DETAIL}${botId}/resume/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to resume bot')
        }

        const updatedBot = await response.json()
        updateBot(botId, { status: 'running' })
        addNotification({
          type: 'success',
          message: 'Bot resumed successfully',
          title: 'Bot Resumed',
        })
        return updatedBot
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to resume bot'
        setError(message)
        addNotification({
          type: 'error',
          message,
          title: 'Resume Bot Error',
        })
        return null
      }
    },
    [updateBot, setError, addNotification],
  )

  // Delete a bot
  const deleteBot = useCallback(
    async (botId: string) => {
      try {
        setError(null)

        const response = await fetch(`${API_ENDPOINTS.BOT_DETAIL}${botId}/delete/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to delete bot')
        }

        removeBot(botId)
        if (selectedBot?.id === botId) {
          setSelectedBot(null)
        }

        addNotification({
          type: 'success',
          message: 'Bot deleted successfully',
          title: 'Bot Deleted',
        })
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete bot'
        setError(message)
        addNotification({
          type: 'error',
          message,
          title: 'Delete Bot Error',
        })
        return false
      }
    },
    [removeBot, selectedBot, setSelectedBot, setError, addNotification],
  )

  // Get bot stats
  const getBotStats = useCallback(
    (botId: string): BotStats | null => {
      const bot = bots.find((b) => b.id === botId)
      if (!bot) return null

      return {
        totalTrades: bot.totalTrades,
        winningTrades: bot.winningTrades,
        losingTrades: bot.losingTrades,
        totalProfit: bot.totalProfit,
        winRate: bot.winRate,
        averageWin: bot.totalTrades > 0 ? bot.totalProfit / Math.max(1, bot.winningTrades) : 0,
        averageLoss: bot.losingTrades > 0 ? -Math.abs(bot.totalProfit) / bot.losingTrades : 0,
        profitFactor:
          bot.losingTrades > 0
            ? (bot.totalProfit / bot.winningTrades) / (Math.abs(bot.totalProfit) / bot.losingTrades)
            : bot.winningTrades > 0
              ? bot.totalProfit / bot.winningTrades
              : 0,
      }
    },
    [bots],
  )

  return {
    bots,
    selectedBot,
    setSelectedBot,
    botStats,
    isLoading,
    fetchBots,
    createBot,
    startBot,
    stopBot,
    pauseBot,
    resumeBot,
    deleteBot,
    getBotStats,
  }
}
