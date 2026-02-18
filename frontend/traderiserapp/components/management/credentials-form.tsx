"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { submitCredentials } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, Lock, Eye, EyeOff, Shield } from "lucide-react"

interface CredentialsFormProps {
  managementId: string
  onSuccess: () => void
}

export function CredentialsForm({ managementId, onSuccess }: CredentialsFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    account_email: "",
    account_password: "",
  })

  const isValid = formData.account_email.includes("@") && formData.account_password.length >= 6

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsLoading(true)
    try {
      const response = await submitCredentials({
        management_id: managementId,
        account_email: formData.account_email,
        account_password: formData.account_password,
      })

      if (response.status === 200) {
        onSuccess()
        setFormData({ account_email: "", account_password: "" })
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to submit credentials",
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
    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 backdrop-blur-sm animate-fadeIn">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Submit Trading Credentials</h2>
            <p className="text-sm sm:text-base text-white/70">
              Payment verified! Please provide your trading account credentials to begin management.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Management ID (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/90">Management ID</label>
            <Input type="text" value={managementId} readOnly className="bg-black/20 border-white/10 text-white/60" />
          </div>

          {/* Account Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/90 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Trading Account Email
            </label>
            <Input
              type="email"
              placeholder="your.email@example.com"
              value={formData.account_email}
              onChange={(e) => setFormData({ ...formData, account_email: e.target.value })}
              className="bg-black/20 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          {/* Account Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/90 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Trading Account Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.account_password}
                onChange={(e) => setFormData({ ...formData, account_password: e.target.value })}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/40 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-black/20 border border-white/10 rounded-lg p-4">
            <p className="text-white/70 text-sm">
              🔒 Your credentials are encrypted and securely stored. They will only be used by our admin team to manage
              your trading account.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isValid || isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-5 sm:py-6 text-base sm:text-lg disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Credentials"
            )}
          </Button>
        </form>
      </div>
    </Card>
  )
}
