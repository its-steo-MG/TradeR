"use client";

import { Volume2, VolumeX, Bot, ChevronDown } from "lucide-react";   // ← Replaced Bell with Bot
import type { Account } from "@/types/account";
import { useEffect, useState, useCallback } from "react";

type Props = {
  muted: boolean;
  onToggleMute: () => void;
  activeAccount?: Account | null;
  onOpenRobotPanel: () => void;        // ← NEW: Opens the S-Digit Robot panel
};

export default function TopBar({ 
  muted, 
  onToggleMute, 
  activeAccount: propActiveAccount,
  onOpenRobotPanel 
}: Props) {

  const [balance, setBalance] = useState<number>(0);
  const [activeAccount, setActiveAccount] = useState<Account | null>(propActiveAccount || null);

  // Improved balance loader - more robust
  const loadRealBalance = useCallback(() => {
    const raw = localStorage.getItem("user_session");
    if (!raw) {
      setBalance(0);
      setActiveAccount(null);
      return;
    }

    try {
      const userData = JSON.parse(raw);
      const activeId = localStorage.getItem("active_account_id");
      const accountType = localStorage.getItem("account_type") || "standard";

      // Priority 1: Find by active_account_id
      let currentAccount = userData.accounts?.find(
        (acc: Account) => String(acc.id) === String(activeId)
      );

      // Priority 2: Find by account_type
      if (!currentAccount) {
        currentAccount = userData.accounts?.find(
          (acc: Account) => acc.account_type === accountType
        );
      }

      // Priority 3: First account as fallback
      if (!currentAccount && userData.accounts?.length) {
        currentAccount = userData.accounts[0];
      }

      if (currentAccount) {
        const realBalance = Number(currentAccount.balance) || 0;
        setBalance(realBalance);
        setActiveAccount(currentAccount);
      } else {
        setBalance(0);
        setActiveAccount(null);
      }
    } catch (err) {
      console.error("Failed to load real balance in TopBar:", err);
      setBalance(0);
      setActiveAccount(null);
    }
  }, []);

  // Listen for session updates from trades
  useEffect(() => {
    loadRealBalance();

    const handleSessionUpdate = () => {
      loadRealBalance();
    };

    window.addEventListener("session-updated", handleSessionUpdate);
    window.addEventListener("storage", handleSessionUpdate);

    return () => {
      window.removeEventListener("session-updated", handleSessionUpdate);
      window.removeEventListener("storage", handleSessionUpdate);
    };
  }, [loadRealBalance]);

  // Sync with prop when parent passes it (backup)
  useEffect(() => {
    if (propActiveAccount) {
      setActiveAccount(propActiveAccount);
      setBalance(Number(propActiveAccount.balance) || 0);
    }
  }, [propActiveAccount]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950">
      {/* Real Balance Display */}
      <button className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full pl-1 pr-3 py-1 hover:bg-slate-800 transition-colors flex-1">
        <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-700 flex-shrink-0">
          <img 
            src="/real-account-icon.png" 
            alt="Account Badge" 
            className="w-full h-full object-cover"
          />
        </div>

        <span className="text-blue-400 text-sm font-medium">
          ${Number(balance || 0).toFixed(2)}
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {/* Sound Toggle */}
      <button 
        onClick={onToggleMute} 
        className="p-2 rounded-full bg-slate-900 border border-slate-800 text-blue-400 hover:bg-slate-800 transition-colors"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* S-DIGIT ROBOT BUTTON - Deriv Style */}
      <button 
        onClick={onOpenRobotPanel}
        className="p-2 rounded-full bg-slate-900 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-400 transition-all active:scale-95"
        title="Load S-Digit Robot"
      >
        <Bot size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
}