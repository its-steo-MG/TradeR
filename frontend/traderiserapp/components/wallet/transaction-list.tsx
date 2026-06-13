// components/wallet/transaction-list.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format-currency";
import { type WalletTransaction, api } from "@/lib/api";
import { TransactionItem } from "./transaction-items";
import { TransactionDetailModal } from "./transactio-detail-modal";
import { toast } from "sonner";

export function TransactionList() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);

  const fetchTransactions = async () => {
    try {
      const res = await api.getWalletTransactions();
      if (res.error) throw new Error(res.error);

      // Robust handling for all possible backend response formats
      let data: WalletTransaction[] = [];

      if (!res.data) {
        data = [];
      } 
      // 1. Direct array response
      else if (Array.isArray(res.data)) {
        data = res.data as WalletTransaction[];
      } 
      // 2. DRF Paginated response { count, next, previous, results }
      else if (res.data.results && Array.isArray(res.data.results)) {
        data = res.data.results as WalletTransaction[];
      } 
      // 3. Old wrapped format { transactions: [...] }
      else if (res.data.transactions && Array.isArray(res.data.transactions)) {
        data = res.data.transactions as WalletTransaction[];
      } 
      // 4. Fallback - try to use the object directly if it's an array-like
      else if (typeof res.data === "object") {
        data = Object.values(res.data).find(Array.isArray) || [];
      }

      setTransactions(data);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to load transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const handleSessionUpdate = () => fetchTransactions();
    window.addEventListener("session-updated", handleSessionUpdate);

    const interval = setInterval(fetchTransactions, 30000);

    return () => {
      window.removeEventListener("session-updated", handleSessionUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleViewAll = () => {
    router.push("/wallet/transactions");
  };

  const handleTransactionClick = (tx: WalletTransaction) => {
    setSelectedTransaction(tx);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900">Transactions</h3>
        <button 
          onClick={handleViewAll} 
          className="text-purple-600 hover:text-purple-700 font-semibold text-xs sm:text-sm transition-colors"
        >
          View all
        </button>
      </div>

      {/* Transaction Items */}
      <div className="divide-y divide-slate-200">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No transactions yet</div>
        ) : (
          transactions.slice(0, 6).map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={{
                id: transaction.id,
                type: transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1),
                amount: `${formatCurrency(transaction.amount)} ${transaction.currency?.code || "USD"}`,
                convertedAmount: transaction.converted_amount
                  ? `${formatCurrency(transaction.converted_amount)} ${transaction.target_currency?.code || "USD"}`
                  : undefined,
                date: new Date(transaction.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                transactionType: transaction.transaction_type,
                exchangeRateUsed: transaction.exchange_rate_used,
                status: transaction.status,
                currency: transaction.currency,
                target_currency: transaction.target_currency,
                reference_id: transaction.reference_id,
                checkout_request_id: transaction.checkout_request_id,
              }}
              onClick={() => handleTransactionClick(transaction)}
            />
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal 
          transaction={selectedTransaction} 
          onClose={() => setSelectedTransaction(null)} 
        />
      )}
    </div>
  );
}