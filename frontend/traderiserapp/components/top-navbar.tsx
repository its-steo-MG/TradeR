// components/top-navbar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Account {
  id: number;
  account_type: string;
  balance: number;
  kyc_verified?: boolean;
}

interface User {
  username: string;
  email: string;
  image?: string;
  accounts: Account[];
}

interface TopNavbarProps {
  isLoggedIn?: boolean;
  user?: User | null;
  accountBalance: number;
  showBalance?: boolean;
  activeAccount: Account | null;
  accounts: Account[];
  onSwitchAccount: (account: Account) => void;
  onLogout?: () => void;
}

/* -------------------------------------------------
   Helper: keep active account in sync with the rest
   of the app via a custom event.
   ------------------------------------------------- */
const ACTIVE_ACCOUNT_KEY = "active_account_id";

function getStoredAccountId(): number | null {
  const raw = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  return raw ? Number(raw) : null;
}

export function TopNavbar({
  isLoggedIn = false,
  user = null,
  accountBalance,
  showBalance = false,
  activeAccount: propActiveAccount,
  accounts,
  onSwitchAccount,
  onLogout,
}: TopNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeAccount, setActiveAccount] = useState<Account | null>(propActiveAccount);

  /* -------------------------------------------------
     Keep local state in sync with any external switch
     (e.g. Sidebar) – listen to a custom event.
     ------------------------------------------------- */
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ account: Account }>;
      setActiveAccount(ev.detail.account);
    };
    window.addEventListener("account-switch", handler);
    return () => window.removeEventListener("account-switch", handler);
  }, []);

  /* -------------------------------------------------
     When the parent passes a new activeAccount (first
     render) make sure we store it.
     ------------------------------------------------- */
  useEffect(() => {
    if (propActiveAccount) {
      setActiveAccount(propActiveAccount);
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(propActiveAccount.id));
    }
  }, [propActiveAccount]);

  const handleAccountChange = (accountId: string) => {
    const selected = accounts.find((a) => a.id === Number(accountId));
    if (selected) {
      setActiveAccount(selected);
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(selected.id));
      onSwitchAccount(selected);
      window.dispatchEvent(
        new CustomEvent("account-switch", { detail: { account: selected } })
      );
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    onLogout?.();
    setIsMobileMenuOpen(false);
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    window.dispatchEvent(new Event("custom-storage-change"));
  };

  const formatAccountType = (type: string) =>
    type ? type.charAt(0).toUpperCase() + type.slice(1) : "Unknown";

  const formattedBalance = typeof accountBalance === "number" && !isNaN(accountBalance)
    ? accountBalance.toFixed(2)
    : "0.00";

  return (
    <nav className="sticky top-0 z-50 w-full bg-black/50 backdrop-blur-md border-b border-white/20">
      <div className="px-4 sm:px-6 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold text-white hidden sm:inline">Traderiser</span>
          </Link>

          {isLoggedIn && user && activeAccount ? (
            <div className="hidden md:flex items-center gap-4">
              {showBalance && (
                <>
                  <span className="text-sm text-white/70">Account Balance</span>
                  <span className="text-lg font-bold text-white">${formattedBalance}</span>
                </>
              )}
              <select
                value={activeAccount?.id || ""}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="bg-slate-700 text-white px-3 py-2 rounded-lg"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {formatAccountType(account.account_type)} (${Number(account.balance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              <Link href="/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Sign In</Button>
              </Link>
            </div>
          )}

          <div className="flex items-center gap-3">
            {isLoggedIn && user ? (
              <>
                <div className="hidden sm:flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <p className="text-sm font-medium text-white">{user.username || "User"}</p>
                    <p className="text-xs text-white/70 capitalize">
                      {activeAccount ? formatAccountType(activeAccount.account_type) : "Loading..."}
                    </p>
                  </div>
                  {user.image && (
                    <img
                      src={user.image || "/placeholder.svg"}
                      alt={user.username || "User"}
                      className="w-8 h-8 rounded-full border border-white/30"
                    />
                  )}
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="sm:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5 text-white" />
                  ) : (
                    <Menu className="w-5 h-5 text-white" />
                  )}
                </button>
              </>
            ) : (
              <Link href="/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Sign In</Button>
              </Link>
            )}
          </div>
        </div>

        {isMobileMenuOpen && isLoggedIn && user && (
          <div className="sm:hidden mt-4 pt-4 border-t border-white/20 space-y-3">
            <div className="flex items-center gap-3 pb-3">
              {user.image && (
                <img
                  src={user.image || "/placeholder.svg"}
                  alt={user.username || "User"}
                  className="w-10 h-10 rounded-full border border-white/30"
                />
              )}
              <div>
                <p className="text-sm font-medium text-white">{user.username || "User"}</p>
                <p className="text-xs text-white/70 capitalize">
                  {activeAccount ? formatAccountType(activeAccount.account_type) : "Loading..."}
                </p>
              </div>
            </div>
            {showBalance && activeAccount && (
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-white/70 mb-1">Account Balance</p>
                <p className="text-lg font-bold text-white">${formattedBalance}</p>
                <select
                  value={activeAccount?.id || ""}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className="mt-2 w-full bg-slate-700 text-white px-3 py-2 rounded-lg"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {formatAccountType(account.account_type)} (${Number(account.balance).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}