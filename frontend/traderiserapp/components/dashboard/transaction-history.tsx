import { formatCurrency } from "@/lib/format-currency"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"

interface Transaction {
  id: number
  amount: number | string // Updated to allow string, as API may return string
  transaction_type: "deposit" | "withdrawal" | "trade"
  description: string
  created_at: string
}

interface TransactionHistoryProps {
  transactions: Transaction[]
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  return (
    <div className="w-full">
      <div className="bg-gradient-to-br from-slate-800/60 via-slate-900/40 to-slate-950/60 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 lg:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-6 bg-gradient-to-b from-slate-400 to-slate-600 rounded-full" />
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Recent Transactions</h3>
          <span className="ml-auto text-xs sm:text-sm text-slate-400">
            {transactions.length} {transactions.length === 1 ? "transaction" : "transactions"}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4">
              <ArrowUpRight size={32} className="text-slate-500" />
            </div>
            <p className="text-slate-400 text-base">No transactions yet</p>
            <p className="text-slate-500 text-sm mt-1">Your transactions will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 hover:border-emerald-500/30 transition-all duration-300 group"
              >
                {/* Left Side: Icon and Type */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-semibold ${
                      tx.transaction_type === "deposit"
                        ? "bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30"
                        : tx.transaction_type === "withdrawal"
                        ? "bg-red-500/20 text-red-400 group-hover:bg-red-500/30"
                        : "bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30"
                    }`}
                  >
                    {tx.transaction_type === "deposit" ? (
                      <ArrowDownLeft size={20} />
                    ) : (
                      <ArrowUpRight size={20} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm sm:text-base">
                      {tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}
                    </p>
                    <p className="text-slate-400 text-xs sm:text-sm truncate">{tx.description}</p>
                  </div>
                </div>

                {/* Right Side: Amount and Date */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-4">
                  <p
                    className={`font-bold text-sm sm:text-base ${
                      tx.transaction_type === "withdrawal" ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {tx.transaction_type === "withdrawal" ? "-" : "+"}${formatCurrency(tx.amount)}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {new Date(tx.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
