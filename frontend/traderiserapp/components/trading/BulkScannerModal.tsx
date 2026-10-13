"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Sparkles, Zap, Target, ShieldCheck, Rocket } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { startBulkBatch } from "@/lib/robotRunner";
import MarketScannerPanel from "./MarketScannerPanel";
import type { MarketScanResult } from "@/lib/marketScan";

type Market = {
  id: number;
  name: string;
  display_name?: string;
  market_type?: { name: string };
};
type Robot = { id: number; name: string; is_bulk_robot?: boolean; max_bulk_trades?: number };
type UserRobotRaw = { id: number; robot: Robot; is_running?: boolean };
type Category = "overunder" | "matches" | "evenodd" | "risefall";
type ContractKind = "over" | "under" | "matches" | "differs" | "even" | "odd" | "rise" | "fall";
type Props = {
  open: boolean;
  onClose: () => void;
  markets: Market[];
  onBatchStarted?: () => void;
};

function getIsSashi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("user_session");
    if (!raw) return false;
    return (JSON.parse(raw) as { is_sashi?: boolean })?.is_sashi === true;
  } catch {
    return false;
  }
}

const NUM_PRESETS = [3, 5, 7, 10, 15, 20];
const field =
  "w-full h-12 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-indigo-500 outline-none text-foreground px-4 text-sm";
const idleBtn =
  "border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-900 text-muted-foreground hover:text-foreground";
const activeBtn = "border border-indigo-500 bg-indigo-500/20 text-indigo-700 dark:text-indigo-200";

export default function BulkScannerModal({ open, onClose, markets, onBatchStarted }: Props) {
  const isSashi = getIsSashi();
  const [loadingRobots, setLoadingRobots] = useState(false);
  const [bulkRobots, setBulkRobots] = useState<Robot[]>([]);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [category, setCategory] = useState<Category>("overunder");
  const [contract, setContract] = useState<ContractKind>("over");
  const [barrier, setBarrier] = useState<number>(5);
  const [stake, setStake] = useState<number>(1);
  const [numTrades, setNumTrades] = useState<number>(5);
  const [autoPick, setAutoPick] = useState(false);
  const [phase, setPhase] = useState<"idle" | "scanning">("idle");
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase("idle");
    setLoadingRobots(true);
    (async () => {
      try {
        const res = await api.getUserRobots();
        const raw = (res?.data ?? res) as unknown;
        const arr = Array.isArray(raw)
          ? (raw as UserRobotRaw[])
          : Array.isArray((raw as { user_robots?: UserRobotRaw[] })?.user_robots)
            ? (raw as { user_robots: UserRobotRaw[] }).user_robots
            : [];
        const owned: Robot[] = arr
          .map((ur) => ur.robot)
          .filter((r): r is Robot => !!r && r.is_bulk_robot === true)
          .filter((r, i, all) => all.findIndex((x) => x.id === r.id) === i);
        setBulkRobots(owned);
        setSelectedRobot(owned[0] ?? null);
      } catch {
        setBulkRobots([]);
      } finally {
        setLoadingRobots(false);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (category === "overunder") setContract("over");
    else if (category === "matches") setContract("matches");
    else if (category === "risefall") setContract("rise");
    else setContract("even");
  }, [category]);

  useEffect(() => {
    if (!open) setExecuting(false);
  }, [open]);

  const maxTrades = Math.min(50, selectedRobot?.max_bulk_trades ?? 50);
  useEffect(() => {
    if (numTrades > maxTrades) setNumTrades(maxTrades);
  }, [maxTrades, numTrades]);

  const contractLabel = useMemo(() => {
    if (category === "overunder") return `${contract === "over" ? "Over" : "Under"} ${barrier}`;
    if (category === "risefall") return contract === "rise" ? "Rise" : "Fall";
    if (category === "matches") return `${contract === "matches" ? "Matches" : "Differs"} ${barrier}`;
    return contract === "even" ? "Even" : "Odd";
  }, [category, contract, barrier]);

  const handleScanAndTrade = () => {
    if (!selectedRobot) return toast.error("Select a bulk robot first");
    if (!markets.length) return toast.error("No markets available");
    if (stake <= 0 || numTrades <= 0) return toast.error("Invalid stake or trade count");
    setPhase("scanning");
  };

  const handleExecuteWinner = (winner: MarketScanResult) => {
    if (!selectedRobot) return;
    setExecuting(true);
    const kind = winner.kind as ContractKind;
    const useBarrier = ["over", "under", "matches", "differs"].includes(kind) ? winner.barrier : undefined;
    onClose();
    onBatchStarted?.();
    toast.success(
      `${selectedRobot.name} locked onto ${winner.marketName} — firing ${numTrades} contracts (${winner.confidence}% confidence)`,
      { duration: 6000 },
    );
    void startBulkBatch({
      robotId: selectedRobot.id,
      robotName: selectedRobot.name,
      marketId: winner.marketId,
      marketName: winner.marketName,
      contractKind: kind,
      barrier: useBarrier,
      stake,
      numTrades,
    });
    setExecuting(false);
    setPhase("idle");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-lg bg-white/80 dark:bg-zinc-950/80 border border-white/40 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col">
        <div className="relative px-4 sm:px-5 py-3 sm:py-4 border-b border-white/30 dark:border-white/10 bg-white/40 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-foreground font-semibold text-lg leading-tight">Bulk Scanner AI</div>
              <div className="text-xs text-muted-foreground">Scans markets, robot fires the batch</div>
            </div>
            {isSashi && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                <ShieldCheck className="w-3 h-3" /> SASHI
              </span>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingRobots ? (
            <div className="p-10 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              Loading your robots…
            </div>
          ) : bulkRobots.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                <Rocket className="w-7 h-7 text-muted-foreground" />
              </div>
              <div className="text-foreground font-medium">No bulk robots in your account</div>
              <div className="text-sm text-muted-foreground">
                Purchase a Bulk Trading Robot from the Store to unlock the AI Bulk Scanner.
              </div>
            </div>
          ) : phase === "scanning" ? (
            <div className="p-4">
              <MarketScannerPanel
                markets={markets}
                autoStart
                executing={executing}
                executeLabel={`Fire ${numTrades} contracts`}
                restrict={autoPick ? undefined : { kinds: [contract], barrier: category === "evenodd" || category === "risefall" ? undefined : barrier }}
                targetLabel={autoPick ? undefined : contractLabel}
                onExecute={handleExecuteWinner}
              />
              <button
                onClick={() => setPhase("idle")}
                className="mt-4 w-full h-11 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-900 text-sm text-foreground"
              >
                Back to settings
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
              <section>
                <Label icon={<Rocket className="w-3.5 h-3.5" />}>Bulk Robot</Label>
                <select
                  value={selectedRobot?.id ?? ""}
                  onChange={(e) => setSelectedRobot(bulkRobots.find((r) => r.id === Number(e.target.value)) ?? null)}
                  className={field}
                >
                  {bulkRobots.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · Max {r.max_bulk_trades ?? 50} trades
                    </option>
                  ))}
                </select>
              </section>

              <section>
                <Label icon={<Target className="w-3.5 h-3.5" />}>Market Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "overunder", label: "Over / Under" },
                      { id: "matches", label: "Matches / Differs" },
                      { id: "evenodd", label: "Even / Odd" },
                      { id: "risefall", label: "Rise / Fall" },
                    ] as { id: Category; label: string }[]
                  ).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`min-h-11 px-2 py-2.5 rounded-xl text-[11px] sm:text-xs font-medium ${category === c.id ? activeBtn : idleBtn}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </section>

              {category === "overunder" && (
                <PairPicker
                  left={{ label: `Over ${barrier}`, value: "over" }}
                  right={{ label: `Under ${barrier}`, value: "under" }}
                  active={contract}
                  onPick={(v) => setContract(v as ContractKind)}
                />
              )}
              {category === "risefall" && (
                <PairPicker
                  left={{ label: "Rise", value: "rise" }}
                  right={{ label: "Fall", value: "fall" }}
                  active={contract}
                  onPick={(v) => setContract(v as ContractKind)}
                />
              )}
              {category === "matches" && (
                <PairPicker
                  left={{ label: `Matches ${barrier}`, value: "matches" }}
                  right={{ label: `Differs ${barrier}`, value: "differs" }}
                  active={contract}
                  onPick={(v) => setContract(v as ContractKind)}
                />
              )}
              {category === "evenodd" && (
                <PairPicker
                  left={{ label: "Even", value: "even" }}
                  right={{ label: "Odd", value: "odd" }}
                  active={contract}
                  onPick={(v) => setContract(v as ContractKind)}
                />
              )}

              {(category === "overunder" || category === "matches") && (
                <section>
                  <Label>Barrier Digit</Label>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                      <button
                        key={d}
                        onClick={() => setBarrier(d)}
                        className={`h-10 sm:h-9 rounded-lg text-sm font-semibold ${barrier === d ? activeBtn : idleBtn}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <Label>Stake per Trade (USD)</Label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={stake}
                  onChange={(e) => setStake(Math.max(0.5, Number(e.target.value) || 0))}
                  className={field}
                />
              </section>

              <section>
                <Label>Number of Trades (max {maxTrades})</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2">
                  {NUM_PRESETS.filter((n) => n <= maxTrades).map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumTrades(n)}
                      className={`h-10 sm:h-9 rounded-lg text-sm font-medium ${numTrades === n ? activeBtn : idleBtn}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={maxTrades}
                  value={numTrades}
                  onChange={(e) => setNumTrades(Math.min(maxTrades, Math.max(1, Number(e.target.value) || 1)))}
                  className={field}
                />
              </section>

              <div className="rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 px-4 py-3 text-xs text-muted-foreground space-y-1">
                <Row label="Robot" value={selectedRobot?.name ?? "—"} />
                <Row label="Contract" value={contractLabel} />
                <Row label="Stake × Trades" value={`$${stake.toFixed(2)} × ${numTrades}`} />
                <Row label="Total Deployed" value={`$${(stake * numTrades).toFixed(2)}`} strong />
              </div>

              <section>
                <Label icon={<Target className="w-3.5 h-3.5" />}>Scan Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setAutoPick(false)} className={`drop-on-top min-h-11 px-2 py-2.5 rounded-2xl text-[11px] font-medium ${!autoPick ? "drop-selected border border-indigo-400/50 bg-indigo-500/25 text-indigo-800 dark:text-indigo-100" : "border border-white/40 bg-white/30 text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white"}`}>
                    <span className="relative z-[1] text-center leading-tight">My prediction ({contractLabel})</span>
                  </button>
                  <button onClick={() => setAutoPick(true)} className={`drop-on-top min-h-11 px-2 py-2.5 rounded-2xl text-[11px] font-medium ${autoPick ? "drop-selected border border-indigo-400/50 bg-indigo-500/25 text-indigo-800 dark:text-indigo-100" : "border border-white/40 bg-white/30 text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white"}`}>
                    <span className="relative z-[1] text-center leading-tight">Auto · best contract</span>
                  </button>
                </div>
              </section>

              <button
                onClick={handleScanAndTrade}
                className="drop-on-top drop-selected w-full h-14 rounded-2xl border border-white/30 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold text-base"
              >
                <span className="relative z-[1] flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5" />
                  Scan & Fire Batch
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
      {icon}
      {children}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={strong ? "text-foreground font-semibold" : "text-foreground"}>{value}</span>
    </div>
  );
}

function PairPicker({
  left,
  right,
  active,
  onPick,
}: {
  left: { label: string; value: string };
  right: { label: string; value: string };
  active: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onPick(left.value)}
        className={`h-12 rounded-2xl font-semibold text-white ${
          active === left.value
            ? "drop-on-top drop-selected bg-green-500"
            : "drop-on-top bg-green-500/80"
        }`}
      >
        <span className="relative z-[1]">{left.label}</span>
      </button>
      <button
        onClick={() => onPick(right.value)}
        className={`h-12 rounded-2xl font-semibold text-white ${
          active === right.value
            ? "drop-on-top drop-selected bg-red-500"
            : "drop-on-top bg-red-500/80"
        }`}
      >
        <span className="relative z-[1]">{right.label}</span>
      </button>
    </div>
  );
}
