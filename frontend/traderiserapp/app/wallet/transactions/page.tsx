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

      let data: WalletTransaction[] = [];

      if (!res.data) {
        data = [];
      } else if (Array.isArray(res.data)) {
        data = res.data as WalletTransaction[];
      } else if (res.data.results && Array.isArray(res.data.results)) {
        data = res.data.results as WalletTransaction[];
      } else if (res.data.transactions && Array.isArray(res.data.transactions)) {
        data = res.data.transactions as WalletTransaction[];
      } else {
        data = [];
      }

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
    <div className="relative min-h-screen text-foreground overflow-hidden">
      {/* ========== BACKGROUND (same as Dashboard) ========== */}
      
      {/* Dark mode */}
      <div className="fixed inset-0 z-0 dark:block hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-950/30 to-pink-950/20" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl animate-float delay-1000" />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-purple-700/8 rounded-full blur-3xl animate-float delay-500" />
      </div>

      {/* Light mode */}
      <div className="fixed inset-0 z-0 block dark:hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-400/8 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-12 pb-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-card border border-border shadow flex items-center justify-center hover:bg-muted transition"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <div className="w-10" />
        </div>

        {/* Tabs */}
        <div className="flex bg-muted rounded-full p-1 mb-8">
          {(["all", "deposits", "withdrawals"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-6 rounded-full text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "all" ? "All" : tab === "deposits" ? "Deposits" : "Withdrawals"}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading transactions...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg">
                No {activeTab === "all" ? "" : activeTab} yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTransactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={{
                    id: transaction.id,
                    type:
                      transaction.transaction_type.charAt(0).toUpperCase() +
                      transaction.transaction_type.slice(1),
                    amount: `${formatCurrency(transaction.amount)} ${
                      transaction.currency?.code || "USD"
                    }`,
                    convertedAmount: transaction.converted_amount
                      ? `${formatCurrency(transaction.converted_amount)} ${
                          transaction.target_currency?.code || "USD"
                        }`
                      : undefined,
                    date: new Date(transaction.created_at).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    ),
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