"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { ManagementForm } from "@/components/management/management-form"
import { StatusTracker } from "@/components/management/status-tracker"
import { CredentialsForm } from "@/components/management/credentials-form"
import { ManagementHistory } from "@/components/management/management-history"
import { useToast } from "@/hooks/use-toast"
import { getManagementStatus, type ManagementRequest } from "@/lib/api"
import { CheckCircle2, TrendingUp } from "lucide-react"
import type { Account } from "@/types/account"

export default function ManagementPage() {
  const { toast } = useToast()
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loginType, setLoginType] = useState<"real" | "demo">("real")
  const [currentRequest, setCurrentRequest] = useState<ManagementRequest | null>(null)
  const [allRequests, setAllRequests] = useState<ManagementRequest[]>([])
  const [isPolling, setIsPolling] = useState(false)

  // Load user session and set active account
  useEffect(() => {
    const userSession = localStorage.getItem("user_session")
    const storedLoginType = localStorage.getItem("login_type") as "real" | "demo"
    const activeAccountId = localStorage.getItem("active_account_id")

    if (userSession) {
      const user = JSON.parse(userSession)
      const userAccounts = (user?.accounts || []) as Account[]
      setAccounts(userAccounts)
      setLoginType(storedLoginType || "real")

      if (activeAccountId) {
        const active = userAccounts.find((acc) => acc.id === Number(activeAccountId))
        if (active) setActiveAccount(active)
      } else if (userAccounts.length > 0) {
        setActiveAccount(userAccounts[0])
      }
    }
  }, [])

  // Fetch management status
  const fetchStatus = async (silent = false) => {
    try {
      const response = await getManagementStatus()
      if (response.data) {
        setAllRequests(response.data)

        // Find the most recent request that's pending or active
        const latest = response.data.find(
          (req) =>
            req.status === "pending_payment" ||
            req.status === "payment_verified" ||
            req.status === "credentials_pending" ||
            req.status === "active",
        )

        if (latest) {
          setCurrentRequest(latest)

          // Start polling if payment is pending
          if (latest.status === "pending_payment" && !isPolling) {
            setIsPolling(true)
          }
        }
      }
    } catch (error) {
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to fetch management status",
          variant: "destructive",
        })
      }
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [])

  // Polling effect
  useEffect(() => {
    if (!isPolling) return

    const interval = setInterval(() => {
      fetchStatus(true)
    }, 15000) // Poll every 15 seconds

    return () => clearInterval(interval)
  }, [isPolling])

  // Stop polling when payment is verified
  useEffect(() => {
    if (currentRequest?.status !== "pending_payment" && isPolling) {
      setIsPolling(false)
    }
  }, [currentRequest?.status])

  const handleInitiateSuccess = (managementId: string) => {
    toast({
      title: "Payment Initiated",
      description: "Complete the M-Pesa payment on your phone",
    })
    setIsPolling(true)
    fetchStatus()
  }

  const handleCredentialsSuccess = () => {
    toast({
      title: "Credentials Submitted",
      description: "Admin will start management soon",
    })
    fetchStatus()
  }

  const showInitiateForm =
    !currentRequest || currentRequest.status === "completed" || currentRequest.status === "failed"

  const showCredentialsForm = currentRequest?.status === "payment_verified"

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Sidebar
        loginType={loginType}
        activeAccount={activeAccount}
        accounts={accounts}
        onSwitchAccount={(acc) => setActiveAccount(acc)}
      />

      <main className="flex-1 md:ml-64 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 sm:space-y-3 px-2">
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-balance">
                Account Management Service
              </h1>
            </div>
            <p className="text-white/70 text-base sm:text-lg">Get professional trading management on your account</p>
          </div>

          {/* Status Tracker - Always show if there's a current request */}
          {currentRequest && (
            <StatusTracker
              status={currentRequest.status}
              managementId={currentRequest.management_id}
              currentPnl={currentRequest.current_pnl}
              targetProfit={currentRequest.target_profit}
              startDate={currentRequest.start_date}
              endDate={currentRequest.end_date}
            />
          )}

          {/* Main Content */}
          <div className="grid gap-4 sm:gap-6">
            {/* Initiate Management Form */}
            {showInitiateForm && <ManagementForm onSuccess={handleInitiateSuccess} />}

            {/* Credentials Form */}
            {showCredentialsForm && (
              <CredentialsForm managementId={currentRequest.management_id} onSuccess={handleCredentialsSuccess} />
            )}

            {/* Waiting Message for Active Status */}
            {currentRequest?.status === "credentials_pending" && (
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Waiting for Admin Activation</h3>
                    <p className="text-sm sm:text-base text-white/70">
                      Your credentials have been submitted successfully. Our admin team will review and activate your
                      account management shortly. You will receive an email notification once activated.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Management Info */}
            {currentRequest?.status === "active" && (
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Management Active</h3>
                    <p className="text-sm sm:text-base text-white/70 mb-4">
                      Your account is currently being managed by our professional team.
                    </p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-black/20 rounded-lg p-3">
                        <p className="text-white/60 text-xs sm:text-sm">Target</p>
                        <p className="text-white font-semibold text-base sm:text-lg">
                          ${currentRequest.target_profit.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-black/20 rounded-lg p-3">
                        <p className="text-white/60 text-xs sm:text-sm">Current P/L</p>
                        <p
                          className={`font-semibold text-base sm:text-lg ${
                            currentRequest.current_pnl >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          ${currentRequest.current_pnl.toFixed(2)}
                        </p>
                      </div>
                      {currentRequest.days && (
                        <div className="bg-black/20 rounded-lg p-3">
                          <p className="text-white/60 text-xs sm:text-sm">Duration</p>
                          <p className="text-white font-semibold text-base sm:text-lg">{currentRequest.days} days</p>
                        </div>
                      )}
                      {currentRequest.daily_target_profit && (
                        <div className="bg-black/20 rounded-lg p-3">
                          <p className="text-white/60 text-xs sm:text-sm">Daily Target</p>
                          <p className="text-white font-semibold text-base sm:text-lg">
                            ${currentRequest.daily_target_profit.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Management History */}
            {allRequests.length > 0 && <ManagementHistory requests={allRequests} />}
          </div>
        </div>
      </main>
    </div>
  )
}
