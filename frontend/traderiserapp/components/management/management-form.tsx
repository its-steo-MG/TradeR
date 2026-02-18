"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { initiateManagement } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, DollarSign, Target, Smartphone, AlertCircle, Building2 } from "lucide-react"
import { ACCOUNT_TYPE_LABELS } from "@/types/account"

const USD_TO_KSH_RATE = 130 // Current exchange rate, can be made dynamic later

interface ManagementFormProps {
  onSuccess: (managementId: string) => void
}

export function ManagementForm({ onSuccess }: ManagementFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    stake: "",
    target_profit: "",
    mpesa_phone: "",
    account_type: "standard" as "standard" | "pro-fx",
  })

  const stakeNum = Number.parseFloat(formData.stake) || 0
  const targetProfitNum = Number.parseFloat(formData.target_profit) || 0
  const serviceFeeUSD = targetProfitNum * 0.2
  const serviceFeeKSH = serviceFeeUSD * USD_TO_KSH_RATE

  const isValid =
    stakeNum >= 50 &&
    targetProfitNum >= 10 &&
    formData.mpesa_phone.length >= 9 &&
    formData.mpesa_phone.startsWith("254") // optional: stricter validation

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsLoading(true)
    try {
      const response = await initiateManagement({
        stake: stakeNum,
        target_profit: targetProfitNum,
        mpesa_phone: formData.mpesa_phone,
        account_type: formData.account_type,
      })

      if (response.data?.management_id) {
        onSuccess(response.data.management_id)
        toast({
          title: "Success",
          description: "Management request initiated! Check your phone for M-Pesa prompt.",
        })
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to initiate payment",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-white/10 backdrop-blur-sm">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Initiate Management Request
          </h2>
          <p className="text-sm sm:text-base text-white/70">
            Fill in your details to start professional account management
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Account Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/90 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Account Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(ACCOUNT_TYPE_LABELS) as Array<keyof typeof ACCOUNT_TYPE_LABELS>).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, account_type: type as "standard" | "pro-fx" })}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    formData.account_type === type
                      ? "border-pink-500 bg-pink-500/10 text-white"
                      : "border-white/10 bg-black/20 text-white/70 hover:border-white/20"
                  }`}
                >
                  <p className="font-semibold text-sm sm:text-base">{ACCOUNT_TYPE_LABELS[type]}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {type === "standard" ? "Regular trading account" : "Professional FX account"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Stake Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/90 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Stake Amount (USD)
            </label>
            <Input
              type="number"
              placeholder="Minimum $50"
              min="50"
              step="0.01"
              value={formData.stake}
              onChange={(e) => setFormData({ ...formData, stake: e.target.value })}
              className="bg-black/20 border-white/10 text-white placeholder:text-white/40"
            />
            {stakeNum > 0 && stakeNum < 50 && (
              <p className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Minimum stake is $50
              </p>
            )}
          </div>

          {/* Target Profit */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/90 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Target Profit (USD)
            </label>
            <Input
              type="number"
              placeholder="Minimum $10"
              min="10"
              step="0.01"
              value={formData.target_profit}
              onChange={(e) => setFormData({ ...formData, target_profit: e.target.value })}
              className="bg-black/20 border-white/10 text-white placeholder:text-white/40"
            />
            {targetProfitNum > 0 && targetProfitNum < 10 && (
              <p className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Minimum target profit is $10
              </p>
            )}
          </div>

          {/* M-Pesa Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/90 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              M-Pesa Phone Number
            </label>
            <Input
              type="text"
              placeholder="254712345678"
              value={formData.mpesa_phone}
              onChange={(e) => setFormData({ ...formData, mpesa_phone: e.target.value })}
              className="bg-black/20 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          {/* Service Fee Display */}
          {targetProfitNum >= 10 && (
            <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 border border-pink-500/20 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-white/70 text-sm">Service Fee (20% of target)</p>
                  <p className="text-xs sm:text-sm text-white/60">${serviceFeeUSD.toFixed(2)} USD</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    KES {serviceFeeKSH.toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          {isValid && (
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-5 sm:py-6 text-base sm:text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay KES {serviceFeeKSH.toFixed(2)} via M-Pesa</>
              )}
            </Button>
          )}
        </form>
      </div>
    </Card>
  )
}