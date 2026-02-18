// app/wallet/transactions/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type WalletTransaction, api } from "@/lib/api";
import { TransactionItem } from "@/components/wallet/transaction-items";
import { TransactionDetailModal } from "@/components/wallet/transactio-detail-modal";
import { formatCurrency } from "@/lib/format-currency";
import { toast } from "sonner";

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<WalletTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "deposits" | "withdrawals">("all");
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);

  const fetchTransactions = async () => {
    try {
      const res = await api.getWalletTransactions();
      if (res.error) throw new Error(res.error);
      const data = (res.data?.transactions || res.data || []) as WalletTransaction[];
      setTransactions(data);
      filterTransactions(data, activeTab);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to load transactions");
      setTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = (data: WalletTransaction[], tab: typeof activeTab) => {
    let filtered = data;
    if (tab === "deposits") {
      filtered = data.filter((tx) => tx.transaction_type === "deposit");
    } else if (tab === "withdrawals") {
      filtered = data.filter((tx) => tx.transaction_type === "withdrawal");
    }
    setFilteredTransactions(filtered);
  };

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterTransactions(transactions, activeTab);
  }, [activeTab, transactions]);

  const handleTransactionClick = (tx: WalletTransaction) => {
    setSelectedTransaction(tx);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Safe Area for Mobile */}
      <div className="pt-12 pb-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100 transition"
            aria-label="Go back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <div className="w-10" /> {/* Invisible spacer for perfect centering */}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-full p-1 mb-8">
          {(["all", "deposits", "withdrawals"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-6 rounded-full text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab === "all" ? "All" : tab === "deposits" ? "Deposits" : "Withdrawals"}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg">No {activeTab === "all" ? "" : activeTab} yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
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
                      month: "short",
                      day: "numeric",
                      year: "numeric",
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
              ))}
            </div>
          )}
        </div>
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