"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MT5Navbar from "@/components/mt5/MT5Navbar";
import MT5BottomNav from "@/components/mt5/MT5BottomNav";
import ChartPlaceholder from "@/components/mt5/ChartPlaceholder";
import OrderPanel from "@/components/mt5/OrderPanel";
import PositionsTable from "@/components/mt5/PositionsTable";
import { useMT5Tick } from "@/lib/use-mt5-tick";
import { toast } from "sonner";

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

// ✅ Correct API Base (same pattern as MT5ConnectScreen)
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/$/, "").replace(/\/api$/, "");

export default function MT5DashboardPage() {
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>([]);
  const [symbol, setSymbol] = useState("EURUSD");
  const [loading, setLoading] = useState(true);
  const [mt5Account, setMt5Account] = useState<any>(null);

  useMT5Tick();

  const fetchPositions = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/forex/positions/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions || []);
      }
    } catch (error) {
      console.error("Failed to fetch positions:", error);
    }
  }, []);

  useEffect(() => {
    const checkAndLoadData = async () => {
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
        console.error("Failed to load MT5 data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    checkAndLoadData();
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, [router, fetchPositions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
        Loading MT5 Dashboard...
      </div>
    );
  }

  return (
    <>
      <MT5Navbar mt5Account={mt5Account} />
      <main className="mx-auto max-w-[1600px] px-4 pb-24 pt-4 md:pb-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="h-[420px] md:h-[520px]">
            <ChartPlaceholder symbol={symbol} />
          </div>

          <OrderPanel 
            symbol={symbol} 
            onSymbolChange={setSymbol} 
            onOrderPlaced={fetchPositions}
          />
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
              Open Positions
            </h2>
            <span className="text-xs text-white/40">
              {positions.length} active
            </span>
          </div>

          <PositionsTable 
            positions={positions} 
            compact 
            onPositionClosed={fetchPositions}
          />
        </div>
      </main>
      <MT5BottomNav />
    </>
  );
}