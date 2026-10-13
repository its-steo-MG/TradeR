// app/wallet/page.tsx
"use client";

import { useEffect, useState } from "react";
import { WalletHeader } from "@/components/wallet/wallet-header";
import { BalanceCard } from "@/components/wallet/balance-card";
import { ActionButtons } from "@/components/wallet/action-buttons";
import { TransactionList } from "@/components/wallet/transaction-list";
import { DepositModal } from "@/components/wallet/deposit-modal";
import { WithdrawModal } from "@/components/wallet/withdraw-modal";
import { VerifyWithdrawalModal } from "@/components/wallet/verify-withdrawal-modal";
import { TransferModal } from "@/components/wallet/transfer-modal";
import { VerifyTransferModal } from "@/components/wallet/verify-transfer-modal";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DashboardData {
  user: {
    username: string;
    email: string;
    image?: string;
  };
  accounts: Array<{
    id: number;
    account_type: string;
    balance: number;
  }>;
  session_active: boolean;
}

export default function Page() {
  const router = useRouter();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>("standard");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showVerifyTransferModal, setShowVerifyTransferModal] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string>("");

  useEffect(() => {
    const storedAccountType = localStorage.getItem("account_type") || "standard";
    setSelectedAccount(storedAccountType);

    const fetchDashboardData = async () => {
      try {
        const dashboardRes = await api.getDashboard();
        if (dashboardRes.error) throw new Error(dashboardRes.error);
        const dashboard = dashboardRes.data as DashboardData;
        setDashboardData({
          ...dashboard,
          accounts: dashboard.accounts.map((acc) => ({
            ...acc,
            balance: Number(acc.balance) || 0,
          })),
        });
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
        toast.error("Failed to load wallet data");
        if (!showDepositModal && !showWithdrawModal && !showVerifyModal) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();

    const handleSessionUpdate = () => {
      const newType = localStorage.getItem("account_type") || "standard";
      setSelectedAccount(newType);
      fetchDashboardData();
    };
    window.addEventListener("session-updated", handleSessionUpdate);

    window.dispatchEvent(
      new CustomEvent("modal-state", {
        detail: {
          isActive:
            showDepositModal ||
            showWithdrawModal ||
            showVerifyModal ||
            showTransferModal ||
            showVerifyTransferModal,
        },
      })
    );

    return () => window.removeEventListener("session-updated", handleSessionUpdate);
  }, [
    router,
    showDepositModal,
    showWithdrawModal,
    showVerifyModal,
    showTransferModal,
    showVerifyTransferModal,
  ]);

  const dismissMessage = () => {
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-muted-foreground">
        Loading wallet...
      </div>
    );
  }

  return (
    <>
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
        <main className="relative z-10 p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <WalletHeader />
            <BalanceCard />
            <ActionButtons
              onDeposit={() => setShowDepositModal(true)}
              onWithdraw={() => setShowWithdrawModal(true)}
              onTransfer={() => setShowTransferModal(true)}
            />
            <TransactionList />

            {showDepositModal && (
              <DepositModal
                onClose={() => setShowDepositModal(false)}
                onSetMessage={setMessage}
              />
            )}
            {showWithdrawModal && (
              <WithdrawModal
                onClose={() => setShowWithdrawModal(false)}
                onSuccess={(txId?: string) => {
                  setShowWithdrawModal(false);
                  if (txId) setSelectedTransactionId(txId);
                  setShowVerifyModal(true);
                }}
                onSetMessage={setMessage}
              />
            )}
            {showVerifyModal && (
              <VerifyWithdrawalModal
                transactionId={selectedTransactionId}
                onClose={() => setShowVerifyModal(false)}
                onSetMessage={setMessage}
              />
            )}
            {showTransferModal && (
              <TransferModal
                onClose={() => setShowTransferModal(false)}
                onSuccess={(txId?: string) => {
                  setShowTransferModal(false);
                  if (txId) setSelectedTransferId(txId);
                  setShowVerifyTransferModal(true);
                }}
                onSetMessage={setMessage}
              />
            )}
            {showVerifyTransferModal && (
              <VerifyTransferModal
                transactionId={selectedTransferId}
                onClose={() => setShowVerifyTransferModal(false)}
                onSetMessage={setMessage}
              />
            )}
          </div>
        </main>
      </div>

      {/* ========== NOTICE / OKAY CARD (solid opaque) ========== */}
      {message && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700 mx-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-700 pb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Notice
              </h3>
              <button
                onClick={() => setMessage(null)}
                className="text-2xl font-bold text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-zinc-400"
              >
                ×
              </button>
            </div>

            <div className="mt-5">
              <p
                className={
                  message.type === "error"
                    ? "text-red-500 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }
              >
                {message.text}
              </p>
            </div>

            <div className="mt-6">
              <button
                onClick={dismissMessage}
                className="w-full rounded-xl bg-purple-600 py-3.5 font-semibold text-white transition-colors hover:bg-purple-700"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}