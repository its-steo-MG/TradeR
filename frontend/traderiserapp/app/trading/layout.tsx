// app/trading/layout.tsx
"use client";

import type React from "react";
import { Sidebar } from "@/components/sidebar";
import { TopNavbar } from "@/components/top-navbar";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Account {
  id: number;
  account_type: string;
  balance: number;
  kyc_verified?: boolean;
}

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
  const [isModalActive, setIsModalActive] = useState<boolean>(false); // For modal redirect prevention

  useEffect(() => {
    const handleModalState = (event: CustomEvent) => {
      console.log(`Trading Layout - Modal state updated: isActive=${event.detail.isActive}`); // Debug log
      setIsModalActive(event.detail.isActive);
    };
    window.addEventListener("modal-state", handleModalState as EventListener);

    const loadSession = async () => {
      console.log("Trading Layout - loadSession called, isModalActive:", isModalActive); // Debug log
      setIsLoading(true);
      setError(null);
      const raw = localStorage.getItem("user_session");

      if (!raw) {
        if (isModalActive) {
          console.log("Trading Layout - Skipping redirect to /login due to active modal (no user_session)");
          setIsLoggedIn(false);
          setUser(null);
          setActiveAccount(null);
          setError("Session expired. Please complete the action and log in again.");
          setIsLoading(false);
          toast.error("Session expired. Please complete the action and log in again.");
          return;
        }
        console.log("Trading Layout - No session data, redirecting to /login");
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
        const data: User = JSON.parse(raw);
        if (!data || !data.accounts || !Array.isArray(data.accounts)) {
          throw new Error("Invalid session data: accounts missing or not an array");
        }

        // Ensure balance is a number
        const normalizedUser: User = {
          ...data,
          accounts: data.accounts.map((acc: Account) => ({
            ...acc,
            balance: Number(acc.balance) || 0,
          })),
        };

        setIsLoggedIn(true);
        setUser(normalizedUser);
       const storedLoginType = localStorage.getItem("login_type") || "real";  // Get this first
       const storedAccountType = localStorage.getItem("account_type") ||
                                 (storedLoginType === "real" ? "standard" : "demo");  // ← CHANGE: Dynamic default based on login_type
       
       setLoginType(storedLoginType);
       const account = normalizedUser.accounts.find((acc: Account) => acc.account_type === storedAccountType) ||
                      (storedLoginType === "real" ? normalizedUser.accounts.find((acc: Account) => acc.account_type === "standard") : normalizedUser.accounts.find((acc: Account) => acc.account_type === "demo")) ||
                      normalizedUser.accounts[0];;
       
        if (!account) {
          throw new Error("No valid account found in session data");
        }

        setActiveAccount({
          ...account,
          balance: Number(account.balance),
        });
        localStorage.setItem("active_account_id", account.id.toString());
        localStorage.setItem("account_type", account.account_type);
        localStorage.setItem("login_type", account.account_type === "demo" ? "demo" : "real");
      } catch (error) {
        console.error("Trading Layout - Error parsing user_session:", error);
        if (isModalActive) {
          console.log("Trading Layout - Skipping redirect to /login due to active modal (error case)");
          setIsLoggedIn(false);
          setUser(null);
          setActiveAccount(null);
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

  const handleLogout = () => {
    console.log("Trading Layout - Logging out, clearing localStorage"); // Debug log
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("account_type");
    localStorage.removeItem("user_session");
    localStorage.setItem("active_account_id", "");
    localStorage.removeItem("login_type");
    window.dispatchEvent(new Event("custom-storage-change"));
    setIsLoggedIn(false);
    setUser(null);
    setActiveAccount(null);
    setLoginType("real");
    window.location.href = "/login";
  };

  const handleSwitchAccount = async (account: Account) => {
    console.log("Trading Layout - Switching account to:", account?.id); // Debug log
    if (!account) {
      toast.error("No account selected");
      return;
    }
    try {
      const response = await api.switchAccount({ account_id: account.id });
      if (response.error) {
        console.error("Trading Layout - Switch account failed:", response.error);
        if (response.status === 401 && isModalActive) {
          console.log("Trading Layout - Skipping switch account redirect due to active modal");
          toast.error("Session expired. Please complete the action and try again.");
          return;
        }
        if (response.status === 401) {
          handleLogout();
          return;
        }
        toast.warning("Account switched locally, but server sync failed. Balance may be outdated.");
      } else if (response.data) {
        const balance = (response.data as { balance?: number })?.balance;
        if (typeof balance !== "undefined") {
          console.log("Trading Layout - Switched Account Balance:", balance);
        } else {
          console.log("Trading Layout - Switch account succeeded (no balance returned)");
        }
      }

      const updatedAccount: Account = {
        ...account,
        balance: Number(account.balance) || 0,
      };
      setActiveAccount(updatedAccount);
      localStorage.setItem("active_account_id", account.id.toString());
      localStorage.setItem("account_type", account.account_type);
      localStorage.setItem("login_type", account.account_type === "demo" ? "demo" : "real");
      const updatedUser: User = {
        ...user!,
        accounts: user!.accounts.map((acc: Account) =>
          acc.id === account.id ? updatedAccount : { ...acc, balance: Number(acc.balance) || 0 }
        ),
      };
      setUser(updatedUser);
      localStorage.setItem("user_session", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("session-updated"));
    } catch (error) {
      console.error("Trading Layout - Error switching account:", error);
      toast.warning("Account switched locally, but server sync failed. Please try again later.");
      // Proceed with local update for UI consistency
      const updatedAccount: Account = {
        ...account,
        balance: Number(account.balance) || 0,
      };
      setActiveAccount(updatedAccount);
      localStorage.setItem("active_account_id", account.id.toString());
      localStorage.setItem("account_type", account.account_type);
      localStorage.setItem("login_type", account.account_type === "demo" ? "demo" : "real");
      const updatedUser: User = {
        ...user!,
        accounts: user!.accounts.map((acc: Account) =>
          acc.id === account.id ? updatedAccount : { ...acc, balance: Number(acc.balance) || 0 }
        ),
      };
      setUser(updatedUser);
      localStorage.setItem("user_session", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("session-updated"));
    }
  };

  const accountBalance = activeAccount?.balance ? Number(activeAccount.balance) : 0;
  const availableAccounts: Account[] = loginType === "real"
    ? (user?.accounts || []).filter((acc: Account) => acc.account_type !== "demo")
    : (user?.accounts || []).filter((acc: Account) => acc.account_type === "demo");

  useEffect(() => {
    console.log("Trading Layout - Active Account:", activeAccount);
    console.log("Trading Layout - User Session:", user);
    console.log("Trading Layout - Account Balance:", accountBalance);
    console.log("Trading Layout - Login Type:", loginType);
  }, [activeAccount, user, accountBalance, loginType]);

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
      <Sidebar loginType={loginType} activeAccount={activeAccount} />
      <main className="flex-1 w-full overflow-auto">{children}</main>
    </div>
  );
}