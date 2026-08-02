"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  LogOut,
  Menu,
  X,
  WalletIcon,
  Bot,
  User,
  Zap,
  MessageSquare,
  Headset,
  Briefcase,
  Copy,
  Hash,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { Account } from "@/types/account";

type LoginType = "real" | "demo" | string;

interface SidebarProps {
  loginType: LoginType;
  activeAccount?: Account | null;
  accounts?: Account[];
  onSwitchAccount?: (account: Account) => void;
}

const ACTIVE_ACCOUNT_KEY = "active_account_id";

export function Sidebar({
  loginType,
  activeAccount: propActiveAccount,
  accounts = [],
  onSwitchAccount,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [activeAccount, setActiveAccount] = useState<Account | null>(
    propActiveAccount ?? null
  );

  useEffect(() => {
    const storedId = Number(localStorage.getItem(ACTIVE_ACCOUNT_KEY));

    if (Array.isArray(accounts) && accounts.length > 0) {
      let found = accounts.find((a) => a.id === storedId);

      if (!found) {
        if (loginType === "demo") {
          found =
            accounts.find(
              (a) => a.account_type === "demo" && a.platform === "traderiser"
            ) || accounts.find((a) => a.account_type === "demo");
        } else {
          found =
            accounts.find((a) => a.account_type === "standard") || accounts[0];
        }
      }

      setActiveAccount(found || accounts[0]);
    } else if (propActiveAccount) {
      setActiveAccount(propActiveAccount);
    }
  }, [accounts, propActiveAccount, loginType]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ account: Account }>;
      setActiveAccount(ev.detail.account);
    };
    window.addEventListener("account-switch", handler);
    return () => window.removeEventListener("account-switch", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const newBalance = (e as CustomEvent).detail;
      setActiveAccount((prev) =>
        prev ? { ...prev, balance: newBalance } : prev
      );
    };
    window.addEventListener("balance-updated", handler);
    return () => window.removeEventListener("balance-updated", handler);
  }, []);

  useEffect(() => setIsOpen(false), [pathname]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const switchAccount = (account: Account) => {
    setActiveAccount(account);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(account.id));
    onSwitchAccount?.(account);
    window.dispatchEvent(
      new CustomEvent("account-switch", { detail: { account } })
    );
  };

  const displayedAccounts =
    loginType === "demo"
      ? accounts.filter(
          (acc) =>
            acc.account_type === "demo" || acc.account_type === "mt5-demo"
        )
      : accounts.filter(
          (acc) =>
            acc.account_type !== "demo" && acc.account_type !== "mt5-demo"
        );

  const navItems = (() => {
    if (!activeAccount) {
      return [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/trading", label: "Trading", icon: TrendingUp },
      ];
    }

    const isDemo =
      activeAccount.account_type === "demo" ||
      activeAccount.account_type === "mt5-demo";
    const isMt5 = activeAccount.platform === "mt5";
    const isProFx = activeAccount.account_type === "pro-fx";

    let items;

    if (isProFx) {
      items = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/fx-pro-trading", label: "Pro-FX Trading", icon: Zap },
        { href: "/fx-pro-robots", label: "Pro-Robots", icon: Bot },
        { href: "/wallet", label: "Wallet", icon: WalletIcon },
        { href: "/profile", label: "Profile", icon: User },
        { href: "/copy-trading", label: "Copy Trading", icon: Copy },
        { href: "/customercare", label: "Customer Care", icon: MessageSquare },
        { href: "/agents", label: "Agent Services", icon: Headset },
        { href: "/management", label: "Account Management", icon: Briefcase },
      ];
    } else if (isMt5) {
      items = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/mt5", label: "MT5 Trading", icon: TrendingUp },
        { href: "/fx-pro-robots", label: "Pro-Robots", icon: Bot },
        { href: "/wallet", label: "Wallet", icon: WalletIcon },
        { href: "/profile", label: "Profile", icon: User },
        { href: "/customercare", label: "Customer Care", icon: MessageSquare },
        { href: "/agents", label: "Agent Services", icon: Headset },
      ];
    } else {
      items = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/trading", label: "Trading", icon: TrendingUp },
        { href: "/digits-trading", label: "Digits Trading", icon: Hash },
        { href: "/robots", label: "Robots", icon: Bot },
        { href: "/wallet", label: "Wallet", icon: WalletIcon },
        { href: "/profile", label: "Profile", icon: User },
        { href: "/copy-trading", label: "Copy Trading", icon: Copy },
        { href: "/customercare", label: "Customer Care", icon: MessageSquare },
        { href: "/agents", label: "Agent Services", icon: Headset },
        { href: "/management", label: "Account Management", icon: Briefcase },
      ];
    }

    if (isDemo) {
      items = items.filter((item) => item.href !== "/wallet");
    }

    return items;
  })();

  return (
    <>
      {/* Mobile toggle — kept exactly as your correct version */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-60 md:hidden bg-gradient-to-r from-pink-500 to-pink-600 p-2 rounded-lg"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 sm:w-60 md:w-64 bg-gradient-to-b from-black to-slate-900 border-r border-white/10 z-50 transform transition-transform duration-300 overflow-hidden flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Video Header */}
        <div className="relative h-40 sm:h-36 md:h-48 w-full overflow-hidden flex-shrink-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/sidebg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent" />
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 p-3 sm:p-3 md:p-4 flex-1 overflow-y-auto">
          {activeAccount && (
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-lg flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {activeAccount.platform === "mt5" ? "MT5" : "Traderiser"} -{" "}
                  {activeAccount.account_type.charAt(0).toUpperCase() +
                    activeAccount.account_type.slice(1)}
                </p>
                <p className="text-xs text-white/70">
                  ${Number(activeAccount.balance ?? 0).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Account Switcher */}
          {Array.isArray(displayedAccounts) && displayedAccounts.length > 1 && (
            <select
              value={activeAccount?.id ?? ""}
              onChange={(e) => {
                const acc = displayedAccounts.find(
                  (a) => a.id === Number(e.target.value)
                );
                if (acc) switchAccount(acc);
              }}
              className="bg-slate-700 text-white px-3 py-2 rounded-lg w-full text-sm flex-shrink-0"
            >
              {displayedAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.platform === "mt5" ? "MT5" : "Traderiser"} -{" "}
                  {acc.account_type.charAt(0).toUpperCase() +
                    acc.account_type.slice(1)}{" "}
                  (${Number(acc.balance).toFixed(2)})
                </option>
              ))}
            </select>
          )}

          <nav className="flex flex-col gap-2 min-h-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    relative flex items-center gap-3 px-4 py-2 sm:py-2.5 md:py-3 rounded-lg
                    transition-all group flex-shrink-0
                    ${
                      isActive
                        ? "drop-on-top bg-gradient-to-r from-pink-500/30 to-pink-600/30 border border-pink-500/50 text-pink-300 shadow-lg shadow-pink-500/10"
                        : "text-white/70 hover:text-white hover:bg-white/5 hover:border hover:border-white/10"
                    }
                  `}
                >
                  <span className="relative z-[1] flex items-center gap-3 w-full">
                    <Icon
                      size={20}
                      className={
                        isActive
                          ? "text-pink-300 flex-shrink-0"
                          : "text-white/70 group-hover:text-white flex-shrink-0"
                      }
                    />
                    <span className="font-medium text-sm sm:text-sm md:text-base truncate">
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="ml-auto w-1 h-8 bg-gradient-to-b from-pink-400 to-pink-600 rounded-full flex-shrink-0" />
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-3 sm:p-3 md:p-4 border-t border-white/10 flex-shrink-0 bg-gradient-to-t from-black/50 to-transparent">
          <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-500">
              Trade Riser v4.0
            </p>
            <p className="text-xs text-white/70">Advanced Multi-Broker</p>
          </div>

          <button
            onClick={handleLogout}
            className="
              drop-on-top relative
              flex items-center gap-3 px-4 py-2 sm:py-2.5 md:py-3 rounded-lg
              text-white/70 hover:text-red-400 hover:bg-red-500/10
              transition-all w-full group text-sm md:text-base
            "
          >
            <span className="relative z-[1] flex items-center gap-3">
              <LogOut
                size={20}
                className="text-white/70 group-hover:text-red-400 flex-shrink-0"
              />
              <span className="font-medium truncate">Logout</span>
            </span>
          </button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}