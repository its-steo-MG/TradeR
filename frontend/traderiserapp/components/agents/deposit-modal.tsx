"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { X, Upload, Loader2 } from "lucide-react"
import Image from "next/image"
import PaymentInfoDisplay from "./payment-info-display"
import { createAgentDeposit, api } from "@/lib/api"

interface UserAccount {
  id: number
  account_type: string
  balance: number | string
}

interface DepositModalProps {
  agent: {
    id: number
    name: string
    method: string
    deposit_rate_kes_to_usd: number
    min_amount?: number | string
    max_amount?: number | string
    mpesa_phone?: string
    binance_address?: string
  }
  onClose: () => void
  onSuccess?: () => void
}

interface ApiResponse<T = unknown> {
  data?: T
  error?: string | Record<string, unknown>
}

interface CreateDepositPayload {
  agent_id: number
  account: number
  method: string
  amount_kes?: number
  amount_usd_input?: number
  transaction_code?: string
  bank_reference?: string
  binance_tx_hash?: string
  screenshot?: File
}

const formatAccountLabel = (type: string, balance: number | string | undefined) => {
  const map: Record<string, string> = {
    standard: "TradR Account",
    "pro-fx": "Pro-FX Account",
    mt5: "MT5 Account",
  }
  const name = map[type] ?? type
  const safeBalance = balance ?? 0
  return `${name} ($${Number(safeBalance).toFixed(2)})`
}

export default function DepositModal({ agent, onClose, onSuccess }: DepositModalProps) {
  const [amount, setAmount] = useState("")
  const [transactionCode, setTransactionCode] = useState("")
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>("")
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const method = agent.method.toLowerCase()
  const isBinance = method === "binance"
  const isBank = method === "bank_transfer" || method === "bank"

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setFetchError(null)
        const res = (await api.getAccount()) as ApiResponse<{
          user?: { accounts?: UserAccount[] }
        }>

        if (res.error)
          throw new Error(
            typeof res.error === "string" ? res.error : "Failed to load accounts"
          )

        const allAccounts = res.data?.user?.accounts ?? []
        const allowed = allAccounts.filter((a) =>
          ["standard", "pro-fx", "mt5"].includes(a.account_type)
        )

        setAccounts(allowed)
        if (allowed.length > 0) {
          setSelectedAccount(allowed[0].id)
        } else {
          setFetchError("No trading accounts found. Please create one first.")
        }
      } catch (err: unknown) {
        console.error("Failed to fetch accounts:", err)
        const message =
          err instanceof Error ? err.message : "Failed to load accounts"
        setFetchError(message)
      }
    }

    fetchAccounts()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error("File too large (max 5MB)")
    if (!file.type.startsWith("image/")) return toast.error("Images only")

    setScreenshot(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0) return toast.error("Enter a valid amount")
    if (!selectedAccount) return toast.error("Please select an account")
    if (!transactionCode.trim()) {
      return toast.error(
        isBinance
          ? "Binance Tx Hash is required"
          : isBank
          ? "Bank reference is required"
          : "Transaction code is required"
      )
    }
    if (
      (isBinance || method === "mpesa" || isBank) &&
      !screenshot
    ) {
      return toast.error("Screenshot proof is required")
    }

    setLoading(true)

    try {
      const payload: CreateDepositPayload = {
        agent_id: agent.id,
        account: selectedAccount,
        method: agent.method,
      }

      if (isBinance) {
        payload.amount_usd_input = amountNum
        payload.binance_tx_hash = transactionCode.trim()
      } else if (isBank) {
        payload.amount_kes = amountNum
        payload.bank_reference = transactionCode.trim()
      } else {
        payload.amount_kes = amountNum
        payload.transaction_code = transactionCode.trim()
      }

      if (screenshot) {
        payload.screenshot = screenshot
      }

      const res = (await createAgentDeposit(payload)) as ApiResponse

      if (res.error) {
        const errorData = res.error
        const msg =
          typeof errorData === "string"
            ? errorData
            : Object.values(errorData).flat().join(", ") ||
              "Failed to submit deposit"
        throw new Error(msg)
      }

      toast.success("Deposit submitted successfully! Awaiting verification.")
      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to submit deposit. Please try again."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const displayConversion = () => {
    if (!amount) return "0.00"
    const rate = agent.deposit_rate_kes_to_usd
    if (!rate || rate <= 0) return "0.00"

    return isBinance
      ? (Number(amount) * rate).toFixed(0)
      : (Number(amount) / rate).toFixed(2)
  }

  const isFormValid =
    !!amount &&
    !!selectedAccount &&
    !!transactionCode.trim() &&
    (isBinance || isBank || method === "mpesa" ? !!screenshot : true)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/70"
      style={{ WebkitTransform: "translateZ(0)", transform: "translateZ(0)" }}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-6 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl"
        style={{
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:text-zinc-200 z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Deposit via {agent.name}
        </h2>
        <PaymentInfoDisplay method={agent.method} agent={agent} />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-zinc-200 mb-2">
              {isBinance ? "Amount in USD / USDT" : "Amount in KES"}
            </p>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={isBinance ? "50.00" : "6500"}
              min="10"
              step="0.01"
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-zinc-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              {isBinance
                ? `You'll send ≈ ${displayConversion()} KES equivalent`
                : `You'll get ≈ $${displayConversion()} USD`}
            </p>
          </div>

          {/* Account */}
          {fetchError ? (
            <p className="text-rose-600 dark:text-rose-400 text-sm">{fetchError}</p>
          ) : accounts.length === 0 ? (
            <p className="text-slate-500 dark:text-zinc-400 text-sm">No trading accounts found</p>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-200 mb-2">
                Credit to Account
              </p>
              <select
                value={selectedAccount ?? ""}
                onChange={(e) => setSelectedAccount(Number(e.target.value))}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-zinc-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {formatAccountLabel(acc.account_type, acc.balance)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Transaction Code / Bank Reference */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-zinc-200 mb-2">
              {isBinance
                ? "Binance Transaction Hash (TxID)"
                : isBank
                ? "Bank Reference"
                : "Transaction Code / Reference"}
            </p>
            <input
              type="text"
              value={transactionCode}
              onChange={(e) => setTransactionCode(e.target.value)}
              placeholder={
                isBinance
                  ? "0xabc123..."
                  : isBank
                  ? "e.g. TR-DEP-20261015-482917"
                  : "Enter code"
              }
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-zinc-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
            />
          </div>

          {/* Screenshot */}
          {(isBinance || method === "mpesa" || isBank) && (
            <div className="border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl p-6 text-center space-y-2 bg-slate-50 dark:bg-zinc-900">
              {preview ? (
                <div className="space-y-2">
                  <div className="relative w-full h-32 rounded-lg overflow-hidden">
                    <Image src={preview} alt="Proof" fill className="object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPreview("")
                      setScreenshot(null)
                    }}
                    className="text-sm text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:text-rose-300 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-zinc-500" />
                  <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                    Upload Proof Screenshot
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">PNG, JPG up to 5 MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Submit Deposit"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
