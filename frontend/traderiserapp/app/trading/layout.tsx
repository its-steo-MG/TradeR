"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { TopNavbar } from "@/components/top-navbar";
import { api } from "@/lib/api";
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

interface TradingLayoutProps {
  children: React.ReactNode;
}

export default function TradingLayout({ children }: TradingLayoutProps) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [loginType, setLoginType] = useState<string>("real");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalActive, setIsModalActive] = useState<boolean>(false);

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
        if (isModalActive) {
          setIsLoggedIn(false);
          setUser(null);
          setActiveAccount(null);
          setError("Session expired. Please complete the action and log in again.");
          setIsLoading(false);
          toast.error("Session expired. Please complete the action and log in again.");
          return;
        }
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
          throw new Error("Invalid session data: accounts missing or not an array");
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
        const storedAccountType = localStorage.getItem("account_type") ||
                                 (storedLoginType === "real" ? "standard" : "demo");

        setLoginType(storedLoginType);

        const account =
          normalizedUser.accounts.find((acc) => acc.account_type === storedAccountType) ||
          (storedLoginType === "real"
            ? normalizedUser.accounts.find((acc) => acc.account_type === "standard")
            : normalizedUser.accounts.find((acc) => acc.account_type === "demo")) ||
          normalizedUser.accounts[0];

        if (!account) {
          throw new Error("No valid account found in session data");
        }

        setActiveAccount(account);
        localStorage.setItem("active_account_id", String(account.id));
        localStorage.setItem("account_type", account.account_type);
        localStorage.setItem("login_type", account.account_type === "demo" ? "demo" : "real");
      } catch (error) {
        if (isModalActive) {
          setError("Failed to load session. Please complete the action and log in again.");
          setIsLoading(false);
          toast.error("Failed to load session. Please complete the action and log in again.");
          return;
        }
        setIsLoggedIn(false);
        setUser(null);
        setActiveAccount(null);
        setError("Failed to load session. Please log in again.");
        toast.error("Failed to load session. Please log in again.");
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

  const handleSwitchAccount = async (account: Account) => {
    if (!account || !user) {
      toast.error("No account selected");
      return;
    }

    try {
      const accountId = Number(account.id);
      if (isNaN(accountId)) {
        toast.error("Invalid account ID");
        return;
      }

      const response = await api.switchAccount({ account_id: accountId });

      if (response.error) {
        if (response.status === 401 && isModalActive) {
          toast.error("Session expired. Please complete the action and try again.");
          return;
        }
        if (response.status === 401) {
          handleLogout();
          return;
        }
        toast.warning("Account switched locally, but server sync failed.");
      }

      const updatedAccount: Account = {
        ...account,
        balance: Number(account.balance) || 0,
      };

      setActiveAccount(updatedAccount);
      localStorage.setItem("active_account_id", String(account.id));
      localStorage.setItem("account_type", account.account_type);
      localStorage.setItem("login_type", account.account_type === "demo" ? "demo" : "real");

      const updatedUser: User = {
        ...user,
        accounts: user.accounts.map((acc) =>
          String(acc.id) === String(account.id)
            ? updatedAccount
            : { ...acc, balance: Number(acc.balance) || 0 }
        ),
      };

      setUser(updatedUser);
      localStorage.setItem("user_session", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("session-updated"));
    } catch (error) {
      console.error("Error switching account:", error);
      toast.warning("Account switched locally, but server sync failed.");

      const updatedAccount: Account = {
        ...account,
        balance: Number(account.balance) || 0,
      };
      setActiveAccount(updatedAccount);

      const updatedUser: User = {
        ...user,
        accounts: user.accounts.map((acc) =>
          String(acc.id) === String(account.id)
            ? updatedAccount
            : { ...acc, balance: Number(acc.balance) || 0 }
        ),
      };

      setUser(updatedUser);
      localStorage.setItem("user_session", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("session-updated"));
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUser(null);
    setActiveAccount(null);
    setLoginType("real");
    window.dispatchEvent(new Event("custom-storage-change"));
    window.location.href = "/login";
  };

  const accountBalance = activeAccount?.balance ? Number(activeAccount.balance) : 0;

  const availableAccounts: Account[] =
    loginType === "real"
      ? (user?.accounts || []).filter((acc) => acc.account_type !== "demo")
      : (user?.accounts || []).filter((acc) => acc.account_type === "demo");

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
        accountBalance={accountBalance}
        showBalance={true}
        activeAccount={activeAccount}
        accounts={availableAccounts}
        onSwitchAccount={handleSwitchAccount}
        onLogout={handleLogout}
      />
      <Sidebar
        loginType={loginType}
        activeAccount={activeAccount}
        accounts={availableAccounts}
      />
      <main className="flex-1 w-full overflow-auto">{children}</main>
    </div>
  );
}
