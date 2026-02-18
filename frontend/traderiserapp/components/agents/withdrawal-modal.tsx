"use client"

import { useState, useEffect } from "react"
import { X, Loader2, ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { api, type UserAccount } from "@/lib/api"

interface WithdrawalModalProps {
  agent: {
    id: number
    name: string
    method: string
    withdrawal_rate_usd_to_kes: number
    min_amount?: number
    max_amount?: number
  }
  onClose: () => void
  onSuccess?: () => void
}

export default function WithdrawalModal({ agent, onClose, onSuccess }: WithdrawalModalProps) {
  const [step, setStep] = useState<"amount" | "details" | "otp" | "done">("amount")
  const [amountUsd, setAmountUsd] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [accountId, setAccountId] = useState<number | null>(null)
  const [withdrawalId, setWithdrawalId] = useState<number | null>(null)

  const [paypalEmail, setPaypalEmail] = useState("")
  const [bankName, setBankName] = useState("")
  const [accName, setAccName] = useState("")
  const [accNumber, setAccNumber] = useState("")
  const [swift, setSwift] = useState("")
  const [mpesaPhone, setMpesaPhone] = useState("")

  useEffect(() => {
    ;(async () => {
      try {
        const res = await api.getAccount()
        const accountsData = ((res.data as { user?: { accounts?: UserAccount[] } })?.user?.accounts ?? []) as UserAccount[]
        const allowed = accountsData.filter((a: UserAccount) => ["standard", "pro-fx"].includes(a.account_type))
        setAccounts(allowed)
        if (allowed[0]) setAccountId(allowed[0].id)
      } catch {
        toast.error("Could not load accounts")
      }
    })()
  }, [])

  if (!agent) {
    return null
  }

  const method = agent.method.toLowerCase()
  const rate = agent.withdrawal_rate_usd_to_kes
  const kes = amountUsd ? (Number(amountUsd) * rate).toFixed(0) : "0"

  const isAmountOk = () => Number(amountUsd) >= 10

  const requestWithdraw = async () => {
    if (!accountId || !isAmountOk()) return
    setLoading(true)

    const payload: Record<string, string | number> = {
      agent: agent.id,
      account: accountId,
      amount_usd: Number(amountUsd),
    }

    if (method === "paypal") payload.user_paypal_email = paypalEmail.trim()
    if (method === "bank_transfer") {
      payload.user_bank_name = bankName.trim()
      payload.user_bank_account_name = accName.trim()
      payload.user_bank_account_number = accNumber.trim()
      if (swift.trim()) payload.user_bank_swift = swift.trim()
    }
    if (method === "mpesa") payload.phone_number = mpesaPhone.trim()

    try {
      const resp = await api.requestAgentWithdrawal(payload as Parameters<typeof api.requestAgentWithdrawal>[0])
      if (resp.error) {
        let msg = "Request failed"
        if (typeof resp.error === "string") {
          msg = resp.error
        } else if (typeof resp.error === "object" && resp.error !== null) {
          const errorObj = resp.error as Record<string, unknown>
          msg = (errorObj.detail as string) || (errorObj.error as string) || "Request failed"
        }
        toast.error(msg)
        return
      }
      setWithdrawalId((resp.data?.id as number) || null)
      setStep("otp")
      toast.success("OTP sent! Check your email")
    } catch (err) {
      const errorMessage = (err as Error).message || "Please try again"
      toast.error("Network error: " + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (otp.length !== 6 || !withdrawalId) return
    setLoading(true)
    try {
      const resp = await api.verifyAgentWithdrawal({ withdrawal_id: withdrawalId, otp })
      if (resp.error) {
        let msg = "Verification failed"
        if (typeof resp.error === "string") {
          msg = resp.error
        } else if (typeof resp.error === "object" && resp.error !== null) {
          const errorObj = resp.error as Record<string, unknown>
          msg = (errorObj.detail as string) || (errorObj.error as string) || "Verification failed"
        }
        toast.error(msg)
        return
      }
      setStep("done")
      toast.success("Withdrawal confirmed!")
      onSuccess?.()
    } catch (err) {
      const errorMessage = (err as Error).message || "Please try again"
      toast.error("Network error: " + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-5 text-white">
          <div className="flex items-center justify-between">
            {step !== "amount" && (
              <button onClick={() => setStep(step === "otp" ? "details" : "amount")} className="p-1">
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <h2 className="text-xl font-bold flex-1 text-center">
              {step === "amount"
                ? "Withdraw"
                : step === "details"
                  ? "Your Details"
                  : step === "otp"
                    ? "Verify OTP"
                    : "Done!"}
            </h2>
            <button onClick={onClose} className="p-1">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {step === "amount" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">From Account</label>
                <select
                  value={accountId || ""}
                  onChange={(e) => setAccountId(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border-2 border-purple-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition bg-white text-slate-900"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_type === "standard" ? "TradR" : "Pro-FX"} • ${a.balance}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Amount (USD)</label>
                <input
                  type="number"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(e.target.value)}
                  placeholder="10.00"
                  min="10"
                  step="0.01"
                  className="w-full p-4 text-2xl font-bold text-center rounded-xl border-2 border-purple-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition bg-white text-slate-900 placeholder-slate-400"
                />
                <p className="text-center mt-3 text-lg">
                  <span className="text-slate-500">≈</span> <span className="font-bold text-purple-600">{kes} KES</span>
                </p>
              </div>

              <button
                onClick={() => setStep("details")}
                disabled={!isAmountOk()}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 disabled:from-slate-300 text-white font-bold text-lg rounded-xl shadow-lg"
              >
                Continue →
              </button>
            </>
          )}

          {step === "details" && (
            <div className="space-y-4">
              {method === "paypal" && (
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full p-4 rounded-xl border-2 border-purple-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition bg-white text-slate-900 placeholder-slate-400"
                />
              )}

              {method === "bank_transfer" && (
                <>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Bank Name"
                    className="w-full p-4 rounded-xl border-2 border-purple-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition bg-white text-slate-900 placeholder-slate-400"
                  />
                  <input
                    type="text"
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    placeholder="Account Name"
                    className="w-full p-4 rounded-xl border-2 border-purple-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition bg-white text-slate-900 placeholder-slate-400"
                  />
                  <input
                    type="text"
                    value={accNumber}
                    onChange={(e) => setAccNumber(e.target.value)}
                    placeholder="Account Number"
                    className="w-full p-4 rounded-xl border-2 border-purple-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition bg-white text-slate-900 placeholder-slate-400"
                  />
                  <input
                    type="text"
                    value={swift}
                    onChange={(e) => setSwift(e.target.value)}
                    placeholder="SWIFT (optional)"
                    className="w-full p-4 rounded-xl border-2 border-purple-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition bg-white text-slate-900 placeholder-slate-400"
                  />
                </>
              )}

              {method === "mpesa" && (
                <input
                  type="tel"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="0712345678"
                  className="w-full p-4 rounded-xl border-2 border-purple-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition bg-white text-slate-900 placeholder-slate-400"
                />
              )}

              <button
                onClick={requestWithdraw}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-lg rounded-xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Send Request"}
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="text-center space-y-6">
              <p className="text-slate-600">Enter 6-digit OTP from email</p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                placeholder="000000"
                className="w-full p-5 text-3xl tracking-widest text-center rounded-xl border-2 border-purple-300 focus:border-purple-600 bg-white text-slate-900"
                maxLength={6}
              />
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-50"
              >
                Verify OTP
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Success!</h3>
              <p className="text-slate-600">
                ${amountUsd} locked → {kes} KES
                <br />
                <b>{agent.name}</b> pays in 5 mins
              </p>
              <button
                onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold text-lg rounded-xl"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
