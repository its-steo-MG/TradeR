// components/dashboard/balance-card.tsx
"use client";

import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "@/lib/format-currency";

interface BalanceCardProps {
  balance: number;
  username: string;
  isRealAccount: boolean;
  showBalance: boolean;
  onToggleBalance: () => void;
  accountType?: string; // Added to handle pro-fx
}

export function BalanceCard({
  balance,
  username,
  isRealAccount,
  showBalance,
  onToggleBalance,
  accountType,
}: BalanceCardProps) {
  const isProFx = accountType === "pro-fx";

  return (
    <div className="mb-8 w-full max-w-lg mx-auto">
      <div
        className={`relative rounded-xl p-6 sm:p-8 bg-gradient-to-br ${
          isProFx
            ? "from-purple-600 to-purple-800"
            : isRealAccount
            ? "from-orange-600 to-orange-800"
            : "from-blue-600 to-blue-800"
        } text-white shadow-lg transform transition-all hover:scale-105 border border-white/20 overflow-hidden`}
      >
        {/* Card Chip */}
        <div className="absolute top-4 left-4 w-10 h-6 sm:w-12 sm:h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-md shadow-inner"></div>

        {/* Account Icon */}
        <div className="absolute top-4 right-4">
          <div
            className={`w-10 h-10 sm:w-16 sm:h-16 rounded-full  ${
              isProFx
                ? "from-purple-400 to-purple-500"
                : isRealAccount
                ? "from-orange-400 to-orange-500"
                : "from-blue-400 to-blue-500"
            } flex items-center justify-center overflow-hidden shadow-md`}
          >
            <Image
              src={
                isProFx
                  ? "/pro-fx-account-icon.png"
                  : isRealAccount
                  ? "/real-account-icon.png"
                  : "/demo-account-icon.png"
              }
              alt={isProFx ? "Pro-FX Account" : isRealAccount ? "Real Account" : "Demo Account"}
              width={30}
              height={30}
              className="w-10 h-10 sm:w-14 sm:h-14 object-cover"
            />
          </div>
        </div>

        {/* Balance Section */}
        <div className="mt-12 sm:mt-16">
          <p className="text-white/80 text-xs sm:text-sm mb-2">Account Balance</p>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold">
              {showBalance ? `$${formatCurrency(balance)}` : "••••••"}
            </h2>
            <button
              onClick={onToggleBalance}
              className="p-2 hover:bg-white/20 rounded-lg transition"
              aria-label={showBalance ? "Hide balance" : "Show balance"}
            >
              {showBalance ? (
                <Eye size={20} className="sm:w-6 sm:h-6" />
              ) : (
                <EyeOff size={20} className="sm:w-6 sm:h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Card Holder and Card Icon */}
        <div className="flex justify-between items-end mt-8 sm:mt-12">
          <div>
            <p className="text-white/80 text-xs sm:text-sm mb-1">Card Holder</p>
            <p className="text-base sm:text-lg font-semibold uppercase tracking-wider">
              {username}
            </p>
          </div>
          <div className="text-xl sm:text-2xl">💳</div>
        </div>

        {/* Card Number Placeholder */}
        <div className="mt-4">
          <p className="text-white/60 text-xs sm:text-sm tracking-widest">
            XXXX XXXX XXXX {isProFx ? "9012" : isRealAccount ? "1234" : "5678"}
          </p>
        </div>
      </div>
    </div>
  );
}