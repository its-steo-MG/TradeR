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
  phone?: string;
  image?: string;
  is_sashi?: boolean;
  is_email_verified?: boolean;
  accounts: Account[];
}

export default function CopyTradingLayout({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [loginType, setLoginType] = useState<"real" | "demo">("real");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = () => {
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
        if (!data?.accounts?.length) throw new Error("Invalid session data");
        const normalizedUser: User = {
          ...data,
          accounts: data.accounts.map((a) => ({ ...a, balance: Number(a.balance) || 0 })),
        };
        setIsLoggedIn(true);
        setUser(normalizedUser);
        const activeId = localStorage.getItem("active_account_id");
        const account =
          normalizedUser.accounts.find((a) => String(a.id) === String(activeId)) ||
          normalizedUser.accounts.find((a) => a.account_type === "standard") ||
          normalizedUser.accounts[0];
        if (!account) throw new Error("No valid account found");
        setActiveAccount(account);
        setLoginType(
          account.account_type === "demo" || account.account_type === "mt5-demo" ? "demo" : "real"
        );
      } catch {
        setError("Failed to load session. Please log in again.");
        toast.error("Failed to load session. Please log in again.");
        window.location.href = "/login";
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
    window.addEventListener("session-updated", loadSession);
    return () => window.removeEventListener("session-updated", loadSession);
  }, []);

  const handleSwitchAccount = (account: Account) => {
    if (!account || !user) return;
    localStorage.setItem("active_account_id", String(account.id));
    localStorage.setItem("account_type", account.account_type);
    localStorage.setItem("login_type", account.account_type === "demo" ? "demo" : "real");
    const updatedUser: User = {
      ...user,
      accounts: user.accounts.map((a) =>
        String(a.id) === String(account.id) ? { ...a, balance: Number(account.balance) || 0 } : a
      ),
    };
    setUser(updatedUser);
    setActiveAccount(account);
    setLoginType(
      account.account_type === "demo" || account.account_type === "mt5-demo" ? "demo" : "real"
    );
    localStorage.setItem("user_session", JSON.stringify(updatedUser));
    window.dispatchEvent(new Event("session-updated"));
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const availableAccounts =
    loginType === "real"
      ? (user?.accounts || []).filter((a) => a.account_type !== "demo" && a.account_type !== "mt5-demo")
      : (user?.accounts || []).filter((a) => a.account_type === "demo" || a.account_type === "mt5-demo");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>
    );
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-red-500">{error}</div>;
  }

  return (
    <div className="relative flex min-h-screen flex-col text-foreground">
      <div className="fixed inset-0 z-0 hidden dark:block">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-950/30 to-pink-950/20" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-purple-700/8 rounded-full blur-3xl" />
      </div>
      <div className="fixed inset-0 z-0 block dark:hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-400/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col">
        <TopNavbar
          isLoggedIn={isLoggedIn}
          user={user}
          accountBalance={Number(activeAccount?.balance) || 0}
          showBalance
          activeAccount={activeAccount}
          accounts={availableAccounts}
          onSwitchAccount={handleSwitchAccount}
          onLogout={handleLogout}
        />
        <div className="flex flex-1 w-full">
          <Sidebar
            loginType={loginType}
            activeAccount={activeAccount}
            accounts={availableAccounts}
            onSwitchAccount={handleSwitchAccount}
          />
          <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-x-hidden">
            <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
