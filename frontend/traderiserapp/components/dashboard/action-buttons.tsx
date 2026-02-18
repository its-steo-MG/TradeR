// components/dashboard/action-buttons.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export function ActionButtons() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <button
        onClick={() => router.push("/wallet")}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition flex items-center justify-center gap-2"
      >
        <ArrowDownLeft size={20} />
        Deposit
      </button>
      <button
        onClick={() => router.push("/wallet")}
        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl transition flex items-center justify-center gap-2"
      >
        <ArrowUpRight size={20} />
        Withdraw
      </button>
    </div>
  );
}