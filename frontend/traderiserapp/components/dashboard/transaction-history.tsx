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
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Transaction History</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-slate-400 font-semibold">Type</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-slate-400 font-semibold">Amount</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-slate-400 font-semibold">Description</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-slate-400 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 sm:py-8 text-slate-400 text-sm sm:text-base">
                  No transactions yet
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition">
                  <td className="py-3 sm:py-4 px-2 sm:px-4">
                    <span
                      className={`inline-flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                        tx.transaction_type === "deposit"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : tx.transaction_type === "withdrawal"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {tx.transaction_type === "deposit" ? <ArrowDownLeft size={14} className="sm:w-4 sm:h-4" /> : <ArrowUpRight size={14} className="sm:w-4 sm:h-4" />}
                      {tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-white font-semibold text-sm sm:text-base">
                    {tx.transaction_type === "withdrawal" ? "-" : "+"}${formatCurrency(tx.amount)}
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-slate-300 text-sm sm:text-base">{tx.description}</td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-slate-400 text-xs sm:text-sm">{new Date(tx.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}