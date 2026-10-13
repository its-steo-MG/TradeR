import { formatCurrency } from "@/lib/format-currency";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface Transaction {
  id: number;
  amount: number | string;
  transaction_type: "deposit" | "withdrawal" | "trade";
  description: string;
  created_at: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-sky-50 p-3 sm:p-5 md:p-6 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950">
      <div className="mb-3 sm:mb-4 flex items-baseline justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Recent activity</h3>
        <span className="shrink-0 text-xs text-slate-500 dark:text-zinc-400">{transactions.length}</span>
      </div>
      {transactions.length === 0 ? (
        <p className="py-8 sm:py-10 text-center text-sm text-slate-500 dark:text-zinc-400">No transactions yet</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const out = tx.transaction_type === "withdrawal";
            return (
              <div
                key={tx.id}
                className="drop-on-top relative !flex w-full items-center gap-2 sm:gap-3 overflow-hidden rounded-xl sm:rounded-2xl border border-white/70 bg-white/40 px-2.5 py-2.5 sm:px-3 sm:py-3 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
              >
                <span
                  className={`relative z-[1] flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border ${
                    out
                      ? "border-red-200 bg-red-50 text-red-500 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-400"
                      : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400"
                  }`}
                >
                  {out ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
                </span>
                <div className="relative z-[1] min-w-0 flex-1">
                  <p className="truncate text-sm font-medium capitalize text-slate-900 dark:text-white">
                    {tx.transaction_type}
                  </p>
                  <p className="truncate text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400">{tx.description}</p>
                </div>
                <div className="relative z-[1] shrink-0 text-right">
                  <p className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${out ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {out ? "-" : "+"}${formatCurrency(tx.amount)}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
