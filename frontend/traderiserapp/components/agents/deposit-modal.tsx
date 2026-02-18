"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { X, Upload, Loader2 } from "lucide-react"
import Image from "next/image"
import PaymentInfoDisplay from "./payment-info-display"
import { createAgentDeposit } from "@/lib/api"

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
  }
  onClose: () => void
  onSuccess?: () => void
}

const formatAccountLabel = (type: string, balance: number | string) => {
  const map: Record<string, string> = {
    standard: "TradR Account",
    "pro-fx": "Pro-FX Account",
  }
  const name = map[type] ?? type
  return `${name} ($${Number(balance).toFixed(2)})`
}

export default function DepositModal({ agent, onClose, onSuccess }: DepositModalProps) {
  const [amountKes, setAmountKes] = useState("")
  const [transactionCode, setTransactionCode] = useState("")
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>("")
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setFetchError(null)
        const res = await api.getAccount() as { data?: { user?: { accounts?: UserAccount[] } }; error?: string | null }
        if (res.error) throw new Error(res.error)

        const all = (res.data?.user?.accounts ?? []) as UserAccount[]
        const allowed = all.filter((a) => ["standard", "pro-fx"].includes(a.account_type))
        setAccounts(allowed)
        if (allowed.length > 0) setSelectedAccount(allowed[0].id)
      } catch (err) {
        setFetchError((err as Error).message)
        toast.error("Failed to load accounts. Try again.")
      }
    }
    fetchAccounts()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error("File too large (max 5MB)")
    if (!file.type.startsWith("image/")) return toast.error("Images only (JPG/PNG)")

    setScreenshot(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    const amountNum = Number(amountKes)
    if (isNaN(amountNum) || amountNum <= 0) return toast.error("Enter valid amount")
    if (agent.min_amount && amountNum < Number(agent.min_amount)) return toast.error(`Min: ${agent.min_amount} KES`)
    if (agent.max_amount && amountNum > Number(agent.max_amount)) return toast.error(`Max: ${agent.max_amount} KES`)
    if (!selectedAccount) return toast.error("Select account")
    if (!transactionCode.trim()) return toast.error("Enter code/ID/reference")

    const methodLower = agent.method.toLowerCase()
    if ((methodLower === "mpesa" || methodLower === "bank_transfer") && !screenshot) {
      return toast.error("Upload proof screenshot")
    }

    setLoading(true)

    try {
      const res = await createAgentDeposit({
        agent_id: agent.id,
        account: selectedAccount!,
        amount_kes: Number(amountKes),
        transaction_code: transactionCode.trim(),
        screenshot: screenshot ?? undefined,
        method: agent.method,
      })

      if (res.error) {
        const msg =
          typeof res.error === "string"
            ? res.error
            : Object.values(res.error as Record<string, unknown>)
                .flat()
                .join(", ")
        throw new Error(msg)
      }

      toast.success("Deposit submitted! Awaiting verification.")
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const usd = amountKes ? (Number(amountKes) / agent.deposit_rate_kes_to_usd).toFixed(2) : "0.00"
  const method = agent.method.toLowerCase()

  const isFormValid =
    !!amountKes && !!selectedAccount && !!transactionCode.trim() && (method === "paypal" || !!screenshot)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-700">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold text-slate-900">Deposit via {agent.name}</h2>

        <PaymentInfoDisplay method={agent.method} agent={agent} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Amount in KES</p>
            <input
              type="number"
              value={amountKes}
              onChange={(e) => setAmountKes(e.target.value)}
              placeholder="Enter amount"
              min="10"
              className="w-full p-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 bg-white text-slate-900"
            />
            <p className="text-xs text-slate-500 mt-1">You&apos;ll get ~${usd} USD</p>
          </div>

          {fetchError ? (
            <p className="text-red-600 text-sm">{fetchError}</p>
          ) : accounts.length === 0 ? (
            <p className="text-slate-500 text-sm">No accounts found</p>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Credit to Account</p>
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

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              {method === "paypal" ? "PayPal Transaction ID" : "Transaction Code/Reference"}
            </p>
            <input
              type="text"
              value={transactionCode}
              onChange={(e) => setTransactionCode(e.target.value)}
              placeholder={
                method === "paypal" ? "e.g. 9ABC123DEF456" : method === "mpesa" ? "e.g. SAG123XYZ45" : "e.g. REF123456"
              }
              className="w-full p-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 bg-white text-slate-900"
            />
          </div>

          {method !== "paypal" && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2 bg-slate-50">
              {preview ? (
                <div className="space-y-2">
                  <div className="relative w-full h-32 sm:h-40 rounded-lg overflow-hidden">
                    <Image src={preview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPreview("")
                      setScreenshot(null)
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove & Upload Again
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5 MB</p>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Deposit ${amountKes ? `${amountKes} KES` : ""}`
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
