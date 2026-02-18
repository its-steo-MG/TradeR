import { api } from "./api"

interface UserAccount {
  id: number
  account_type: string
  balance?: number | string
  [key: string]: unknown
}

interface UserData {
  accounts?: UserAccount[]
  [key: string]: unknown
}

interface AccountResponse {
  user?: UserData | null
  account?: Record<string, unknown> | null
}

export async function getAccountData() {
  const response = await api.getAccount()
  if (response.error) {
    throw new Error(response.error)
  }

  // Parse user session from localStorage as fallback
  const userSession = localStorage.getItem("user_session")
  const activeAccountId = localStorage.getItem("active_account_id")

  const data = response.data as AccountResponse | null

  return {
    user: data?.user || (userSession ? JSON.parse(userSession) : null),
    account: data?.account,
    accounts: data?.user?.accounts || [],
    activeAccountId: activeAccountId ? Number.parseInt(activeAccountId) : null,
  }
}

export async function switchAccountHelper(accountId: number) {
  const response = await api.switchAccount({ account_id: accountId })
  if (response.error) {
    throw new Error(response.error)
  }
  return response.data
}

export function logout() {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("user_session")
  localStorage.removeItem("account_type")
  localStorage.removeItem("login_type")
  localStorage.removeItem("active_account_id")
  window.location.href = "/login"
}
