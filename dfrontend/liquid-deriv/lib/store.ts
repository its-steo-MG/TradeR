'use client'

import { create } from 'zustand'
import type {
  AuthState,
  Tick,
  Symbol,
  ContractType,
  Proposal,
  OpenContract,
  AccountInfo,
  TradingState,
  Notification,
  Bot,
  BotStats,
  Market,
} from './types'

interface DerivStore {
  // Auth
  auth: AuthState
  setAuth: (auth: Partial<AuthState>) => void
  logout: () => void

  // Market Data
  ticks: Map<string, Tick>
  setTick: (tick: Tick) => void
  getTick: (symbol: string) => Tick | undefined
  clearTicks: () => void

  // Trading
  selectedSymbol: string | null
  setSelectedSymbol: (symbol: string | null) => void

  selectedContractType: string | null
  setSelectedContractType: (type: string | null) => void

  stake: number
  setStake: (stake: number) => void

  duration: number
  setDuration: (duration: number) => void

  durationUnit: 'minutes' | 'hours' | 'days' | 't'
  setDurationUnit: (unit: 'minutes' | 'hours' | 'days' | 't') => void

  // Proposals
  currentProposal: Proposal | null
  setCurrentProposal: (proposal: Proposal | null) => void

  // Open Contracts
  openContracts: OpenContract[]
  addOpenContract: (contract: OpenContract) => void
  removeOpenContract: (contractId: string) => void
  updateOpenContract: (contractId: string, updates: Partial<OpenContract>) => void
  clearOpenContracts: () => void

  // Account
  accountInfo: AccountInfo | null
  setAccountInfo: (info: AccountInfo | null) => void

  // UI State
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Notifications
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void

  // Error Handling
  error: string | null
  setError: (error: string | null) => void

  // Bots
  bots: Bot[]
  setBots: (bots: Bot[]) => void
  addBot: (bot: Bot) => void
  updateBot: (id: string, updates: Partial<Bot>) => void
  removeBot: (id: string) => void
  selectedBot: Bot | null
  setSelectedBot: (bot: Bot | null) => void

  // Markets
  markets: Market[]
  setMarkets: (markets: Market[]) => void
  updateMarket: (symbol: string, updates: Partial<Market>) => void

  // Reset
  reset: () => void
}

const initialState = {
  auth: {
    isLoggedIn: false,
  },
  ticks: new Map(),
  selectedSymbol: null,
  selectedContractType: null,
  stake: 10,
  duration: 5,
  durationUnit: 'minutes' as const,
  currentProposal: null,
  openContracts: [],
  accountInfo: null,
  isLoading: false,
  sidebarOpen: true,
  notifications: [],
  error: null,
  bots: [],
  selectedBot: null,
  markets: [],
}

export const useDerivStore = create<DerivStore>((set, get) => ({
  ...initialState,

  // Auth
  setAuth: (auth) =>
    set((state) => ({
      auth: { ...state.auth, ...auth },
    })),

  logout: () =>
    set((state) => ({
      auth: { isLoggedIn: false },
      accountInfo: null,
      openContracts: [],
      error: null,
    })),

  // Market Data
  setTick: (tick) =>
    set((state) => {
      const newTicks = new Map(state.ticks)
      newTicks.set(tick.symbol, tick)
      return { ticks: newTicks }
    }),

  getTick: (symbol) => {
    const { ticks } = get()
    return ticks.get(symbol)
  },

  clearTicks: () => set({ ticks: new Map() }),

  // Trading
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setSelectedContractType: (type) => set({ selectedContractType: type }),
  setStake: (stake) => set({ stake }),
  setDuration: (duration) => set({ duration }),
  setDurationUnit: (unit) => set({ durationUnit: unit }),

  // Proposals
  setCurrentProposal: (proposal) => set({ currentProposal: proposal }),

  // Open Contracts
  addOpenContract: (contract) =>
    set((state) => ({
      openContracts: [...state.openContracts, contract],
    })),

  removeOpenContract: (contractId) =>
    set((state) => ({
      openContracts: state.openContracts.filter((c) => c.contractId !== contractId),
    })),

  updateOpenContract: (contractId, updates) =>
    set((state) => ({
      openContracts: state.openContracts.map((c) =>
        c.contractId === contractId ? { ...c, ...updates } : c,
      ),
    })),

  clearOpenContracts: () => set({ openContracts: [] }),

  // Account
  setAccountInfo: (info) => set({ accountInfo: info }),

  // UI State
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Notifications
  addNotification: (notification) =>
    set((state) => {
      const id = `${Date.now()}-${Math.random()}`
      const newNotification = { ...notification, id }
      return {
        notifications: [...state.notifications, newNotification],
      }
    }),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),

  // Error Handling
  setError: (error) => set({ error }),

  // Bots
  setBots: (bots) => set({ bots }),
  addBot: (bot) =>
    set((state) => ({
      bots: [...state.bots, bot],
    })),
  updateBot: (id, updates) =>
    set((state) => ({
      bots: state.bots.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),
  removeBot: (id) =>
    set((state) => ({
      bots: state.bots.filter((b) => b.id !== id),
    })),
  setSelectedBot: (bot) => set({ selectedBot: bot }),

  // Markets
  setMarkets: (markets) => set({ markets }),
  updateMarket: (symbol, updates) =>
    set((state) => ({
      markets: state.markets.map((m) => (m.symbol === symbol ? { ...m, ...updates } : m)),
    })),

  // Reset
  reset: () => set(initialState),
}))
