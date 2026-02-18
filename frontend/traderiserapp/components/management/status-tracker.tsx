"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, CreditCard, Key, TrendingUp } from "lucide-react"

interface StatusTrackerProps {
  status: string
  managementId: string
  currentPnl: number
  targetProfit: number
  startDate: string | null
  endDate: string | null
}

const statusConfig = {
  pending_payment: {
    label: "Pending Payment",
    color: "bg-orange-500",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/20",
    bgColor: "bg-orange-500/10",
  },
  payment_verified: {
    label: "Payment Verified",
    color: "bg-blue-500",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/20",
    bgColor: "bg-blue-500/10",
  },
  credentials_pending: {
    label: "Awaiting Credentials",
    color: "bg-purple-500",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/20",
    bgColor: "bg-purple-500/10",
  },
  active: {
    label: "Active",
    color: "bg-green-500",
    textColor: "text-green-400",
    borderColor: "border-green-500/20",
    bgColor: "bg-green-500/10",
  },
  completed: {
    label: "Completed",
    color: "bg-green-700",
    textColor: "text-green-500",
    borderColor: "border-green-700/20",
    bgColor: "bg-green-700/10",
  },
  failed: {
    label: "Failed",
    color: "bg-red-500",
    textColor: "text-red-400",
    borderColor: "border-red-500/20",
    bgColor: "bg-red-500/10",
  },
}

const steps = [
  { key: "pending_payment", label: "Payment", icon: CreditCard },
  { key: "payment_verified", label: "Credentials", icon: Key },
  { key: "active", label: "Active", icon: TrendingUp },
]

export function StatusTracker({
  status,
  managementId,
  currentPnl,
  targetProfit,
  startDate,
  endDate,
}: StatusTrackerProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_payment

  const getCurrentStep = () => {
    if (status === "pending_payment") return 0
    if (status === "payment_verified" || status === "credentials_pending") return 1
    if (status === "active" || status === "completed") return 2
    return 0
  }

  const currentStep = getCurrentStep()

  return (
    <Card className={`${config.bgColor} border ${config.borderColor} backdrop-blur-sm`}>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-white/60 text-xs sm:text-sm mb-1">Management ID</p>
            <p className="text-white font-mono font-semibold text-sm sm:text-base lg:text-lg break-all">
              {managementId}
            </p>
          </div>
          <Badge className={`${config.color} text-white border-0 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm`}>
            {config.label}
          </Badge>
        </div>

        {/* Progress Steps */}
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-white/10 hidden sm:block">
            <div
              className={`h-full ${config.color} transition-all duration-500`}
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />
          </div>

          {/* Steps - Horizontal on larger screens, vertical on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isCompleted = index <= currentStep
              const isCurrent = index === currentStep

              return (
                <div key={step.key} className="flex sm:flex-col items-center gap-3 sm:gap-2 relative z-10">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                      isCompleted ? `${config.color} text-white` : "bg-white/10 text-white/40"
                    } ${isCurrent ? "ring-4 ring-white/20" : ""}`}
                  >
                    {isCompleted && index < currentStep ? (
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </div>
                  <p className={`text-sm font-medium ${isCompleted ? "text-white" : "text-white/40"}`}>{step.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Additional Info */}
        {status === "active" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-white/60 text-xs sm:text-sm">Target</p>
              <p className="text-white font-semibold text-sm sm:text-base">${targetProfit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs sm:text-sm">Current P/L</p>
              <p
                className={`font-semibold text-sm sm:text-base ${currentPnl >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                ${currentPnl.toFixed(2)}
              </p>
            </div>
            {startDate && (
              <div>
                <p className="text-white/60 text-xs sm:text-sm">Start Date</p>
                <p className="text-white font-semibold text-sm sm:text-base">
                  {new Date(startDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {endDate && (
              <div>
                <p className="text-white/60 text-xs sm:text-sm">End Date</p>
                <p className="text-white font-semibold text-sm sm:text-base">
                  {new Date(endDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pending Payment Message */}
        {status === "pending_payment" && (
          <div className="flex items-start gap-3 pt-4 border-t border-white/10">
            <Clock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">Complete Payment</p>
              <p className="text-white/70 text-sm">Check your phone for the M-Pesa prompt and complete the payment</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
