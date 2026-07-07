"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import MT5Navbar from "@/components/mt5/MT5Navbar";
import MT5BottomNav from "@/components/mt5/MT5BottomNav";
import PositionsTable from "@/components/mt5/PositionsTable";

interface Position {
  id: number;
  symbol: string;
  side: "buy" | "sell";
  volume: number;
  openPrice: number;
  currentPrice: number;
  floating_p_l: number;
  sl?: number;
  tp?: number;
}

// ✅ Proper API Base
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/$/, "").replace(/\/api$/, "");

export default function MT5PositionsPage() {
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>([]);
  const [mt5Account, setMt5Account] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPositions = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/forex/positions/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions || []);
      }
    } catch (error) {
      console.error("Failed to fetch positions");
    }
  }, []);

  useEffect(() => {
    const checkAndLoad = async () => {
      const token = localStorage.getItem("access_token");
      const savedAccount = localStorage.getItem("mt5_account");

      if (!token || !savedAccount) {
        router.replace("/mt5");
        return;
      }

      try {
        const account = JSON.parse(savedAccount);
        setMt5Account(account);
        await fetchPositions();
      } catch (error) {
        toast.error("Failed to load MT5 data");
      } finally {
        setLoading(false);
      }
    };

    checkAndLoad();
    const interval = setInterval(fetchPositions, 4000);
    return () => clearInterval(interval);
  }, [router, fetchPositions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
        Loading Positions...
      </div>
    );
  }

  const hasPositions = positions.length > 0;
  const totalPnL = positions.reduce((sum, p) => sum + p.floating_p_l, 0);
  const totalVolume = positions.reduce((sum, p) => sum + p.volume, 0);

  const margin = hasPositions
    ? positions.reduce((sum, p) => sum + (p.volume * 100000 * p.currentPrice) / 500, 0)
    : 0;

  const equity = (mt5Account?.balance ?? 0) + totalPnL;
  const freeMargin = equity - margin;
  const marginLevel = margin > 0 ? (equity / margin) * 100 : 0;

  return (
    <>
      <MT5Navbar mt5Account={mt5Account} />
      <main className="mx-auto max-w-[1600px] px-4 pb-24 pt-4 md:pb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Positions</h1>
            <p className="text-sm text-white/50">
              {positions.length} open · {totalVolume.toFixed(2)} lots
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <SummaryCard label="Balance" value={`$${(mt5Account?.balance ?? 0).toFixed(2)}`} />
          <SummaryCard label="Equity" value={`$${equity.toFixed(2)}`} positive={equity >= (mt5Account?.balance ?? 0)} />
          <SummaryCard label="Free Margin" value={`$${freeMargin.toFixed(2)}`} />

          {hasPositions && (
            <>
              <SummaryCard label="Margin" value={`$${margin.toFixed(2)}`} />
              <SummaryCard label="Margin Level" value={marginLevel > 0 ? `${marginLevel.toFixed(1)}%` : "—"} />
              <SummaryCard 
                label="Total P&L" 
                value={`${totalPnL >= 0 ? "+" : ""}$${totalPnL.toFixed(2)}`} 
                positive={totalPnL >= 0} 
              />
            </>
          )}
        </div>

        <PositionsTable 
          positions={positions} 
          compact 
          onPositionClosed={fetchPositions} 
        />
      </main>
      <MT5BottomNav />
    </>
  );
}

function SummaryCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f172a] p-4">
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${positive === undefined ? "text-white" : positive ? "text-emerald-400" : "text-rose-400"}`}>
        {value}
      </div>
    </div>
  );
}