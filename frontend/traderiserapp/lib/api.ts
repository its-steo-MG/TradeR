// lib/api.ts (updated with suspension typing)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
//const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://binaryfx.onrender.com/api"

interface ApiResponse<T> {
  data?: T
  error?: string
  status?: number
}
interface Number {
  replace?: number
}

export interface Currency {
  code: string
  name: string
}

export interface Wallet {
  id: number
  account_type: string
  wallet_type: string
  balance: string | number
  currency: Currency
  created_at: string
}

export interface Account {
  account_type: string
  login: string
  balance?: number
  activeAccount: boolean
}

export interface WalletTransaction {
  id: number
  transaction_type: string
  amount: string
  currency: Currency
  status: string
  created_at: string
  converted_amount?: string
  target_currency?: Currency
  exchange_rate_used?: number
  reference_id?: string
  checkout_request_id?: string
}

export interface MpesaNumberResponse {
  phone_number: string
}

export interface ForexPair {
  id: number
  name: string
  base_currency: string
  quote_currency: string
  pip_value: number
  contract_size: number
  spread: number
  base_simulation_price: number
}

export interface ForexRobot {
  id: number
  name: string
  description: string
  win_rate_normal: number
  win_rate_sashi: number
  price: number
  is_active: boolean
  created_at: string
  image_url?: string
  image?: string
  discounted_price?: number
  effective_price?: number
  original_price?: number
}
export interface RobotRaw {
  price?: number
}

export interface UserRobot {
  id: number
  user: number
  robot: ForexRobot
  is_running: boolean
  stake_amount: number
  interval_seconds: number
  created_at: string
  updated_at: string
  purchased_at: string
  last_trade_time?: string
  user_robots?:UserRobot[]
}

export interface BotLog {
  id: number
  user_robot: number
  pair: ForexPair
  entry_price: number
  exit_price: number
  result: "win" | "loss"
  p_l: number
  trade_time: string
  timestamp: string
  message: string
  profit_loss?: number | string
  trade_result?: "win" | "loss"
}

export interface Position {
  id: number
  user: number
  account: number
  pair: ForexPair
  direction: "buy" | "sell"
  volume_lots: number
  entry_price: number
  sl?: number
  tp?: number
  floating_p_l: number
  status: "open" | "closed"
  entry_time: string
  time_frame: string
}

export interface ForexTrade {
  id: number
  position: Position
  close_price: number
  realized_p_l: number
  close_time: string
  close_reason: string
}

export interface WalletBalance {
  balance: number
  currency: string
  account_type: string
}

export interface Agent {
  id: number
  name: string
  method: string
  location: string
  rating: number
  reviews: number
  deposit_rate_kes_to_usd: number
  withdrawal_rate_usd_to_kes: number
  min_amount?: number
  max_amount?: number
  response_time?: string
  verified: boolean
  image?: string
  instructions?: string
}

export interface AgentDeposit {
  id: number
  agent: number
  amount_kes: number
  amount_usd: number
  status: "pending" | "verified" | "rejected"
  screenshot_url?: string
  created_at: string
}

export interface AgentWithdrawal {
  id: number
  agent: number
  amount_usd: number
  amount_kes: number
  phone_number: string
  status: "pending" | "otp_sent" | "verified" | "completed" | "cancelled"
  otp_code?: string
  created_at: string
}

export interface ChatMessage {
  id: number
  content: string
  sent_at: string
  is_read: boolean
  is_system: boolean
  sender: {
    id: number
    username: string
    email: string
    is_staff: boolean
  }
  is_me: boolean
}

export interface ChatThread {
  id: number
  is_active: boolean
  messages: ChatMessage[]
  block_info: {
    type?: "permanent" | "temporary"
    title?: string
    message?: string
    can_request_review?: boolean
  } | null
}

export interface UserSession {
  id?: number
  username?: string
  email?: string
  accounts?: UserAccount[]
  [key: string]: unknown
}

export interface UserAccount {
  id: number
  account_type: string
  balance: number
  [key: string]: unknown
}

export interface InitiateManagementResponse {
  management_id: string
  payment_amount: number
  message: string
}

export interface Trader {
  id: number
  user: number
  username?: string
  bio: string
  risk_level: "low" | "medium" | "high"
  min_allocation: number
  performance_fee_percent: number
  is_active: boolean
  win_rate: number
  average_return: number
  subscriber_count: number
  created_at: string
  is_verified?: boolean
}

export interface CopySubscription {
  id: number
  user: number
  account: number
  trader: Trader
  allocated_amount: number
  max_drawdown_percent: number
  is_active: boolean
  created_at: string
  updated_at: string
  current_pnl?: number
  copied_trades?: number
}

export interface CreateSubscriptionPayload {
  trader: number
  account: number
  allocated_amount: number
  max_drawdown_percent?: number
}

export interface BecomeTraderPayload {
  bio: string
  risk_level: "low" | "medium" | "high"
  min_allocation: number
  performance_fee_percent: number
}

// Newly added Signal generation interface
export interface Signal {
  id: number
  market: {
    id: number
    name: string
    profit_multiplier:number
  }
  direction: "buy" | "sell"
  probability: number
  take_profit: number
  stop_loss: number
  generated_at: string
  message?: string
  timeframe?: string
  current_price?: number
  strength?:number
}

// Suspension interfaces (new)
export interface SuspensionDetails {
  reason?: string;
  until?: string;
  evidence_status?: string;
  appeal_available?: boolean;
  [key: string]: unknown;
}

export interface SuspensionInfo {
  code: "suspended_temporary" | "suspended_permanent";
  details: SuspensionDetails;
}

export type LoginResponseData = {
  access: string;
  refresh: string;
  user: UserSession;
  active_account: Record<string, unknown>;
  suspension?: SuspensionInfo;  // ← NEW: Optional suspension field
};

/* ------------------------------------------------------------------ */
/*  TOKEN KEYS – MUST MATCH login/signup response                     */
/* ------------------------------------------------------------------ */
const ACCESS_KEY = "access_token"
const REFRESH_KEY = "refresh_token"
const ADMIN_KEY = "is_admin"

const getAccess = () => localStorage.getItem(ACCESS_KEY)
const getRefresh = () => localStorage.getItem(REFRESH_KEY)
const setAccess = (token: string) => localStorage.setItem(ACCESS_KEY, token)
const clearAuth = () => {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem("account_type")
  localStorage.removeItem("login_type")
  localStorage.removeItem("user_session")
  localStorage.removeItem("active_account_id")
  localStorage.removeItem(ADMIN_KEY)
}

/* ------------------------------------------------------------------ */
/*  REFRESH TOKEN – uses correct endpoint                             */
/* ------------------------------------------------------------------ */
export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefresh()
  if (!refresh) return null

  try {
    const res = await fetch(`${API_BASE_URL}/accounts/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })

    if (!res.ok) {
      console.error("[api] Refresh failed:", await res.json().catch(() => ({})))
      clearAuth()
      return null
    }

    const { access } = (await res.json()) as { access: string }
    setAccess(access)
    return access
  } catch (e) {
    console.error("[api] Refresh network error:", e)
    clearAuth()
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  CORE JSON REQUEST                                                 */
/* ------------------------------------------------------------------ */
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`

  const token = getAccess()
  const headers = new Headers({
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  })
  if (token) headers.set("Authorization", `Bearer ${token}`)

  let resp = await fetch(url, { ...options, headers })

  // Auto-refresh on 401
  if (resp.status === 401 && token && !endpoint.includes("token/refresh")) {
    const newToken = await refreshAccessToken()
    if (!newToken) {
      return { error: "Session expired. Please log in again.", status: 401 }
    }
    headers.set("Authorization", `Bearer ${newToken}`)
    resp = await fetch(url, { ...options, headers })
  }

  let json: T | Record<string, unknown>
  try {
    json = (await resp.json()) as T | Record<string, unknown>
  } catch {
    return { error: "Invalid JSON from server", status: resp.status }
  }

  if (!resp.ok) {
    const detail = (json as Record<string, unknown>)?.detail
    const error = (json as Record<string, unknown>)?.error
    const msg =
      (typeof detail === "string" ? detail : undefined) ??
      (typeof error === "string" ? error : undefined) ??
      `Request failed (${resp.status})`
    return { error: msg, status: resp.status }
  }

  return { data: json as T, status: resp.status }
}

/* ------------------------------------------------------------------ */
/*  FILE UPLOAD REQUEST (Agent Deposit)                               */
/* ------------------------------------------------------------------ */
export async function apiRequestWithFile<T>(
  endpoint: string,
  formData: FormData,
  options: Omit<RequestInit, "body"> = {},
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
  const token = getAccess()
  const headers = new Headers(options.headers as Record<string, string>)

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  // DO NOT set Content-Type → let browser set multipart boundary

  let resp = await fetch(url, {
    ...options,
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  })

  // Token refresh logic...
  if (resp.status === 401 && token && !endpoint.includes("token/refresh")) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`)
      resp = await fetch(url, { ...options, method: "POST", headers, body: formData, credentials: "include" })
    }
  }

  let json: T | Record<string, unknown>
  try {
    json = (await resp.json()) as T | Record<string, unknown>
  } catch {
    return { error: "Invalid JSON from server", status: resp.status }
  }

  if (!resp.ok) {
    const detail = (json as Record<string, unknown>)?.detail
    const error = (json as Record<string, unknown>)?.error
    const msg =
      (typeof detail === "string" ? detail : undefined) ??
      (typeof error === "string" ? error : undefined) ??
      `Request failed (${resp.status})`
    return { error: msg, status: resp.status }
  }

  return { data: json as T, status: resp.status }
}
/* ------------------------------------------------------------------ */
/*  AUTH METHODS                                                      */
/* ------------------------------------------------------------------ */
export const signup = async (data: {
  username: string
  email: string
  password: string
  phone?: string
  account_type: string
  referral_code?: string;
}) => {
  const response = await apiRequest<{
    access: string
    refresh: string
    user: UserSession
    active_account: Record<string, unknown>
  }>("/accounts/signup/", {
    method: "POST",
    body: JSON.stringify(data),
  })

  if (response.data) {
    localStorage.setItem("access_token", response.data.access)
    localStorage.setItem("refresh_token", response.data.refresh)
    localStorage.setItem("account_type", data.account_type)
    localStorage.setItem("login_type", data.account_type === "demo" ? "demo" : "real")
    const normalizedUser: UserSession = {
      ...response.data.user,
      accounts: ((response.data.user.accounts || []) as UserAccount[]).map((acc: UserAccount) => ({
        ...acc,
        balance: Number(acc.balance) || 0,
      })),
    }
    localStorage.setItem("user_session", JSON.stringify(normalizedUser))
    const defaultAccount =
      (normalizedUser.accounts as UserAccount[])?.find((acc: UserAccount) => acc.account_type === data.account_type) ||
      (normalizedUser.accounts as UserAccount[])?.[0]
    if (defaultAccount) {
      localStorage.setItem("active_account_id", defaultAccount.id.toString())
    }
  }

  return response
}

export const login = async (data: { email: string; password: string; account_type: string }) => {
  const response = await apiRequest<LoginResponseData>("/accounts/login/", {
    method: "POST",
    body: JSON.stringify(data),
  })

  if (response.data) {
    localStorage.setItem("access_token", response.data.access)
    localStorage.setItem("refresh_token", response.data.refresh)
    localStorage.setItem("account_type", data.account_type)
    localStorage.setItem("login_type", data.account_type === "demo" ? "demo" : "real")
    const normalizedUser: UserSession = {
      ...response.data.user,
      accounts: ((response.data.user.accounts || []) as UserAccount[]).map((acc: UserAccount) => ({
        ...acc,
        balance: Number(acc.balance) || 0,
      })),
    }
    localStorage.setItem("user_session", JSON.stringify(normalizedUser))
    const defaultAccount =
      (normalizedUser.accounts as UserAccount[])?.find((acc: UserAccount) => acc.account_type === data.account_type) ||
      (normalizedUser.accounts as UserAccount[])?.[0]
    if (defaultAccount) {
      localStorage.setItem("active_account_id", defaultAccount.id.toString())
    }
  }

  return response
}

export const adminLogin = async (data: { username: string; password: string }) => {
  const response = await apiRequest<{
    access: string
    refresh: string
    user: UserSession
  }>("/accounts/admin/login/", {
    method: "POST",
    body: JSON.stringify(data),
  })

  if (response.data) {
    localStorage.setItem("access_token", response.data.access)
    localStorage.setItem("refresh_token", response.data.refresh)
    localStorage.setItem(ADMIN_KEY, "true")
    const normalizedUser: UserSession = {
      ...response.data.user,
    }
    localStorage.setItem("user_session", JSON.stringify(normalizedUser))
  }

  return response
}

export const createAdditionalAccount = (data: { account_type: string }) =>
  apiRequest("/accounts/account/create/", { method: "POST", body: JSON.stringify(data) })

export const getAccount = () => apiRequest("/accounts/account/")

export const switchAccount = async (data: { account_id: number }) => {
  const response = await apiRequest<{ user: UserSession; account: UserAccount }>("/accounts/wallet/switch/", {
    method: "POST",
    body: JSON.stringify(data),
  })

  if (response.data) {
    const { user, account } = response.data
    if (user && account) {
      const normalizedUser: UserSession = {
        ...user,
        accounts: ((user.accounts || []) as UserAccount[]).map((acc: UserAccount) => ({
          ...acc,
          balance: Number(acc.balance) || 0,
        })),
      }
      localStorage.setItem("user_session", JSON.stringify(normalizedUser))
      localStorage.setItem("account_type", (account.account_type as string) || "")
      localStorage.setItem("login_type", (account.account_type as string) === "demo" ? "demo" : "real")
      localStorage.setItem("active_account_id", data.account_id.toString())
      return { data: { user, account }, status: 200 }
    }
  }

  return response
}

/* ------------------------------------------------------------------ */
/*  TRADING & WALLET                                                  */
/* ------------------------------------------------------------------ */
export const getMarkets = () => apiRequest("/trading/markets/")
export const getTradeTypes = () => apiRequest("/trading/trade-types/")
export const getAssets = () => apiRequest("/trading/assets/")
export const placeTrade = (data: Record<string, unknown>) =>
  apiRequest("/trading/trades/place/", { method: "POST", body: JSON.stringify(data) })
export const getTradeHistory = () => apiRequest("/trading/trades/history/")
export const cancelTrade = (tradeId: number) => apiRequest(`/trading/trades/${tradeId}/cancel/`, { method: "POST" })
export const getPriceHistory = (data: { symbol: string; timeframe: string }) =>
  apiRequest("/trading/price-history/", { method: "POST", body: JSON.stringify(data) })

export const getRobots = () => apiRequest("/trading/robots/")
export const getUserRobots = () => apiRequest("/trading/user-robots/")
export const purchaseRobot = (
  robotId: number,
  account_type: "standard" | "demo" = "standard", // default to real account
) =>
  apiRequest<{
    message: string
  }>(`/trading/robots/${robotId}/purchase/`, {
    method: "POST",
    body: JSON.stringify({ account_type }),
  })

export const resetDemoBalance = () => apiRequest("/accounts/demo/reset/", { method: "POST" })

export const getBots = () => apiRequest("/bots/")
export const createBot = (data: Record<string, unknown>) =>
  apiRequest("/bots/", { method: "POST", body: JSON.stringify(data) })
export const toggleBot = (botId: number) => apiRequest(`/bots/${botId}/toggle/`, { method: "POST" })

export const getSubscription = () => apiRequest("/bots/subscription/")
export const subscribe = () => apiRequest("/bots/subscription/", { method: "POST" })

export const getDashboard = async () => {
  const response = await apiRequest<{ user?: UserSession }>("/dashboard/")
  if (response.data?.user) {
    const user = response.data.user
    const normalizedUser: UserSession = {
      ...user,
      accounts: ((user.accounts || []) as UserAccount[]).map((acc: UserAccount) => ({
        ...acc,
        balance: Number(acc.balance) || 0,
      })),
    }
    localStorage.setItem("user_session", JSON.stringify(normalizedUser))
    const defaultAccount =
      (normalizedUser.accounts as UserAccount[])?.find(
        (acc: UserAccount) => acc.account_type === localStorage.getItem("account_type"),
      ) || (normalizedUser.accounts as UserAccount[])?.[0]
    if (defaultAccount) {
      localStorage.setItem("active_account_id", defaultAccount.id.toString())
    }
  }
  return response
}

export const getWallets = async () => {
  const response = await apiRequest<{ wallets: Wallet[] }>("/wallet/wallets/")
  if (response.data?.wallets) {
    response.data.wallets = response.data.wallets.map((wallet: Wallet) => ({
      ...wallet,
      balance: Number(wallet.balance) || 0,
    }))
  }
  return response
}

export const getWalletTransactions = () => apiRequest<{ transactions: WalletTransaction[] }>("/wallet/transactions/")

export const deposit = (data: {
  amount: number
  currency: string
  wallet_type: string
  mpesa_phone: string
  account_type: string
}) => apiRequest("/wallet/deposit/", { method: "POST", body: JSON.stringify(data) })

export const withdrawOTP = (data: { amount: number; wallet_type: string; account_type: string }) =>
  apiRequest("/wallet/withdraw/otp/", { method: "POST", body: JSON.stringify(data) })

export const verifyWithdrawal = (data: { code: string; transaction_id: number }) =>
  apiRequest("/wallet/withdraw/verify/", { method: "POST", body: JSON.stringify(data) })

export const getMpesaNumber = () => apiRequest<MpesaNumberResponse>("/wallet/mpesa-number/")
export const setMpesaNumber = (data: { phone_number: string }) =>
  apiRequest("/wallet/mpesa-number/", { method: "POST", body: JSON.stringify(data) })

export const resendOTP = (transactionId: string) =>
  apiRequest("/wallet/resend-otp/", { method: "POST", body: JSON.stringify({ transaction_id: transactionId }) })

// Newly added endpoints for transfers
export const initiateTransfer = (data: {
  amount: number
  sender_account_type: string
  recipient_email: string
  recipient_account_type: string
}) =>
  apiRequest<{ transaction_id: string }>("/wallet/transfer/initiate/", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const verifyTransfer = (data: { otp: string; transaction_id: number }) =>
  apiRequest<{ message: string }>("/wallet/transfer/verify/", {
    method: "POST",
    body: JSON.stringify(data),
  })

// Signal generation endpoint
export const generateSignal = () => apiRequest<Signal>("/trading/signals/generate/", { method: "POST" })

/* ------------------------------------------------------------------ */
/*  FOREX TRADING                                                     */
/* ------------------------------------------------------------------ */
export const getForexPairs = () => apiRequest<{ pairs: ForexPair[] }>("/forex/pairs/")
export const getForexCurrentPrices = (pairIds: number[]) =>
  apiRequest(`/forex/current-prices/?ids=${pairIds.join(",")}`)
export const getForexCurrentPrice = (pairId: number) =>
  apiRequest<{ current_price: number }>(`/forex/current-price/${pairId}/`)

export const placeForexOrder = (data: {
  pair_id: number
  direction: "buy" | "sell"
  volume_lots: number
  sl?: number
  tp?: number
}) => apiRequest<{ position: Position }>("/forex/orders/place/", { method: "POST", body: JSON.stringify(data) })

export const getForexPositions = () => apiRequest<{ positions: Position[] }>("/forex/positions/")
export const closeForexPosition = (positionId: number) =>
  apiRequest<{ message: string }>(`/forex/positions/${positionId}/close/`, { method: "POST" })
export const closeAllPositions = () =>
  apiRequest<{ message: string }>("/forex/positions/close-all/", { method: "POST" })
export const getForexHistory = () => apiRequest<{ trades: ForexTrade[] }>("/forex/history/")

export const getForexRobots = () => apiRequest<{ robots: ForexRobot[] }>("/forex/robots/")
export const getMyForexRobots = () => apiRequest<{ user_robots: UserRobot[] }>("/forex/my-robots/")
export const purchaseForexRobot = (robotId: number) =>
  apiRequest<{ user_robot: UserRobot }>(`/forex/robots/${robotId}/purchase/`, { method: "POST" })

export const toggleForexRobot = (
  userRobotId: number,
  config?: { stake?: number; pair_id?: number; timeframe?: string },
) =>
  apiRequest<{ is_running: boolean; message?: string }>(
    `/forex/robots/${userRobotId}/toggle/`,
    config ? { method: "POST", body: JSON.stringify(config) } : { method: "POST" },
  )

export const getForexBotLogs = () => apiRequest<{ bot_logs: BotLog[] }>("/forex/robot-logs/")
export const getForexBotLogsByRobot = (userRobotId: number) =>
  apiRequest<{ bot_logs: BotLog[] }>(`/forex/robot-logs/?user_robot_id=${userRobotId}`)

/* ------------------------------------------------------------------ */
/*  AGENTS                                                            */
/* ------------------------------------------------------------------ */
export const getAgents = () => apiRequest<{ agents: Agent[] }>("/agents/list/")
export const getAgentById = (agentId: number) => apiRequest<{ agent: Agent }>(`/agents/${agentId}/`)

export const createAgentDeposit = async (data: {
  agent_id: number
  account: number
  amount_kes: number
  transaction_code: string
  screenshot?: File
  method: string
}) => {
  const fd = new FormData()
  fd.append("agent", data.agent_id.toString())
  fd.append("account", data.account.toString())
  fd.append("amount_kes", data.amount_kes.toString())

  const method = data.method.toLowerCase()

  if (method === "mpesa") {
    fd.append("transaction_code", data.transaction_code)
    if (!data.screenshot) return { error: "Screenshot required for M-Pesa" } as ApiResponse<AgentDeposit>
    fd.append("screenshot", data.screenshot)
  } else if (method === "paypal") {
    fd.append("paypal_transaction_id", data.transaction_code)
  } else if (method === "bank_transfer") {
    fd.append("bank_reference", data.transaction_code)
    if (!data.screenshot) return { error: "Screenshot required for Bank Transfer" } as ApiResponse<AgentDeposit>
    fd.append("screenshot", data.screenshot)
  }

  return apiRequestWithFile<AgentDeposit>("/agents/deposit/", fd)
}

export const verifyAgentDeposit = (data: { deposit_id: number; action: string }) =>
  apiRequest("/agents/deposit/verify/", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const requestAgentWithdrawal = (data: {
  agent: number
  account: number
  amount_usd: number
  phone_number?: string // Optional for M-Pesa
  user_paypal_email?: string // For PayPal
  user_bank_name?: string // For bank
  user_bank_account_name?: string
  user_bank_account_number?: string
  user_bank_swift?: string
}) =>
  apiRequest<{ id: number }>("/agents/withdraw/request/", {
    method: "POST",
    body: JSON.stringify({
      agent: data.agent,
      account: data.account,
      amount_usd: data.amount_usd,
      // Conditionally include fields to avoid sending unexpected ones
      ...(data.phone_number && { phone_number: data.phone_number }),
      ...(data.user_paypal_email && { user_paypal_email: data.user_paypal_email }),
      ...(data.user_bank_name && { user_bank_name: data.user_bank_name }),
      ...(data.user_bank_account_name && { user_bank_account_name: data.user_bank_account_name }),
      ...(data.user_bank_account_number && { user_bank_account_number: data.user_bank_account_number }),
      ...(data.user_bank_swift && { user_bank_swift: data.user_bank_swift }),
    }),
  })

export const verifyAgentWithdrawal = (data: {
  withdrawal_id: number
  otp: string
}) =>
  apiRequest<{ message: string }>("/agents/withdraw/verify/", {
    method: "POST",
    body: JSON.stringify({
      withdrawal_id: data.withdrawal_id,
      otp: data.otp,
    }),
  })

export const resendAgentOTP = (transactionId: number) =>
  apiRequest<{ message: string }>("/withdrawals/resend-otp/", {
    method: "POST",
    body: JSON.stringify({ transaction_id: transactionId }),
  })

export const getAgentDeposits = () => apiRequest<{ deposits: AgentDeposit[] }>("/deposits/my-deposits/")
export const getAgentWithdrawals = () => apiRequest<{ withdrawals: AgentWithdrawal[] }>("/withdrawals/my-withdrawals/")

export const getChatThread = () => apiRequest<ChatThread>("/customercare/chat/")

export const sendChatMessage = (content: string) =>
  apiRequest<ChatMessage>("/customercare/chat/", {
    method: "POST",
    body: JSON.stringify({ content }),
  })

export const markMessagesAsRead = () => apiRequest("/customercare/chat/mark-read/", { method: "POST" })

export const requestReview = () => apiRequest("/customercare/chat/review/", { method: "POST" })

export const getActiveThreads = () => apiRequest<{ threads: ChatThread[] }>("/customercare/admin/threads/")

export const getAdminChat = (userId: number) => apiRequest<ChatThread>(`/customercare/admin/chat/${userId}/`)

export const sendAdminMessage = (userId: number, content: string) =>
  apiRequest<ChatMessage>(`/customercare/admin/chat/${userId}/`, {
    method: "POST",
    body: JSON.stringify({ content }),
  })

export const adminBlockUser = (userId: number, action: "temp" | "perm" | "unblock", reason?: string) =>
  apiRequest(`/customercare/admin/block/${userId}/`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  })

export const getUser = () => apiRequest<{ id: number; is_staff: boolean }>("/accounts/account/")

export const verifyEmailOtp = (data: { email: string; otp: string }) =>
  apiRequest<{ message: string }>("/accounts/verify-email/", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const resendEmailOtp = (email: string) =>
  apiRequest<{ message: string }>("/accounts/resend-otp/", {
    method: "POST",
    body: JSON.stringify({ email }),
  })

// --- PASSWORD RESET ---
export const requestPasswordReset = (email: string) =>
  apiRequest<{ message: string }>("/accounts/password-reset/", {
    method: "POST",
    body: JSON.stringify({ email }),
  })

export const verifyPasswordResetOtp = (data: { email: string; otp: string }) =>
  apiRequest<{ message: string }>("/accounts/password-reset/verify/", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const confirmPasswordReset = (data: {
  email: string
  otp: string
  new_password: string
  confirm_password: string
}) =>
  apiRequest<{ message: string }>("/accounts/password-reset/confirm/", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const initiateManagement = (data: {
  stake: number
  target_profit: number
  mpesa_phone: string
  account_type: "standard" | "pro-fx"
}) =>
  apiRequest<InitiateManagementResponse>("/management/initiate/", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const submitCredentials = (data: {
  management_id: string
  account_email: string
  account_password: string
}) =>
  apiRequest("/management/credentials/", {
    method: "POST",
    body: JSON.stringify(data),
  })

export const getManagementStatus = () => apiRequest<ManagementRequest[]>("/management/status/")

export interface ManagementRequest {
  id: number
  management_id: string
  user: string
  stake: number
  target_profit: number
  payment_amount: number
  status: string
  status_display: string
  current_pnl: number
  days: number | null
  daily_target_profit: number | null
  start_date: string | null
  end_date: string | null
  created_at: string
  account_type: "standard" | "pro-fx"
}

/**
 * Fetch all active traders from the leaderboard
 */
export async function fetchTraders() {
  return apiRequest<Trader[]>("/copy-trading/traders/", {
    method: "GET",
  })
}

/**
 * Apply to become a trader (signal provider)
 */
export async function applyToBecomeTrader(payload: BecomeTraderPayload) {
  return apiRequest<Trader>("/copy-trading/become-trader/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/**
 * Create or update a copy subscription
 */
export async function createCopySubscription(payload: CreateSubscriptionPayload) {
  return apiRequest<CopySubscription>("/copy-trading/subscriptions/create/", {
    method: "POST",
    body: JSON.stringify({
      trader: payload.trader,
      account: payload.account || 1, // Default to first account; should be user's account
      allocated_amount: payload.allocated_amount,
      max_drawdown_percent: payload.max_drawdown_percent || 20,
    }),
  })
}

/**
 * Fetch all subscriptions for the current user
 */
export async function fetchUserSubscriptions() {
  return apiRequest<CopySubscription[]>("/copy-trading/subscriptions/", {
    method: "GET",
  })
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(subscriptionId: number) {
  return apiRequest<{ message: string }>(`/copy-trading/subscriptions/${subscriptionId}/pause/`, {
    method: "DELETE",
  })
}

/**
 * Resume a paused subscription
 */
export async function resumeSubscription(subscriptionId: number, allocatedAmount: number) {
  return apiRequest<CopySubscription>("/copy-trading/subscriptions/create/", {
    method: "POST",
    body: JSON.stringify({
      subscription_id: subscriptionId,
      allocated_amount: allocatedAmount,
    }),
  })
}

/* ------------------------------------------------------------------ */
/*  Account Suspension                                               */
/* ------------------------------------------------------------------ */

// Option 1: Most precise (recommended if you know the exact shape)
export async function appealSuspension(formData: FormData) {
  return apiRequestWithFile<{
    message: string;
    evidence?: {
      id: string | number;
      url: string;
      filename?: string;
      uploaded_at?: string;
      // add any other fields your backend actually returns
    } | null;
  }>(
    "/accounts/appeal-suspension/",
    formData,
    {} // no extra options needed
  );
}
/* ------------------------------------------------------------------ */
/*  EXPORT API OBJECT                                                 */
/* ------------------------------------------------------------------ */
export const api = {
  signup,
  login,
  adminLogin,
  getAccount,
  createAccount: createAdditionalAccount,
  switchAccount,
  getMarkets,
  getTradeTypes,
  getAssets,
  placeTrade,
  getTradeHistory,
  cancelTrade,
  getPriceHistory,
  getRobots,
  getUserRobots,
  purchaseRobot,
  resetDemoBalance,
  getBots,
  createBot,
  toggleBot,
  getSubscription,
  subscribe,
  getDashboard,
  getWallets,
  getWalletTransactions,
  deposit,
  withdrawOTP,
  verifyWithdrawal,
  getMpesaNumber,
  setMpesaNumber,
  resendOTP,
  getForexPairs,
  getForexCurrentPrices,
  getForexCurrentPrice,
  placeForexOrder,
  getForexPositions,
  closeForexPosition,
  closeAllPositions,
  getForexHistory,
  getForexRobots,
  getMyForexRobots,
  purchaseForexRobot,
  toggleForexRobot,
  getForexBotLogs,
  getForexBotLogsByRobot,
  getAgents,
  getAgentById,
  createAgentDeposit,
  verifyAgentDeposit,
  requestAgentWithdrawal,
  verifyAgentWithdrawal,
  resendAgentOTP,
  getAgentDeposits,
  getAgentWithdrawals,
  getChatThread,
  sendChatMessage,
  markMessagesAsRead,
  requestReview,
  getActiveThreads,
  verifyEmailOtp,
  resendEmailOtp,
  requestPasswordReset,
  verifyPasswordResetOtp,
  confirmPasswordReset,
  initiateTransfer,
  verifyTransfer,
  generateSignal,
  appealSuspension,
}
