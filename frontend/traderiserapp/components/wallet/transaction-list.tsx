// components/wallet/transaction-list.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // For navigation
import { formatCurrency } from "@/lib/format-currency";
import { type WalletTransaction, api } from "@/lib/api";
import { TransactionItem } from "./transaction-items";
import { TransactionDetailModal } from "./transactio-detail-modal"; // New import
import { toast } from "sonner";

interface TransactionsResponse {
  transactions?: WalletTransaction[];
}

export function TransactionList() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null); // For detail modal

  const fetchTransactions = async () => {
    try {
      const res = await api.getWalletTransactions();
      if (res.error) throw new Error(res.error);

      const data: WalletTransaction[] = (() => {
        if (!res.data) return [];
        if (Array.isArray(res.data)) return res.data as WalletTransaction[];

        // Type guard for TransactionsResponse structure
        const responseData = res.data as TransactionsResponse;
        if (
          typeof responseData === "object" &&
          "transactions" in responseData &&
          Array.isArray(responseData.transactions)
        ) {
          return responseData.transactions as WalletTransaction[];
        }
        return [];
      })();

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

    // Polling for real-time updates (every 30s)
    const interval = setInterval(fetchTransactions, 30000);

    return () => {
      window.removeEventListener("session-updated", handleSessionUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleViewAll = () => {
    router.push("/wallet/transactions"); // Navigate to full list
  };

  const handleTransactionClick = (tx: WalletTransaction) => {
    setSelectedTransaction(tx); // Open detail modal
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
                amount: `${formatCurrency(transaction.amount)} ${transaction.currency.code}`,
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
                reference_id: transaction.reference_id, // Pass for details
                checkout_request_id: transaction.checkout_request_id, // Pass for M-PESA
              }}
              onClick={() => handleTransactionClick(transaction)} // Handle click
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