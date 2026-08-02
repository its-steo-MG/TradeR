// components/dashboard/action-buttons.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface ActionButtonsProps {
  isDemo?: boolean;
  accountType?: string;
}

export function ActionButtons({ isDemo = false, accountType }: ActionButtonsProps) {
  const router = useRouter();
  const isMt5Demo = accountType === "mt5-demo";

  return (
    <div className="grid grid-cols-2 gap-4 mb-8 w-full">
      
      {/* Deposit */}
      <button
        onClick={() => !isDemo && router.push("/wallet")}
        disabled={isDemo}
        className={`
          drop-on-top group relative px-6 py-4 rounded-xl font-semibold text-white 
          transition-all duration-300 overflow-hidden
          ${isDemo ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {/* Original emerald gradient */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-700 
          ${isDemo ? "grayscale" : "group-hover:from-emerald-500 group-hover:to-emerald-600"} 
          transition-all duration-300`}
        />

        {/* Original shine effect on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
          translate-x-full ${!isDemo && "group-hover:translate-x-0"} 
          transition-transform duration-500`}
        />

        {/* Content */}
        <span className="relative z-[1] flex items-center justify-center gap-2">
          <ArrowDownLeft size={20} />
          <span>Deposit</span>
          {(isDemo || isMt5Demo) && (
            <span className="text-xs text-emerald-300">(Demo)</span>
          )}
        </span>
      </button>

      {/* Withdraw */}
      <button
        onClick={() => !isDemo && router.push("/wallet")}
        disabled={isDemo}
        className={`
          drop-on-top group relative px-6 py-4 rounded-xl font-semibold text-white 
          transition-all duration-300 overflow-hidden
          ${isDemo ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {/* Original red gradient */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-red-600 to-red-700 
          ${isDemo ? "grayscale" : "group-hover:from-red-500 group-hover:to-red-600"} 
          transition-all duration-300`}
        />

        {/* Original shine effect on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
          translate-x-full ${!isDemo && "group-hover:translate-x-0"} 
          transition-transform duration-500`}
        />

        {/* Content */}
        <span className="relative z-[1] flex items-center justify-center gap-2">
          <ArrowUpRight size={20} />
          <span>Withdraw</span>
          {(isDemo || isMt5Demo) && (
            <span className="text-xs text-red-300">(Demo)</span>
          )}
        </span>
      </button>
    </div>
  );
}