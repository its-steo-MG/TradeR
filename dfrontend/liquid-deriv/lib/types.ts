// Auth Types
export interface AuthState {
  isLoggedIn: boolean
  token?: string
  userId?: string
  email?: string
}

// Market Types
export interface Tick {
  symbol: string
  bid: number
  ask: number
  timestamp: number
  isClosed: boolean
}

export interface Symbol {
  id: string
  code: string
  name: string
  category: 'forex' | 'crypto' | 'commodities' | 'indices' | 'stocks'
  displayName: string
  precision: number
}

// Contract Types
export interface ContractType {
  id: string
  name: string
  code: string
  description: string
  minStake: number
  maxStake: number
  minPayout: number
  maxPayout: number
}

export interface ProposalRequest {
  symbol: string
  contractType: string
  stake: number
  duration: number
  durationUnit: 'minutes' | 'hours' | 'days' | 't'
  barrier?: string
  barrierOffset?: string
}

export interface Proposal {
  id: string
  contractId?: string
  expiryTime: number
  payout: number
  premium: number
  spotEntry: number
  spotEntryTime: number
  status: 'active' | 'expired'
  askPrice: number
}

export interface BuyRequest {
  proposalId: string
  price: number
}

export interface BuyResponse {
  contractId: string
  buyPrice: number
  expiryTime: number
}

export interface OpenContract {
  contractId: string
  contractType: string
  entrySpot: number
  entryTime: number
  expiryTime: number
  isWon?: boolean
  payout?: number
  profit?: number
  spotEntry: number
  status: 'open' | 'closed' | 'won' | 'lost'
  symbol: string
}

// Account Types
export interface AccountInfo {
  balance: number
  currency: string
  email: string
  firstName?: string
  lastName?: string
  accountType?: string
}

// Trading State
export interface TradingState {
  selectedSymbol: string | null
  selectedContractType: string | null
  stake: number
  duration: number
  durationUnit: 'minutes' | 'hours' | 'days' | 't'
  barrier?: string
  currentProposal: Proposal | null
  lastPayout?: number
}

// WebSocket Message Types
export interface WSMessage {
  type: 'tick' | 'proposal' | 'buy' | 'account' | 'error'
  data: any
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Notification Types
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  title?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Bot Types
export type BotStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'error'
export type BotType = 'deriv' | 'custom'

export interface BotConfig {
  name: string
  description?: string
  type: BotType
  symbol: string
  contractType: string
  stake: number
  durationUnit: 'minutes' | 'hours' | 'days' | 't'
  duration: number
  maxTrades?: number
  takeProfit?: number
  stopLoss?: number
  enabled: boolean
  settings?: Record<string, any>
}

export interface Bot {
  id: string
  name: string
  description?: string
  type: BotType
  status: BotStatus
  symbol: string
  contractType: string
  stake: number
  duration: number
  durationUnit: 'minutes' | 'hours' | 'days' | 't'
  maxTrades?: number
  takeProfit?: number
  stopLoss?: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalProfit: number
  winRate: number
  active: boolean
  createdAt: string
  updatedAt: string
  lastRunAt?: string
  nextRunAt?: string
  settings?: Record<string, any>
  code?: string // For custom bots
}

export interface BotStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalProfit: number
  winRate: number
  averageWin: number
  averageLoss: number
  profitFactor: number
}

export interface BotLog {
  id: string
  botId: string
  timestamp: number
  action: string
  status: string
  details?: Record<string, any>
}

// Market Types
export interface Market {
  id: string
  symbol: string
  name: string
  category: 'forex' | 'crypto' | 'commodities' | 'indices' | 'stocks' | 'synthetic'
  isOpen: boolean
  bid: number
  ask: number
  timestamp: number
  change24h?: number
  volume?: number
}

export interface SyntheticMarket extends Market {
  synthetic: true
  volatility: number
  spread: number
  trend: 'up' | 'down' | 'sideways'
}
