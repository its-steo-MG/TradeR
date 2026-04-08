// components/dashboard/action-buttons.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export function ActionButtons() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 gap-4 mb-8 w-full">
      <button
        onClick={() => router.push("/wallet")}
        className="group relative px-6 py-4 rounded-xl font-semibold text-white transition-all duration-300 overflow-hidden"
      >
        {/* Emerald gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-700 group-hover:from-emerald-500 group-hover:to-emerald-600 transition-all duration-300" />
        
        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
        
        {/* Content */}
        <div className="relative flex items-center justify-center gap-2 z-10">
          <ArrowDownLeft size={20} />
          <span>Deposit</span>
        </div>
      </button>

      <button
        onClick={() => router.push("/wallet")}
        className="group relative px-6 py-4 rounded-xl font-semibold text-white transition-all duration-300 overflow-hidden"
      >
        {/* Red gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-700 group-hover:from-red-500 group-hover:to-red-600 transition-all duration-300" />
        
        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
        
        {/* Content */}
        <div className="relative flex items-center justify-center gap-2 z-10">
          <ArrowUpRight size={20} />
          <span>Withdraw</span>
        </div>
      </button>
    </div>
  );
}
