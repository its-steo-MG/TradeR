"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { TransactionHistory } from "@/components/dashboard/transaction-history";
import { TradingViewWidget } from "@/components/dashboard/trading-view";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ActionButtons } from "@/components/dashboard/action-buttons";

interface Account {
  id: number;
  account_type: string;
  balance: number;
  kyc_verified: boolean;
}

interface Transaction {
  id: number;
  amount: number;
  transaction_type: "deposit" | "withdrawal" | "trade";
  description: string;
  created_at: string;
}

interface DashboardData {
  user: {
    username: string;
    email: string;
    phone: string;
    is_sashi: boolean;
    is_email_verified: boolean;
    accounts: Account[];
  };
  accounts: Array<{
    account_type: string;
    balance: number;
    transactions: Transaction[];
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>("standard");
  const [loginType, setLoginType] = useState<string>("real");
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);

  const showSuccess = (message: string) => toast.success(message);
  const showError = (message: string) => toast.error(message);

  const normalizeDashboardData = (raw: unknown): DashboardData | null => {
    if (!raw || typeof raw !== "object") return null;

    const rawData = raw as Record<string, unknown>;

    if (!rawData.user || typeof rawData.user !== "object") return null;

    const user = rawData.user as Record<string, unknown>;

    // Normalize user.accounts
    const normalizedUserAccounts: Account[] = Array.isArray(user.accounts)
      ? user.accounts.map((acc: unknown) => {
          if (!acc || typeof acc !== "object") return null;
          const a = acc as Record<string, unknown>;

          return {
            id: Number(a.id),
            account_type: String(a.account_type || ""),
            balance: Number(a.balance) || 0,
            kyc_verified: Boolean(a.kyc_verified),
          };
        }).filter((acc): acc is Account => acc !== null)
      : [];

    // Normalize accounts array
    const normalizedAccounts = Array.isArray(rawData.accounts)
      ? (rawData.accounts as unknown[]).map((acc: unknown) => {
          if (!acc || typeof acc !== "object") return null;
          const a = acc as Record<string, unknown>;

          const transactions: Transaction[] = Array.isArray(a.transactions)
            ? (a.transactions as unknown[]).map((tx: unknown) => {
                if (!tx || typeof tx !== "object") return null;
                const t = tx as Record<string, unknown>;

                return {
                  id: Number(t.id),
                  amount: Number(t.amount) || 0,
                  transaction_type: (
                    ["deposit", "withdrawal", "trade"].includes(String(t.transaction_type))
                      ? (t.transaction_type as "deposit" | "withdrawal" | "trade")
                      : "deposit"
                  ),
                  description: String(t.description || ""),
                  created_at: String(t.created_at || ""),
                };
              }).filter((tx): tx is Transaction => tx !== null)
            : [];

          return {
            account_type: String(a.account_type || ""),
            balance: Number(a.balance) || 0,
            transactions,
          };
        }).filter((acc): acc is NonNullable<typeof acc> => acc !== null)
      : [];

    return {
      user: {
        username: String(user.username || ""),
        email: String(user.email || ""),
        phone: String(user.phone || ""),
        is_sashi: Boolean(user.is_sashi),
        is_email_verified: Boolean(user.is_email_verified),
        accounts: normalizedUserAccounts,
      },
      accounts: normalizedAccounts,
    };
  };

  const fetchData = () => {
    setLoading(true);
    setError(null);

    api
      .getDashboard()
      .then((res) => {
        if (res.error) {
          setError(res.error);
          return;
        }

        const normalizedData = normalizeDashboardData(res.data);
        if (normalizedData) {
          setData(normalizedData);

          const activeId = localStorage.getItem("active_account_id");
          const found = normalizedData.user.accounts.find(
            (acc) => String(acc.id) === String(activeId)
          );
          if (found) setActiveAccount(found);
        } else {
          setError("Invalid dashboard data received from server");
        }

        const activeType = localStorage.getItem("account_type") || "standard";
        setSelectedAccount(activeType);
        setLoginType(activeType === "demo" ? "demo" : "real");
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        setError(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      fetchData();

      const handleSessionUpdate = () => {
        const activeType = localStorage.getItem("account_type") || "standard";
        setSelectedAccount(activeType);
        fetchData();
      };

      window.addEventListener("session-updated", handleSessionUpdate);
      return () => window.removeEventListener("session-updated", handleSessionUpdate);
    }
  }, []);

  const handleResetDemo = async () => {
    try {
      const res = await api.resetDemoBalance();
      if (res.error) throw new Error(res.error);
      showSuccess("Demo balance reset to $10,000");
      window.dispatchEvent(new Event("session-updated"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset demo balance";
      showError(message);
    }
  };

  const handleCreateProFx = async () => {
    try {
      const res = await api.createAdditionalAccount({ account_type: "pro-fx" });
      if (res.error) throw new Error(res.error);

      showSuccess("Pro-FX account created successfully");
      fetchData();
      window.dispatchEvent(new Event("session-updated"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create Pro-FX account";
      showError(message);
    }
  };

  const isRealAccount = loginType === "real";
  const selectedAccountData = data?.accounts?.find((a) => a.account_type === selectedAccount);
  const hasProFx = data?.user?.accounts?.some((acc) => acc.account_type === "pro-fx") ?? false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-base sm:text-xl">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400 bg-black">
        <div className="text-center max-w-md p-4 sm:p-6">
          <div className="text-4xl sm:text-6xl mb-4">⚠️</div>
          <h2 className="text-lg sm:text-xl font-bold mb-2">Error</h2>
          <p className="mb-4 sm:mb-6 text-sm sm:text-base">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold text-sm sm:text-base"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-950/30 to-pink-950/20" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl animate-float delay-1000" />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-purple-700/8 rounded-full blur-3xl animate-float delay-500" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="animate-in fade-in slide-in-from-top-10 duration-700">
            <DashboardHeader
              username={data?.user?.username ?? ""}
              email={data?.user?.email ?? ""}
              isRealAccount={isRealAccount}
              accountType={selectedAccount}
            />
          </div>

          <div className="animate-in fade-in slide-in-from-top-10 duration-700 delay-100">
            <BalanceCard
              balance={selectedAccountData?.balance || 0}
              username={data?.user?.username ?? ""}
              isRealAccount={isRealAccount}
              showBalance={showBalance}
              onToggleBalance={() => setShowBalance(!showBalance)}
              accountType={selectedAccount}
            />
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
            <ActionButtons 
              isDemo={
                loginType === "demo" || 
                activeAccount?.account_type === "mt5-demo" ||
                activeAccount?.account_type === "demo"
              }
              accountType={activeAccount?.account_type}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300">
            {isRealAccount ? (
              !hasProFx && (
                <Button
                  onClick={handleCreateProFx}
                  className="w-full sm:flex-1 relative group bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white font-bold py-4 px-6 rounded-2xl overflow-hidden text-sm sm:text-base transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/50 transform hover:-translate-y-1 active:translate-y-0"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative flex items-center justify-center gap-2">
                    <span className="text-lg">✨</span>
                    Create Pro-FX Account
                  </span>
                </Button>
              )
            ) : (
              <Button
                onClick={handleResetDemo}
                className="w-full sm:flex-1 relative group bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white font-bold py-4 px-6 rounded-2xl overflow-hidden text-sm sm:text-base transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/50 transform hover:-translate-y-1 active:translate-y-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative flex items-center justify-center gap-2">
                  <span className="text-lg">🔄</span>
                  Reset Demo Balance to $10,000
                </span>
              </Button>
            )}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-400">
            <div className="glass rounded-3xl overflow-hidden border border-white/10 shadow-4xl hover:shadow-3xl transition-all duration-300">
              <TradingViewWidget symbol={selectedAccount === "pro-fx" ? "EURUSD" : "NASDAQ:AAPL"} />
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-500">
            <div className="glass rounded-3xl overflow-hidden border border-white/15 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <TransactionHistory transactions={selectedAccountData?.transactions || []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}