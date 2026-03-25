import type { Symbol, ContractType } from './types'

export const DERIV_SYMBOLS: Symbol[] = [
  {
    id: 'frxeurxxx',
    code: 'EURUSD',
    name: 'Euro/US Dollar',
    displayName: 'EUR/USD',
    category: 'forex',
    precision: 5,
  },
  {
    id: 'frxgbpxxx',
    code: 'GBPUSD',
    name: 'British Pound/US Dollar',
    displayName: 'GBP/USD',
    category: 'forex',
    precision: 5,
  },
  {
    id: 'frxusdjpy',
    code: 'USDJPY',
    name: 'US Dollar/Japanese Yen',
    displayName: 'USD/JPY',
    category: 'forex',
    precision: 3,
  },
  {
    id: 'frxusdchf',
    code: 'USDCHF',
    name: 'US Dollar/Swiss Franc',
    displayName: 'USD/CHF',
    category: 'forex',
    precision: 5,
  },
  {
    id: 'cryBTCUSD',
    code: 'BTCUSD',
    name: 'Bitcoin/US Dollar',
    displayName: 'BTC/USD',
    category: 'crypto',
    precision: 2,
  },
  {
    id: 'cryETHUSD',
    code: 'ETHUSD',
    name: 'Ethereum/US Dollar',
    displayName: 'ETH/USD',
    category: 'crypto',
    precision: 2,
  },
  {
    id: 'XAUUSD',
    code: 'GOLD',
    name: 'Gold/US Dollar',
    displayName: 'Gold',
    category: 'commodities',
    precision: 2,
  },
  {
    id: 'XAGUSD',
    code: 'SILVER',
    name: 'Silver/US Dollar',
    displayName: 'Silver',
    category: 'commodities',
    precision: 3,
  },
  {
    id: 'frxNASDAQ100',
    code: 'NQ100',
    name: 'NASDAQ 100',
    displayName: 'NQ100',
    category: 'indices',
    precision: 1,
  },
  {
    id: 'frxSP500',
    code: 'US500',
    name: 'S&P 500',
    displayName: 'US500',
    category: 'indices',
    precision: 1,
  },
  {
    id: 'AAPL',
    code: 'AAPL',
    name: 'Apple Inc.',
    displayName: 'AAPL',
    category: 'stocks',
    precision: 2,
  },
  {
    id: 'MSFT',
    code: 'MSFT',
    name: 'Microsoft Corporation',
    displayName: 'MSFT',
    category: 'stocks',
    precision: 2,
  },
]

export const CONTRACT_TYPES: ContractType[] = [
  {
    id: 'CALL',
    name: 'Rise',
    code: 'CALL',
    description: 'Profit if the price rises above the entry',
    minStake: 1,
    maxStake: 50000,
    minPayout: 10,
    maxPayout: 500000,
  },
  {
    id: 'PUT',
    name: 'Fall',
    code: 'PUT',
    description: 'Profit if the price falls below the entry',
    minStake: 1,
    maxStake: 50000,
    minPayout: 10,
    maxPayout: 500000,
  },
  {
    id: 'CALL_SPREAD',
    name: 'Rise by',
    code: 'CALLSPREAD',
    description: 'Profit if the price rises above the higher barrier',
    minStake: 1,
    maxStake: 25000,
    minPayout: 10,
    maxPayout: 250000,
  },
  {
    id: 'PUT_SPREAD',
    name: 'Fall by',
    code: 'PUTSPREAD',
    description: 'Profit if the price falls below the lower barrier',
    minStake: 1,
    maxStake: 25000,
    minPayout: 10,
    maxPayout: 250000,
  },
]

export const DURATION_UNITS = [
  { value: 't', label: 'Tick(s)' },
  { value: 'minutes', label: 'Minute(s)' },
  { value: 'hours', label: 'Hour(s)' },
  { value: 'days', label: 'Day(s)' },
]

export const STAKE_PRESETS = [1, 5, 10, 25, 50, 100, 250, 500]

export const DURATION_PRESETS = {
  minutes: [1, 5, 15, 30, 60],
  hours: [1, 2, 4, 8],
  days: [1, 7, 30],
  t: [1, 5, 10, 50, 100],
}

export const CATEGORY_LABELS: Record<string, string> = {
  forex: 'Forex',
  crypto: 'Cryptocurrency',
  commodities: 'Commodities',
  indices: 'Indices',
  stocks: 'Stocks',
}

// Django Backend Configuration
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://traderiserproapp.onrender.com'
//const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8001'

export const API_ENDPOINTS = {
  // Base URLs
  BACKEND: BACKEND_URL,
  
  // OAuth & Authentication
  OAUTH_LOGIN: `${BACKEND_URL}/api/deriv/oauth/login/`,
  OAUTH_CALLBACK: `${BACKEND_URL}/api/deriv/oauth/callback/`,
  
  // Deriv Trading API
  PROPOSAL: `${BACKEND_URL}/api/deriv/proposal/`,
  BUY: `${BACKEND_URL}/api/deriv/buy/`,
  SELL: `${BACKEND_URL}/api/deriv/sell/`,
  BALANCE: `${BACKEND_URL}/api/deriv/balance/`,
  ACCOUNT_BALANCE: `${BACKEND_URL}/api/deriv/balance/`,
  OPEN_CONTRACTS: `${BACKEND_URL}/api/deriv/open-contract/`,
  CLOSE_CONTRACT: `${BACKEND_URL}/api/deriv/sell/`,
  
  // Bot Management
  BOTS_LIST: `${BACKEND_URL}/api/bots/`,
  BOT_CREATE: `${BACKEND_URL}/api/bots/create/`,
  BOT_DETAIL: `${BACKEND_URL}/api/bots/`,
  BOT_START: `${BACKEND_URL}/api/bots/start/`,
  BOT_STOP: `${BACKEND_URL}/api/bots/stop/`,
  BOT_PAUSE: `${BACKEND_URL}/api/bots/pause/`,
  BOT_RESUME: `${BACKEND_URL}/api/bots/resume/`,
  BOT_DELETE: `${BACKEND_URL}/api/bots/delete/`,
  
  // Markets
  MARKETS: `${BACKEND_URL}/api/markets/`,
  SYNTHETIC_MARKETS: `${BACKEND_URL}/api/markets/synthetic/`,
  
  // WebSocket
  //WS_TICKS: process.env.NEXT_PUBLIC_WS_TICKS || 'ws://localhost:8001/ws/deriv/ticks',
  WS_TICKS: process.env.NEXT_PUBLIC_WS_TICKS || 'wss://traderiserproapp.onrender.com/wss/deriv/ticks',
  //WS_BOT_UPDATES: process.env.NEXT_PUBLIC_WS_BOT_UPDATES || 'ws://localhost:8001/ws/bot-updates/',
  WS_BOT_UPDATES: process.env.NEXT_PUBLIC_WS_BOT_UPDATES || 'wss://traderiserproapp.onrender.com/wss/bot-updates/',
}

export const CHART_COLORS = {
  primary: '#00d4ff',
  secondary: '#8b5cf6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
}

export const TOAST_DURATION = 3000
export const NOTIFICATION_DURATION = 4000

export const MIN_CHART_HEIGHT = 300
export const DEFAULT_CHART_HEIGHT = 400
