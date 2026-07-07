// app/dashboard/layout.tsx
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

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [loginType, setLoginType] = useState<"real" | "demo">("real");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = () => {
      setIsLoading(true);
      setError(null);
      const raw = localStorage.getItem("user_session");

      if (!raw) {
        setIsLoggedIn(false);
        setUser(null);
        setActiveAccount(null);
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

        const activeId = localStorage.getItem("active_account_id");
        let account = normalizedUser.accounts.find((acc) => String(acc.id) === String(activeId));

        if (!account) {
          // Default: prefer standard > mt5 real > first account
          account = normalizedUser.accounts.find((a) => a.account_type === "standard") ||
                    normalizedUser.accounts.find((a) => a.account_type === "mt5") ||
                    normalizedUser.accounts[0];
        }

        if (account) {
          setActiveAccount(account);
          setLoginType(
            account.account_type === "demo" || account.account_type === "mt5-demo" ? "demo" : "real"
          );
        }
      } catch (err) {
        console.error("Error parsing user_session:", err);
        setError("Failed to load session.");
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
    localStorage.setItem("login_type", 
      account.account_type === "demo" || account.account_type === "mt5-demo" ? "demo" : "real"
    );

    const updatedUser: User = {
      ...user,
      accounts: user.accounts.map((acc) =>
        String(acc.id) === String(account.id)
          ? { ...acc, balance: Number(account.balance) || 0 }
          : acc
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

  // ====================== PROPER ACCOUNT FILTERING ======================
  const realAccounts = (user?.accounts || []).filter((acc) => 
    acc.account_type !== "demo" && acc.account_type !== "mt5-demo"
  );

  const demoAccounts = (user?.accounts || []).filter((acc) => 
    acc.account_type === "demo" || acc.account_type === "mt5-demo"
  );

  const availableAccounts = loginType === "real" ? realAccounts : demoAccounts;

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
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
        <Sidebar
          loginType={loginType}
          activeAccount={activeAccount}
          accounts={availableAccounts}
        />
        <main className="flex-1 w-full overflow-auto md:pl-64">{children}</main>
      </div>
    </div>
  );
}

// Add this logout function if missing
const handleLogout = () => {
  localStorage.clear();
  window.location.href = "/login";
};