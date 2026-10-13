import { useMemo, useState, useEffect } from "react";
import {
  ArrowDownToLine,
  Trophy,
  Square,
  RotateCcw,
  Minimize2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRobotRunner, reset, stop } from "@/lib/robotRunner";
import { contractLabel } from "@/lib/contracts";
import { ContractBadge } from "./ContractBadge";
import { toast } from "sonner";
import type { Transaction } from "@/lib/types";

function fmt(n: number, d = 2) {
  return n.toFixed(d);
}

function downloadCsv(rows: Transaction[]) {
  const header = [
    "time",
    "market",
    "contract",
    "entry",
    "exit",
    "buy_price",
    "payout",
    "pnl",
    "result",
    "level",
  ];
  const body = rows.map((r) =>
    [
      new Date(r.timestamp).toISOString(),
      r.market,
      contractLabel(r.contractKind, r.barrier),
      r.entrySpot,
      r.exitSpot,
      r.buyPrice,
      r.payout,
      r.pnl,
      r.isWin ? "WIN" : "LOSS",
      r.martingaleLevel,
    ].join(",")
  );
  const csv = [header.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RunPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    transactions,
    sessionPnl,
    runs,
    isRunning,
    finishedReason,
    config,
    finishedRobotName,
    finishedProfit,
  } = useRobotRunner();

  const [tab, setTab] = useState<"summary" | "transactions" | "journal">("transactions");
  const [, setDetail] = useState<Transaction | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (finishedReason) setShowBanner(true);
  }, [finishedReason]);

  const totals = useMemo(() => {
    const settled = transactions.filter((t) => !t.isOpen);
    const totalStake = settled.reduce((s, t) => s + t.buyPrice, 0);
    const totalPayout = settled.reduce((s, t) => s + t.payout, 0);
    const won = settled.filter((t) => t.isWin).length;
    const lost = settled.length - won;
    return { totalStake, totalPayout, won, lost, pnl: sessionPnl, runs };
  }, [transactions, sessionPnl, runs]);

  const handleStop = () => {
    stop();
    toast.info("Robot stopped.", { description: "You can still view your trades below." });
  };

  const handleReset = () => {
    if (confirm("Reset all trades and start fresh?")) {
      reset();
      toast.success("Robot has been reset successfully.");
      setShowBanner(false);
    }
  };

  const handleMinimize = () => {
    onClose();
    toast.info("Robot is still running in the background.", {
      description: "Click the robot icon in the top bar to reopen the panel.",
    });
  };

  if (!open) return null;

  const marketName = config?.market || "S-Digit Robot";
  const isBulkProfit = finishedReason === "batch" && (finishedProfit ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-2xl rounded-t-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:rounded-3xl overflow-hidden flex flex-col dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <button
            onClick={handleMinimize}
            className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm dark:text-zinc-400 dark:hover:text-white"
          >
            <Minimize2 className="h-5 w-5" />
            <span className="text-sm">Minimize</span>
          </button>

          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleStop} disabled={!isRunning} className="flex items-center gap-1">
              <Square className="h-4 w-4" /> Stop
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="flex items-center gap-1 bg-white dark:bg-zinc-900">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </div>

        {showBanner && finishedReason && (
          <div
            className={`mx-5 mt-4 px-5 py-4 rounded-2xl flex items-start gap-4 border ${
              finishedReason === "target" || isBulkProfit
                ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300"
                : finishedReason === "insufficient"
                ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300"
                : "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950 dark:border-rose-700 dark:text-rose-300"
            }`}
          >
            {finishedReason === "target" || isBulkProfit ? (
              <Trophy className="h-6 w-6 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-lg">
                {finishedReason === "batch"
                  ? isBulkProfit
                    ? `${finishedRobotName || marketName} completed successfully!`
                    : `${finishedRobotName || marketName} batch finished`
                  : finishedReason === "target"
                  ? `${marketName} reached Target Profit!`
                  : finishedReason === "insufficient"
                  ? "Insufficient Balance"
                  : "Maximum Stop Loss Reached"}
              </p>
              <p className="text-sm mt-1 opacity-90">
                {finishedReason === "batch"
                  ? isBulkProfit
                    ? `Profit secured: +$${Math.abs(finishedProfit ?? 0).toFixed(2)}`
                    : `Result: -$${Math.abs(finishedProfit ?? 0).toFixed(2)}`
                  : finishedReason === "target"
                  ? `Final Profit: +$${totals.pnl.toFixed(2)}`
                  : finishedReason === "insufficient"
                  ? "Please recharge your account to continue auto-trading."
                  : `Loss: -$${Math.abs(totals.pnl).toFixed(2)}`}
              </p>
            </div>
          </div>
        )}

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "summary" | "transactions" | "journal")}
          className="px-5 flex-1 flex flex-col"
        >
          <TabsList className="w-full grid grid-cols-3 bg-transparent h-auto p-0 border-b border-slate-200 dark:border-zinc-800 rounded-none mt-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="pt-4 pb-6 flex-1">
            <div className="flex gap-3 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCsv(transactions.filter((t) => !t.isOpen))}
                disabled={!transactions.filter((t) => !t.isOpen).length}
                className="bg-white dark:bg-zinc-900"
              >
                Download CSV
              </Button>
            </div>

            <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 px-4 pb-3 text-[11px] uppercase tracking-wide font-medium text-slate-500 dark:text-zinc-500">
              <span className="pl-1">Type</span>
              <span className="pl-1">Entry / Exit</span>
              <span className="text-right pr-1">Stake & P/L</span>
            </div>

            <div className="max-h-[42vh] overflow-y-auto divide-y divide-slate-200 dark:divide-zinc-800">
              {transactions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-zinc-500">No trades yet. Start the robot.</div>
              ) : (
                transactions.map((t) => (
                  <TransactionRow key={t.id} transaction={t} onClick={() => setDetail(t)} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="summary" className="pt-6 pb-8 flex-1">
            <SummaryView totals={totals} />
          </TabsContent>

          <TabsContent value="journal" className="pt-4 pb-6 flex-1">
            <div className="max-h-[42vh] overflow-y-auto space-y-3 pr-2">
              {transactions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-zinc-500">Journal is empty.</div>
              ) : (
                transactions.map((t) => (
                  <div key={t.id} className="flex gap-3 bg-slate-100 rounded-2xl p-4 dark:bg-zinc-900">
                    <ArrowDownToLine
                      className={cn(
                        "mt-1 h-5 w-5",
                        t.isOpen ? "text-amber-600 dark:text-amber-400" : t.isWin ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}
                    />
                    <div className="flex-1">
                      <div className="text-xs text-slate-500 dark:text-zinc-500">
                        {new Date(t.timestamp).toLocaleTimeString()} • Run #{t.runIndex}
                      </div>
                      <div className="font-medium mt-1 text-slate-900 dark:text-white">
                        {contractLabel(t.contractKind, t.barrier)} • ${fmt(t.buyPrice)}
                      </div>
                      <div className={cn("text-sm", t.isOpen ? "text-amber-600 dark:text-amber-400" : t.isWin ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                        {t.isOpen ? "Executing…" : `${t.isWin ? "WON" : "LOST"} $${fmt(Math.abs(t.pnl))}`}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t border-slate-200 px-5 py-4 grid grid-cols-3 gap-4 text-xs bg-white mt-auto dark:border-zinc-800 dark:bg-zinc-950">
          <Stat label="Total Stake" value={`$${fmt(totals.totalStake)}`} />
          <Stat label="Total Payout" value={`$${fmt(totals.totalPayout)}`} />
          <Stat label="Runs" value={totals.runs.toString()} />
          <Stat label="Won" value={totals.won.toString()} valueClass="text-emerald-600 dark:text-emerald-400" />
          <Stat label="Lost" value={totals.lost.toString()} valueClass="text-rose-600 dark:text-rose-400" />
          <Stat
            label="Net P/L"
            value={`${totals.pnl >= 0 ? "+" : ""}$${fmt(totals.pnl)}`}
            valueClass={totals.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
          />
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ transaction: t, onClick }: { transaction: Transaction; onClick: () => void }) {
  const isOpen = t.isOpen === true;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full grid items-center py-3.5 px-4 text-left transition-all hover:bg-slate-100 dark:hover:bg-zinc-900",
        "grid-cols-[auto_1fr_auto] gap-x-2",
        isOpen ? "bg-amber-50 border-l-2 border-amber-500 dark:bg-amber-950/40 dark:border-amber-400" : "border-l-2 border-transparent",
        !isOpen && (t.isWin ? "animate-flash-win" : "animate-flash-loss"),
        "animate-trade-enter"
      )}
    >
      <div className="justify-self-start pl-1 flex-shrink-0">
        <ContractBadge kind={t.contractKind} barrier={t.barrier} pulse={isOpen} size="sm" />
      </div>
      <div className="text-sm leading-tight pl-1 pr-1 min-w-0">
        <div className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200">
          <span className="text-emerald-600 dark:text-emerald-400 text-xs flex-shrink-0">↑</span>
          <span className="font-mono whitespace-nowrap">{fmt(t.entrySpot)}</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-zinc-500 ml-2">entry</span>
        </div>
        {isOpen ? (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs mt-1">
            <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
            <span className="truncate">Waiting for exit tick…</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 text-sm mt-1">
            <span className="text-rose-600 dark:text-rose-400 text-xs flex-shrink-0">↓</span>
            <span className="font-mono whitespace-nowrap">{fmt(t.exitSpot)}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-zinc-500 ml-2">exit</span>
            {typeof t.exitDigit === "number" && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-md bg-slate-200 text-[11px] font-mono text-slate-700 flex-shrink-0 dark:bg-zinc-800 dark:text-zinc-300">
                {t.exitDigit}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="text-right tabular-nums justify-self-end pr-1 flex-shrink-0">
        <div className="font-medium text-slate-700 dark:text-zinc-300 text-sm">${fmt(t.buyPrice)}</div>
        {isOpen ? (
          <div className="text-amber-600 dark:text-amber-400 text-xs font-semibold mt-1 flex items-center justify-end gap-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            LIVE
          </div>
        ) : (
          <div className={cn("text-sm font-semibold mt-1 animate-trade-settle", t.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            {t.pnl >= 0 ? "+" : ""}${fmt(t.pnl)}
          </div>
        )}
      </div>
    </button>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <div className="text-slate-500 dark:text-zinc-500 text-xs">{label}</div>
      <div className={cn("font-medium text-base text-slate-900 dark:text-white", valueClass)}>{value}</div>
    </div>
  );
}

function SummaryView({ totals }: { totals: { totalStake: number; totalPayout: number; won: number; lost: number; pnl: number; runs: number } }) {
  const winRate = totals.runs ? Math.round((totals.won / totals.runs) * 100) : 0;
  return (
    <div className="space-y-4 text-sm">
      <Row k="Total Runs" v={totals.runs.toString()} />
      <Row k="Win Rate" v={`${winRate}%`} />
      <Row k="Total Stake" v={`$${fmt(totals.totalStake)}`} />
      <Row k="Total Payout" v={`$${fmt(totals.totalPayout)}`} />
      <Row k="Won" v={totals.won.toString()} valueClass="text-emerald-600 dark:text-emerald-400" />
      <Row k="Lost" v={totals.lost.toString()} valueClass="text-rose-600 dark:text-rose-400" />
      <Row k="Net P/L" v={`${totals.pnl >= 0 ? "+" : ""}$${fmt(totals.pnl)}`} valueClass={totals.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
    </div>
  );
}

function Row({ k, v, valueClass }: { k: string; v: string; valueClass?: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-slate-200 last:border-none dark:border-zinc-800">
      <span className="text-slate-500 dark:text-zinc-500">{k}</span>
      <span className={cn("font-medium text-slate-900 dark:text-white", valueClass)}>{v}</span>
    </div>
  );
}
