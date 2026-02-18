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
import { TransferModal } from "@/components/wallet/transfer-modal";  // NEW
import { VerifyTransferModal } from "@/components/wallet/verify-transfer-modal";  // NEW
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
  const [showTransferModal, setShowTransferModal] = useState(false);  // NEW
  const [showVerifyTransferModal, setShowVerifyTransferModal] = useState(false);  // NEW
  const [selectedTransferId, setSelectedTransferId] = useState<string>("");  // NEW

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
          router.push("/login"); // Only redirect if no modals are open
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

    // Dispatch modal state to layout.tsx
    window.dispatchEvent(new CustomEvent("modal-state", { detail: { isActive: showDepositModal || showWithdrawModal || showVerifyModal } }));

    return () => window.removeEventListener("session-updated", handleSessionUpdate);
  }, [router, showDepositModal, showWithdrawModal, showVerifyModal , showTransferModal , showVerifyTransferModal]);

  const dismissMessage = () => {
    setMessage(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-slate-600">Loading wallet...</div>;
  }

  return (
    <>
      <main className="min-h-screen bg-white p-4 md:p-6 lg:p-8 md:ml-64">
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
            <DepositModal onClose={() => setShowDepositModal(false)} onSetMessage={setMessage} />
          )}
          {showWithdrawModal && (
            <WithdrawModal
              onClose={() => setShowWithdrawModal(false)}
              onSuccess={(txId?: string) => {
                setShowWithdrawModal(false);
                if (txId) {
                  setSelectedTransactionId(txId);
                }
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
          {showTransferModal && (  // NEW: Render TransferModal
        <TransferModal
          onClose={() => setShowTransferModal(false)}
          onSuccess={(txId?: string) => {
            setShowTransferModal(false);
            if (txId) {
              setSelectedTransferId(txId);
            }
            setShowVerifyTransferModal(true);
          }}
          onSetMessage={setMessage}
        />
      )}
      {showVerifyTransferModal && (  // NEW: Render VerifyTransferModal
        <VerifyTransferModal
          transactionId={selectedTransferId}
          onClose={() => setShowVerifyTransferModal(false)}
          onSetMessage={setMessage}
        />
      )}
        </div>
      </main>

      {message && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl animate-in slide-in-from-bottom mx-auto p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Notice</h3>
              <button onClick={() => setMessage(null)} className="text-2xl font-bold text-slate-900">
                X
              </button>
            </div>
            <div className="mt-4">
              <p className={message.type === "error" ? "text-red-600" : "text-green-600"}>{message.text}</p>
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={dismissMessage}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 font-semibold py-2 px-4 rounded-xl transition-colors"
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