// components/agents/agent-card.tsx
"use client"

import { Star, MapPin, Shield, MessageCircle } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"
import DepositModal from "./deposit-modal"
import WithdrawalModal from "./withdrawal-modal"
import PaymentInfoDisplay from "./payment-info-display"

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
    binance_address?: string
  }
}

export default function AgentCard({ agent }: AgentCardProps) {
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [imgError, setImgError] = useState(false)
  const router = useRouter()

  const getMethodBadge = (method: string) => {
    const badges: Record<string, { label: string; color: string; bgColor: string }> = {
      mpesa: { label: "M-Pesa", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-500/10 dark:bg-blue-500/15 backdrop-blur-md" },
      paypal: {
        label: "PayPal",
        color: "text-indigo-700 dark:text-indigo-300",
        bgColor: "bg-indigo-500/10 dark:bg-indigo-500/15 backdrop-blur-md",
      },
      bank: {
        label: "Bank",
        color: "text-emerald-700 dark:text-emerald-300",
        bgColor: "bg-emerald-500/10 dark:bg-emerald-500/15 backdrop-blur-md",
      },
      binance: {
        label: "Binance",
        color: "text-amber-700 dark:text-amber-300",
        bgColor: "bg-amber-500/10 dark:bg-amber-500/15 backdrop-blur-md",
      },
    }
    return (
      badges[method.toLowerCase()] || {
        label: method.charAt(0).toUpperCase() + method.slice(1),
        color: "text-slate-700 dark:text-zinc-200",
        bgColor: "bg-white/50 dark:bg-white/5 backdrop-blur-md",
      }
    )
  }

  const badge = getMethodBadge(agent.method)
  const imageSrc = !imgError && agent.image ? agent.image : "/placeholder-agent.jpg"

  const handleChatWithAgent = () => {
    // Navigate to customer care with the agent context
    router.push(`/customercare?agent_id=${agent.id}&agent_name=${encodeURIComponent(agent.name)}`)
  }

  return (
    <div className="bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-lg hover:border-purple-300 transition-all duration-300 flex flex-col h-full">
      {/* Banner Image */}
      <div className="relative w-full h-32 sm:h-40 bg-white/40 dark:bg-white/10 backdrop-blur-md">
        <Image
          src={imageSrc}
          alt={agent.name}
          fill
          className="object-cover"
          onError={() => setImgError(true)}
          unoptimized={imageSrc.startsWith("http")}
        />
      </div>

      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-white/40 dark:border-white/10">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
              {agent.name}
            </h3>

            <span
              className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${badge.color} ${badge.bgColor}`}
            >
              {badge.label}
            </span>

            <div className="flex items-center gap-1 sm:gap-2 text-slate-600 dark:text-zinc-300">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">{agent.location}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-yellow-500 flex-shrink-0">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span className="text-sm sm:text-base font-bold">
              {agent.rating.toFixed(1)}
            </span>
            <span className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">({agent.reviews})</span>
          </div>
        </div>
      </div>

      {/* Rates */}
      <div className="grid grid-cols-2 border-b border-white/40 dark:border-white/10">
        <div className="p-4 sm:p-6 border-r border-white/40 dark:border-white/10">
          <p className="text-xs text-slate-600 dark:text-zinc-300 mb-1 sm:mb-2 font-semibold">Deposit Rate</p>
          <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            1 USD = {agent.deposit_rate_kes_to_usd} KES
          </p>
        </div>
        <div className="p-4 sm:p-6">
          <p className="text-xs text-slate-600 dark:text-zinc-300 mb-1 sm:mb-2 font-semibold">Withdrawal Rate</p>
          <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            1 USD = {agent.withdrawal_rate_usd_to_kes} KES
          </p>
        </div>
      </div>

      {/* Verified */}
      {agent.verified && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/40 dark:border-white/10 flex items-center gap-1 sm:gap-2 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300">
          <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium">Verified Agent</span>
        </div>
      )}

      {/* Response Time */}
      {agent.response_time && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/40 dark:border-white/10">
          <p className="text-xs text-slate-600 dark:text-zinc-300 mb-1 sm:mb-2 font-semibold">Response Time</p>
          <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
            {agent.response_time}
          </p>
        </div>
      )}

      {/* Transaction Limits */}
      {(agent.min_amount || agent.max_amount) && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/40 dark:border-white/10">
          <p className="text-xs text-slate-600 dark:text-zinc-300 mb-1 sm:mb-2 font-semibold">
            Transaction Limits
          </p>
          <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
            {agent.min_amount ? `${Number(agent.min_amount).toLocaleString()}` : "No min"} -{" "}
            {agent.max_amount ? `${Number(agent.max_amount).toLocaleString()}` : "No max"}
          </p>
        </div>
      )}

      {/* Instructions */}
      {agent.instructions && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/40 dark:border-white/10 bg-blue-500/10 dark:bg-blue-500/15 backdrop-blur-md max-h-40 overflow-y-auto">
          <p className="text-xs text-blue-700 dark:text-blue-300">{agent.instructions}</p>
        </div>
      )}

      {/* Payment Info */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/40 dark:border-white/10">
        <p className="text-xs text-slate-600 dark:text-zinc-300 mb-2 font-semibold">Payment Details</p>
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
            binance_address: agent.binance_address,
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="px-4 sm:px-6 py-4 mt-auto space-y-2">
        {/* Chat with Agent Button */}
        <button
          onClick={handleChatWithAgent}
          className="
            drop-on-top relative w-full py-2.5 sm:py-3 rounded-xl
            bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700
            text-white font-semibold text-xs sm:text-base transition-all duration-200
            flex items-center justify-center gap-2
          "
        >
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="relative z-[1]">Chat with {agent.name}</span>
        </button>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setShowDepositModal(true)}
            className="
              drop-on-top relative flex-1 py-2.5 sm:py-3 rounded-xl
              bg-green-600 hover:bg-green-700 text-white font-semibold
              text-xs sm:text-base transition-all duration-200
            "
          >
            <span className="relative z-[1]">Deposit</span>
          </button>

          <button
            onClick={() => setShowWithdrawalModal(true)}
            className="
              drop-on-top relative flex-1 py-2.5 sm:py-3 rounded-xl
              bg-blue-600 hover:bg-blue-700 text-white font-semibold
              text-xs sm:text-base transition-all duration-200
            "
          >
            <span className="relative z-[1]">Withdraw</span>
          </button>
        </div>
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