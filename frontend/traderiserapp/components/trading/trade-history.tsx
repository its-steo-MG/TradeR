"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";

interface Trade {
  id: string | number;
  market: string | { name: string } | null;
  direction: string | null;           // Can be null for digit trades
  amount: number;
  is_win: boolean;
  profit: number;
  created_at: string;
  entrySpot?: number
  exitSpot?: number
  trade_type_id?: number;
  buyPrice?: number;
  last_digit_outcome?: number;        // Added for digit trades
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

  // Fetch trade types
  useEffect(() => {
    const fetchTradeTypes = async () => {
      try {
        const response = await api.getTradeTypes();
        const { data, error } = response as { data?: { id: number; name: string }[]; error?: unknown };
        if (!error && Array.isArray(data)) {
          setTradeTypes(data);
        }
      } catch (err) {
        console.error("Failed to fetch trade types:", err);
      }
    };
    fetchTradeTypes();
  }, []);

  // Fetch all trades
  useEffect(() => {
    const fetchAllTrades = async () => {
      setIsLoading(true);
      try {
        const response = (await api.getTradeHistory()) as { 
          data?: { trades: Trade[] }; 
          error?: unknown 
        };

        const { data, error } = response;

        if (error) {
          toast({ 
            title: "Error", 
            description: "Failed to load trade history", 
            variant: "destructive" 
          });
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

        const sortedTrades = enhancedData.reverse();
        setAllTrades(sortedTrades);
        setCurrentPage(1);
      } catch (err) {
        toast({ 
          title: "Error", 
          description: "Failed to fetch trade history", 
          variant: "destructive" 
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTrades();
  }, [toast]);

  // Safe direction label handler (FIXED)
  const getDirectionLabel = (direction: string | null, tradeTypeId?: number) => {
    if (!direction) {
      return "DIGIT"; // For digit trades where direction is null
    }

    const tradeType = tradeTypes.find((t) => t.id === tradeTypeId);
    const tradeTypeName = tradeType?.name?.toLowerCase() || "";

    switch (tradeTypeName) {
      case "rise/fall":
        return direction.toLowerCase() === "rise" ? "RISE" : "FALL";
      case "buy/sell":
      default:
        return direction.toUpperCase();
    }
  };

  const totalPages = Math.ceil(allTrades.length / tradesPerPage);
  const startIndex = (currentPage - 1) * tradesPerPage;
  const endIndex = startIndex + tradesPerPage;
  const displayTrades = allTrades.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="w-full">
      <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-4 sm:mb-6">Trade History</h2>

      {isLoading ? (
        <p className="text-white/60 text-sm sm:text-base">Loading trades...</p>
      ) : allTrades.length === 0 ? (
        <p className="text-white/60 text-sm sm:text-base">No trades yet</p>
      ) : (
        <>
          {/* Mobile: Card Layout */}
          <div className="lg:hidden space-y-3">
            <AnimatePresence>
              {displayTrades.map((trade, idx) => (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all backdrop-blur-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-semibold text-white truncate flex-1 mr-2">
                      {typeof trade.market === "string" 
                        ? trade.market 
                        : trade.market?.name || "Unknown Market"}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                        trade.is_win 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {getDirectionLabel(trade.direction, trade.trade_type_id)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm text-white/60">
                    <div>
                      <span className="block">Amount</span>
                      <span className="font-semibold text-white">
                        ${Number(trade.buyPrice || trade.amount).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="block">Spots</span>
                      <span className="font-semibold text-white/80">
                        {(trade.entrySpot ?? 0).toFixed(2)} / {(trade.exitSpot ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      {trade.is_win ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`font-bold text-sm ${trade.is_win ? "text-green-400" : "text-red-400"}`}>
                        {trade.is_win ? "WIN" : "LOSS"}
                      </span>
                    </div>
                    <motion.span
                      className={`font-bold text-sm sm:text-base ${
                        Number(trade.profit) >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      ${Number(trade.profit).toFixed(2)}
                    </motion.span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Desktop: Table Layout */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/60 border-b border-white/10">
                    <th className="py-3 px-4 w-[25%]">Market</th>
                    <th className="py-3 px-4 w-[15%]">Direction</th>
                    <th className="py-3 px-4 w-[20%]">Spots</th>
                    <th className="py-3 px-4 w-[12%]">Amount</th>
                    <th className="py-3 px-4 w-[13%]">Result</th>
                    <th className="py-3 px-4 w-[15%]">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {displayTrades.map((trade, idx) => (
                      <motion.tr
                        key={trade.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-white/5 hover:bg-white/5 transition-all"
                      >
                        <td className="py-3 px-4 text-white truncate">
                          {typeof trade.market === "string" 
                            ? trade.market 
                            : trade.market?.name || "Unknown Market"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-lg font-bold text-xs ${
                              trade.is_win 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {getDirectionLabel(trade.direction, trade.trade_type_id)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white/60">
                          {(trade.entrySpot ?? 0).toFixed(2)} / {(trade.exitSpot ?? 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-white">
                          ${formatCurrency(trade.buyPrice || trade.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {trade.is_win ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span className={`font-bold ${trade.is_win ? "text-green-400" : "text-red-400"}`}>
                              {trade.is_win ? "WIN" : "LOSS"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <motion.span
                            className={`font-bold ${Number(trade.profit) >= 0 ? "text-green-400" : "text-red-400"}`}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                          >
                            ${Number(trade.profit).toFixed(2)}
                          </motion.span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 border border-white/10">
            <div className="text-sm text-white/60">
              Page <span className="font-bold text-white">{currentPage}</span> of{" "}
              <span className="font-bold text-white">{totalPages}</span> • Total trades:{" "}
              <span className="font-bold text-white">{allTrades.length}</span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
              >
                Previous
              </Button>
              <Button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center gap-2 transition-all"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}