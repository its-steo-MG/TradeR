"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";

interface Trade {
  id: string | number;
  market: string | { name: string } | null;
  direction: string | null;
  amount: number;
  is_win: boolean;
  profit: number;
  created_at: string;
  entrySpot?: number;
  exitSpot?: number;
  trade_type_id?: number;
  buyPrice?: number;
  last_digit_outcome?: number;
  is_digit_trade?: boolean;
  digit_contract_type?: string;
}

interface TradeHistoryProps {
  sessionTrades?: Trade[];
}

export function TradeHistory({ sessionTrades }: TradeHistoryProps) {
  const { toast } = useToast();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [tradeTypes, setTradeTypes] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const tradesPerPage = 10;

  useEffect(() => {
    const fetchTradeTypes = async () => {
      try {
        const response = await api.getTradeTypes();
        const { data, error } = response as {
          data?: { id: number; name: string }[];
          error?: unknown;
        };
        if (!error && Array.isArray(data)) setTradeTypes(data);
      } catch (err) {
        console.error("Failed to fetch trade types:", err);
      }
    };
    fetchTradeTypes();
  }, []);

  useEffect(() => {
    const fetchAllTrades = async () => {
      setIsLoading(true);
      try {
        const response = (await api.getTradeHistory()) as {
          data?: { trades: Trade[] };
          error?: unknown;
        };
        const { data, error } = response;

        if (error) {
          toast({ title: "Error", description: "Failed to load trade history", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const tradeData = Array.isArray(data?.trades) ? data.trades : [];
        const enhancedData = tradeData.map((t: Trade) => ({
          ...t,
          entrySpot: t.entrySpot ? Number(t.entrySpot) : undefined,
          exitSpot: t.exitSpot ? Number(t.exitSpot) : undefined,
          buyPrice: Number(t.amount),
        }));

        setAllTrades(enhancedData.reverse());
        setCurrentPage(1);
      } catch {
        toast({ title: "Error", description: "Failed to fetch trade history", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTrades();
  }, [toast]);

  const getDirectionLabel = (direction: string | null, tradeTypeId?: number) => {
    if (!direction) return "DIGIT";
    const tradeType = tradeTypes.find((t) => t.id === tradeTypeId);
    const tradeTypeName = tradeType?.name?.toLowerCase() || "";
    if (tradeTypeName === "rise/fall") return direction.toLowerCase() === "rise" ? "RISE" : "FALL";
    return direction.toUpperCase();
  };

  const totalPages = Math.max(1, Math.ceil(allTrades.length / tradesPerPage));
  const startIndex = (currentPage - 1) * tradesPerPage;
  const displayTrades = allTrades.slice(startIndex, startIndex + tradesPerPage);

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-sky-50 p-3 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 sm:p-5 md:p-6">
      <div className="mb-3 flex items-baseline justify-between gap-2 sm:mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">Trade History</h3>
        <span className="shrink-0 text-xs text-slate-500 dark:text-zinc-400">{allTrades.length}</span>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400 sm:py-10">Loading trades...</p>
      ) : allTrades.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400 sm:py-10">No trades yet</p>
      ) : (
        <>
          <div className="space-y-2">
            {displayTrades.map((trade) => {
              const win = trade.is_win;
              const market = typeof trade.market === "string" ? trade.market : trade.market?.name || "Unknown Market";
              return (
                <div
                  key={trade.id}
                  className="drop-on-top relative !flex w-full items-center gap-2 overflow-hidden rounded-xl border border-white/70 bg-white/40 px-2.5 py-2.5 backdrop-blur-md dark:border-white/10 dark:bg-white/5 sm:gap-3 sm:rounded-2xl sm:px-3 sm:py-3"
                >
                  <span
                    className={`relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-11 sm:w-11 sm:rounded-2xl ${
                      win
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "border-red-200 bg-red-50 text-red-500 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-400"
                    }`}
                  >
                    {win ? <CheckCircle size={15} /> : <XCircle size={15} />}
                  </span>

                  <div className="relative z-[1] min-w-0 flex-1">
                    <p className="truncate text-sm font-medium capitalize text-slate-900 dark:text-white">{market}</p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-zinc-400 sm:text-xs">
                      {getDirectionLabel(trade.direction, trade.trade_type_id)} • ${Number(trade.buyPrice || trade.amount).toFixed(2)}
                    </p>
                  </div>

                  <div className="relative z-[1] shrink-0 text-right">
                    <p className={`whitespace-nowrap text-xs font-semibold sm:text-sm ${win ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                      {win ? "+" : "-"}${Math.abs(Number(trade.profit)).toFixed(2)}
                    </p>
                    <p className="whitespace-nowrap text-[10px] text-slate-500 dark:text-zinc-400 sm:text-[11px]">
                      {new Date(trade.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Page <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span> of{" "}
              <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-9 rounded-xl bg-white/70 px-3 text-xs font-semibold text-slate-900 disabled:opacity-50 dark:bg-white/10 dark:text-white"
              >
                Previous
              </Button>
              <Button
                onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex h-9 items-center gap-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
