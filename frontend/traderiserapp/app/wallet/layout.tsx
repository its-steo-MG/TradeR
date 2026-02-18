// app/wallet/layout.tsx
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { TopNavbar } from "@/components/top-navbar";
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

interface Wallet {
  wallet_type: string;
  account_type: string;
  balance: string | number;
}

/**
 * Simple ApiResponse type used by the local api wrapper.
 * Adjust fields if your api wrapper returns a different shape.
 */
interface ApiResponse<T> {
  data?: T;
  error?: string | null;
  status?: number;
}

interface WalletLayoutProps {
  children: React.ReactNode;
}

export default function WalletLayout({ children }: WalletLayoutProps) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [loginType, setLoginType] = useState<string>("real");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalActive, setIsModalActive] = useState<boolean>(false);

  useEffect(() => {
    const handleModalState = (event: CustomEvent) => {
      console.log(`Modal state updated: isActive=${event.detail.isActive}`); // Debug log
      setIsModalActive(event.detail.isActive);
    };
    window.addEventListener("modal-state", handleModalState as EventListener);

    const loadSession = async () => {
      console.log(`loadSession called, isModalActive=${isModalActive}`); // Debug log
      setIsLoading(true);
      setError(null);
      const raw = localStorage.getItem("user_session");

      if (!raw) {
        if (isModalActive) {
          console.log("Skipping redirect to /login due to active modal (no user_session)");
          setIsLoggedIn(false);
          setUser(null);
          setActiveAccount(null);
          setError("Session expired. Please complete the action and log in again.");
          setIsLoading(false);
          toast.error("Session expired. Please complete the action and log in again.");
          return;
        }
        console.log("No session data, redirecting to /login");
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

        const normalizedUser: User = {
          ...data,
          accounts: data.accounts.map((acc: Account) => ({
            ...acc,
            balance: Number(acc.balance) || 0,
          })),
        };

        setIsLoggedIn(true);
        setUser(normalizedUser);
        const activeId = localStorage.getItem("active_account_id");
        const account = normalizedUser.accounts.find((acc: Account) => acc.id === Number(activeId)) ||
                       normalizedUser.accounts.find((acc: Account) => acc.account_type === "standard") ||
                       normalizedUser.accounts[0];

        if (!account) {
          throw new Error("No valid account found in session data");
        }

        setActiveAccount(account);
        setLoginType(account.account_type === "demo" ? "demo" : "real");

        // Skip wallet fetch if modal is active to avoid premature errors
        if (!isModalActive) {
          console.log("Fetching wallets, account_type:", account.account_type); // Debug log
          const walletRes: ApiResponse<{ wallets: Wallet[] }> = await api.getWallets();
          if (walletRes.error) {
            console.error("Wallet fetch failed:", walletRes.error, "status:", walletRes.status); // Debug log
            if (walletRes.status === 401 && isModalActive) {
              console.log("Skipping wallet fetch error redirect due to active modal");
              setError("Session expired. Please complete the action and log in again.");
              setIsLoading(false);
              return;
            }
            throw new Error(walletRes.error || "Failed to fetch wallets");
          }
          if (walletRes.data?.wallets) {
            const mainWallet = walletRes.data.wallets.find(
              (w: Wallet) => w.wallet_type === "main" && w.account_type === account.account_type
            );
            if (mainWallet) {
              console.log("Main wallet found:", mainWallet); // Debug log
              const updatedUser: User = {
                ...normalizedUser,
                accounts: normalizedUser.accounts.map((acc: Account) =>
                  acc.id === account.id ? { ...acc, balance: Number(mainWallet.balance) || 0 } : acc
                ),
              };
              setUser(updatedUser);
              setActiveAccount({ ...account, balance: Number(mainWallet.balance) || 0 });
              localStorage.setItem("user_session", JSON.stringify(updatedUser));
            }
          }
        } else {
          console.log("Skipping wallet fetch due to active modal");
        }
      } catch (error) {
        console.error("Error in loadSession:", error); // Debug log
        if (isModalActive) {
          console.log("Skipping redirect to /login due to active modal (error case)");
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

  const handleSwitchAccount = async (account: Account) => {
    console.log("Switching account to:", account?.id); // Debug log
    if (!account) {
      toast.error("No account selected");
      return;
    }
    try {
      const res: ApiResponse<unknown> = await api.switchAccount({ account_id: account.id });
      if (res.error) {
        console.error("Switch account failed:", res.error, "status:", res.status); // Debug log
        if (res.status === 401 && isModalActive) {
          console.log("Skipping switch account redirect due to active modal");
          toast.error("Session expired. Please complete the action and try again.");
          return;
        }
        if (res.status === 401) {
          handleLogout();
          return;
        }
        console.warn("Switch account API failed, proceeding with local update:", res.error);
        toast.warning("Account switched locally, but server sync failed. Balance may be outdated.");
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

      // Skip wallet fetch if modal is active
      if (!isModalActive) {
        const walletRes: ApiResponse<{ wallets: Wallet[] }> = await api.getWallets();
        if (walletRes.error) {
          console.error("Wallet fetch after switch failed:", walletRes.error, "status:", walletRes.status); // Debug log
          if (walletRes.status === 401 && isModalActive) {
            console.log("Skipping wallet fetch error redirect due to active modal");
            toast.error("Session expired. Please complete the action and try again.");
            return;
          }
          throw new Error(walletRes.error || "Failed to fetch wallets");
        }
        if (walletRes.data?.wallets) {
          const mainWallet = walletRes.data.wallets.find(
            (w: Wallet) => w.wallet_type === "main" && w.account_type === account.account_type
          );
          if (mainWallet) {
            const syncedUser: User = {
              ...updatedUser,
              accounts: updatedUser.accounts.map((acc: Account) =>
                acc.id === account.id ? { ...acc, balance: Number(mainWallet.balance) || 0 } : acc
              ),
            };
            setUser(syncedUser);
            setActiveAccount({ ...updatedAccount, balance: Number(mainWallet.balance) || 0 });
            localStorage.setItem("user_session", JSON.stringify(syncedUser));
          }
        }
      } else {
        console.log("Skipping wallet fetch after switch due to active modal");
      }
    } catch (error) {
      console.warn("Switch failed, proceeding with local update:", error);
      toast.warning("Account switched locally, but server sync failed. Please try again later.");
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

  const handleLogout = () => {
    console.log("Logging out, clearing localStorage"); // Debug log
    localStorage.clear();
    setIsLoggedIn(false);
    setUser(null);
    setActiveAccount(null);
    setLoginType("real");
    window.dispatchEvent(new Event("custom-storage-change"));
    window.location.href = "/login";
  };

  const availableAccounts: Account[] = loginType === "real"
    ? (user?.accounts || []).filter((acc: Account) => acc.account_type !== "demo")
    : (user?.accounts || []).filter((acc: Account) => acc.account_type === "demo");

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-black">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
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
      <Sidebar loginType={loginType} activeAccount={activeAccount} />
      <main className="flex-1 w-full overflow-auto">{children}</main>
    </div>
  );
}