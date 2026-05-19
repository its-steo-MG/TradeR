// app/digits-trading/layout.tsx
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { TopNavbar } from "@/components/top-navbar";
import { toast } from "sonner";
import type { Account } from "@/types/account";

interface User {
  username: string;
  email: string;
  phone: string;
  is_sashi: boolean;
  is_email_verified: boolean;
  accounts: Account[];
}

interface DigitsTradingLayoutProps {
  children: React.ReactNode;
}

export default function DigitsTradingLayout({ children }: DigitsTradingLayoutProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [loginType, setLoginType] = useState<string>("real");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalActive, setIsModalActive] = useState(false);

  useEffect(() => {
    const handleModalState = (event: CustomEvent<{ isActive: boolean }>) => {
      setIsModalActive(event.detail.isActive);
    };
    window.addEventListener("modal-state", handleModalState as EventListener);

    const loadSession = async () => {
      setIsLoading(true);
      setError(null);
      const raw = localStorage.getItem("user_session");
      if (!raw) {
        setError("No session data found. Please log in.");
        setIsLoading(false);
        toast.error("No session data found. Please log in.");
        window.location.href = "/login";
        return;
      }
      try {
        const data = JSON.parse(raw) as User;
        if (!data || !data.accounts || !Array.isArray(data.accounts)) {
          throw new Error("Invalid session data");
        }
        const normalizedUser: User = {
          ...data,
          accounts: data.accounts.map((acc) => ({
            ...acc,
            balance: Number(acc.balance) || 0,
          })),
        };
        setIsLoggedIn(true);
        setUser(normalizedUser);
        const storedLoginType = localStorage.getItem("login_type") || "real";
        const storedAccountType =
          localStorage.getItem("account_type") ||
          (storedLoginType === "real" ? "standard" : "demo");
        setLoginType(storedLoginType);
        const account =
          normalizedUser.accounts.find((acc) => acc.account_type === storedAccountType) ||
          normalizedUser.accounts[0];
        if (!account) throw new Error("No valid account found");
        setActiveAccount(account);
        localStorage.setItem("active_account_id", String(account.id));
        localStorage.setItem("account_type", account.account_type);
        localStorage.setItem(
          "login_type",
          account.account_type === "demo" ? "demo" : "real"
        );
      } catch {
        setError("Failed to load session. Please log in again.");
        toast.error("Failed to load session.");
        window.location.href = "/login";
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
    window.addEventListener("session-updated", loadSession);
    return () => {
      window.removeEventListener("session-updated", loadSession);
      window.removeEventListener("modal-state", handleModalState as EventListener);
    };
  }, [isModalActive]);

  const handleSwitchAccount = async (_account: Account) => {
    // unchanged
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const accountBalance = activeAccount?.balance ? Number(activeAccount.balance) : 0;
  const availableAccounts =
    loginType === "real"
      ? (user?.accounts || []).filter((acc) => acc.account_type !== "demo")
      : (user?.accounts || []).filter((acc) => acc.account_type === "demo");

  if (isLoading)
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  if (error)
    return <div className="min-h-screen flex items-center justify-center text-red-400 bg-black">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <TopNavbar
        isLoggedIn={isLoggedIn}
        user={user}
        accountBalance={accountBalance}
        showBalance={true}
        activeAccount={activeAccount}
        accounts={availableAccounts}
        onSwitchAccount={handleSwitchAccount}
        onLogout={handleLogout}
      />

      {/* Responsive shell: sidebar visible from lg+, content fills remaining width */}
      <div className="flex-1 flex w-full">
        <aside className="hidden lg:block lg:w-64 xl:w-72 shrink-0 border-r border-slate-800 bg-slate-950/60">
          <Sidebar
            loginType={loginType}
            activeAccount={activeAccount}
            accounts={availableAccounts}
          />
        </aside>

        {/* Mobile sidebar (renders its own drawer/trigger inside the component) */}
        <div className="lg:hidden">
          <Sidebar
            loginType={loginType}
            activeAccount={activeAccount}
            accounts={availableAccounts}
          />
        </div>

        <main className="flex-1 w-full min-w-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
