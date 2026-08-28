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
        isBinance ? "Binance Tx Hash is required" : "Transaction code is required"
      )
    }
    if (
      (isBinance || method === "mpesa" || method === "bank_transfer") &&
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
    (isBinance || !!screenshot)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-700"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold text-slate-900">
          Deposit via {agent.name}
        </h2>
        <PaymentInfoDisplay method={agent.method} agent={agent} />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              {isBinance ? "Amount in USD / USDT" : "Amount in KES"}
            </p>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={isBinance ? "50.00" : "6500"}
              min="10"
              step="0.01"
              className="w-full p-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 bg-white text-slate-900"
            />
            <p className="text-xs text-slate-500 mt-1">
              {isBinance
                ? `You'll send ≈ ${displayConversion()} KES equivalent`
                : `You'll get ≈ $${displayConversion()} USD`}
            </p>
          </div>

          {/* Account */}
          {fetchError ? (
            <p className="text-red-600 text-sm">{fetchError}</p>
          ) : accounts.length === 0 ? (
            <p className="text-slate-500 text-sm">No trading accounts found</p>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                Credit to Account
              </p>
              <select
                value={selectedAccount ?? ""}
                onChange={(e) => setSelectedAccount(Number(e.target.value))}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 bg-white text-slate-900"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {formatAccountLabel(acc.account_type, acc.balance)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Transaction Code */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              {isBinance
                ? "Binance Transaction Hash (TxID)"
                : "Transaction Code / Reference"}
            </p>
            <input
              type="text"
              value={transactionCode}
              onChange={(e) => setTransactionCode(e.target.value)}
              placeholder={isBinance ? "0xabc123..." : "Enter code"}
              className="w-full p-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 bg-white text-slate-900"
            />
          </div>

          {/* Screenshot */}
          {(isBinance || method === "mpesa" || method === "bank_transfer") && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2 bg-slate-50">
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
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">
                    Upload Proof Screenshot
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5 MB</p>
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

          {/* Submit — Liquid Glass */}
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="
              drop-on-top relative w-full py-3
              bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300
              text-white font-semibold rounded-xl
              flex items-center justify-center gap-2
            "
          >
            <span className="relative z-[1] flex items-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Submit Deposit"
              )}
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}