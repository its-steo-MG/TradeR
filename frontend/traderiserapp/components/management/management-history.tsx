"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ManagementRequest } from "@/types/account"
import { Calendar, DollarSign, TrendingUp, TrendingDown, Building2 } from "lucide-react"
import { ACCOUNT_TYPE_LABELS } from "@/types/account"

interface ManagementHistoryProps {
  requests: ManagementRequest[]
}

const statusColors = {
  pending_payment: "bg-orange-500",
  payment_verified: "bg-blue-500",
  credentials_pending: "bg-purple-500",
  active: "bg-green-500",
  completed: "bg-green-700",
  failed: "bg-red-500",
}

export function ManagementHistory({ requests }: ManagementHistoryProps) {
  return (
    <Card className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-white/10 backdrop-blur-sm">
      <div className="p-4 sm:p-6 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Management History</h2>

        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-black/20 border border-white/10 rounded-lg p-3 sm:p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <p className="text-white font-mono font-semibold text-sm sm:text-base break-all">
                      {request.management_id}
                    </p>
                    <Badge
                      className={`${statusColors[request.status as keyof typeof statusColors] || "bg-gray-500"} text-white border-0 text-xs sm:text-sm`}
                    >
                      {request.status_display}
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs sm:text-sm">
                      <Building2 className="w-3 h-3 mr-1" />
                      {ACCOUNT_TYPE_LABELS[request.account_type]}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div>
                      <p className="text-white/60">Stake</p>
                      <p className="text-white font-semibold">${request.stake.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-white/60">Target</p>
                      <p className="text-white font-semibold flex items-center gap-1">
                        <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                        {request.target_profit.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Current P/L</p>
                      <p
                        className={`font-semibold flex items-center gap-1 ${
                          request.current_pnl >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {request.current_pnl >= 0 ? (
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                        ) : (
                          <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                        ${Math.abs(request.current_pnl).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Created</p>
                      <p className="text-white font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="truncate">{new Date(request.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>

                  {request.start_date && request.end_date && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-white/70">
                      <span>Duration: {request.days} days</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="break-all">
                        {new Date(request.start_date).toLocaleDateString()} -{" "}
                        {new Date(request.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
