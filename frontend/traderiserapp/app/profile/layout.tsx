// app/profile/layout.tsx
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

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [loginType, setLoginType] = useState("real");
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
          accounts: data.accounts.map((acc) => ({ ...acc, balance: Number(acc.balance) || 0 })),
        };
        setIsLoggedIn(true);
        setUser(normalizedUser);
        const activeId = localStorage.getItem("active_account_id");
        const account =
          normalizedUser.accounts.find((acc) => String(acc.id) === String(activeId)) ||
          normalizedUser.accounts.find((acc) => acc.account_type === "standard") ||
          normalizedUser.accounts[0];
        if (!account) throw new Error("No valid account found");
        setActiveAccount(account);
        setLoginType(account.account_type === "demo" ? "demo" : "real");
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
      accounts: user.accounts.map((acc) =>
        String(acc.id) === String(account.id) ? { ...acc, balance: Number(account.balance) || 0 } : acc,
      ),
    };
    setUser(updatedUser);
    setActiveAccount(account);
    setLoginType(account.account_type === "demo" ? "demo" : "real");
    localStorage.setItem("user_session", JSON.stringify(updatedUser));
    window.dispatchEvent(new Event("session-updated"));
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const availableAccounts =
    loginType === "real"
      ? (user?.accounts || []).filter((acc) => acc.account_type !== "demo")
      : (user?.accounts || []).filter((acc) => acc.account_type === "demo");

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-background text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopNavbar
        isLoggedIn={isLoggedIn}
        user={user}
        accountBalance={Number(activeAccount?.balance) || 0}
        showBalance={true}
        activeAccount={activeAccount}
        accounts={availableAccounts}
        onSwitchAccount={handleSwitchAccount}
        onLogout={handleLogout}
      />
      <div className="flex flex-1">
        <Sidebar loginType={loginType} activeAccount={activeAccount} accounts={availableAccounts} />
        <main className="flex-1 w-full overflow-auto md:pl-64">{children}</main>
      </div>
    </div>
  );
}
