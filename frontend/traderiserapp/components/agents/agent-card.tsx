// components/agents/agent-card.tsx
"use client"

import { Star, MapPin, Shield } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import DepositModal from "./deposit-modal"
import WithdrawalModal from "./withdrawal-modal"
import PaymentInfoDisplay from "./payment-info-display"  // NEW: Import to show full payment info

interface AgentCardProps {
  agent: {
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
    paypal_email?: string
    paypal_link?: string
    bank_name?: string
    bank_account_name?: string
    bank_account_number?: string
    bank_swift?: string
    mpesa_phone?: string
  }
}

export default function AgentCard({ agent }: AgentCardProps) {
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)

  const getMethodBadge = (method: string) => {
    const badges: Record<string, { label: string; color: string; bgColor: string }> = {
      mpesa: { label: "M-Pesa", color: "text-blue-700", bgColor: "bg-blue-50" },
      paypal: {
        label: "PayPal",
        color: "text-indigo-700",
        bgColor: "bg-indigo-50",
      },
      bank: {
        label: "Bank",
        color: "text-emerald-700",
        bgColor: "bg-emerald-50",
      },
    }
    return (
      badges[method.toLowerCase()] || {
        label: method,
        color: "text-slate-700",
        bgColor: "bg-slate-50",
      }
    )
  }

  const badge = getMethodBadge(agent.method)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-purple-300 transition-all duration-300 flex flex-col h-full">
      {/* NEW: Full-width Banner Image Covering Upper Part */}
      <div className="relative w-full h-32 sm:h-40">
        <Image
          src={agent.image || "/placeholder-agent.jpg"}
          alt={agent.name}
          className="object-cover"
          fill
          priority
        />
      </div>

      {/* Header with Agent Info (below banner) */}
      <div className="p-4 sm:p-6 border-b border-slate-200">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            {/* Agent Name */}
            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{agent.name}</h3>

            {/* Method Badge */}
            <span
              className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${badge.color} ${badge.bgColor}`}
            >
              {badge.label}
            </span>

            {/* Location */}
            <div className="flex items-center gap-1 sm:gap-2 text-slate-600">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">{agent.location}</span>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 text-yellow-500 flex-shrink-0">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span className="text-sm sm:text-base font-bold">{agent.rating.toFixed(1)}</span>
            <span className="text-xs sm:text-sm text-slate-500">({agent.reviews})</span>
          </div>
        </div>
      </div>

      {/* Rates Section */}
      <div className="grid grid-cols-2 border-b border-slate-200">
        <div className="p-4 sm:p-6 border-r border-slate-200">
          <p className="text-xs text-slate-600 mb-1 sm:mb-2 font-semibold">Deposit Rate</p>
          <p className="text-sm sm:text-base font-bold text-slate-900">1 USD = {agent.deposit_rate_kes_to_usd} KES</p>
        </div>
        <div className="p-4 sm:p-6">
          <p className="text-xs text-slate-600 mb-1 sm:mb-2 font-semibold">Withdrawal Rate</p>
          <p className="text-sm sm:text-base font-bold text-slate-900">1 USD = {agent.withdrawal_rate_usd_to_kes} KES</p>
        </div>
      </div>

      {/* Verified Badge */}
      {agent.verified && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center gap-1 sm:gap-2 text-green-700">
          <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium">Verified Agent</span>
        </div>
      )}

      {/* Response Time */}
      {agent.response_time && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
          <p className="text-xs text-slate-600 mb-1 sm:mb-2 font-semibold">Response Time</p>
          <p className="text-xs sm:text-sm font-medium text-slate-900">{agent.response_time}</p>
        </div>
      )}

      {/* Transaction Limits */}
      {(agent.min_amount || agent.max_amount) && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
          <p className="text-xs text-slate-600 mb-1 sm:mb-2 font-semibold">Transaction Limits</p>
          <p className="text-xs sm:text-sm font-medium text-slate-900">
            {agent.min_amount ? `${Number(agent.min_amount).toLocaleString()}` : "No min"} -{" "}
            {agent.max_amount ? `${Number(agent.max_amount).toLocaleString()}` : "No max"}
          </p>
        </div>
      )}

      {/* Agent Instructions (Full Description - No Clamping) */}
      {agent.instructions && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-blue-50 max-h-40 overflow-y-auto">
          <p className="text-xs text-blue-700">{agent.instructions}</p>  {/* UPDATED: Removed line-clamp-2 */}
        </div>
      )}

      {/* NEW: Full Payment Info Display */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
        <p className="text-xs text-slate-600 mb-2 font-semibold">Payment Details</p>
        <PaymentInfoDisplay 
          method={agent.method} 
          agent={{
            paypal_email: agent.paypal_email,
            paypal_link: agent.paypal_link,
            bank_name: agent.bank_name,
            bank_account_name: agent.bank_account_name,
            bank_account_number: agent.bank_account_number,
            bank_swift: agent.bank_swift,
            mpesa_phone: agent.mpesa_phone,
          }} 
        />
      </div>

      {/* Action Buttons */}
      <div className="px-4 sm:px-6 py-4 mt-auto flex gap-2 sm:gap-3">
        <button
          onClick={() => setShowDepositModal(true)}
          className="flex-1 py-2.5 sm:py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-base transition-colors duration-200"
        >
          Deposit
        </button>
        <button
          onClick={() => setShowWithdrawalModal(true)}
          className="flex-1 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-base transition-colors duration-200"
        >
          Withdraw
        </button>
      </div>

      {/* Modals */}
      {showDepositModal && (
        <DepositModal
          agent={agent}
          onClose={() => setShowDepositModal(false)}
          onSuccess={() => setShowDepositModal(false)}
        />
      )}
      {showWithdrawalModal && (
        <WithdrawalModal
          agent={agent}
          onClose={() => setShowWithdrawalModal(false)}
          onSuccess={() => setShowWithdrawalModal(false)}
        />
      )}
    </div>
  )
}