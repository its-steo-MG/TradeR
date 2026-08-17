"use client";

/* -------------------------------------------------------------------------- */
/*  BulkScannerModal.tsx                                                      */
/* -------------------------------------------------------------------------- */

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Loader2,
  Sparkles,
  Zap,
  Target,
  ShieldCheck,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { startBulkBatch } from "@/lib/robotRunner";
import MarketScannerPanel from "./MarketScannerPanel";
import type { MarketScanResult } from "@/lib/marketScan";

/* ---------- Types ---------- */
type Market = {
  id: number;
  name: string;
  display_name?: string;
  market_type?: { name: string };
};

type Robot = {
  id: number;
  name: string;
  is_bulk_robot?: boolean;
  max_bulk_trades?: number;
};

type UserRobotRaw = {
  id: number;
  robot: Robot;
  is_running?: boolean;
};

type Category = "overunder" | "matches" | "evenodd";
type ContractKind = "over" | "under" | "matches" | "differs" | "even" | "odd";

type Props = {
  open: boolean;
  onClose: () => void;
  markets: Market[];
  onBatchStarted?: () => void;
};

/* ---------- Helpers ---------- */
function getIsSashi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("user_session");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { is_sashi?: boolean };
    return parsed?.is_sashi === true;
  } catch {
    return false;
  }
}

const NUM_PRESETS = [3, 5, 7, 10, 15, 20];

/* ========================================================================== */
export default function BulkScannerModal({
  open,
  onClose,
  markets,
  onBatchStarted,
}: Props) {
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
      } catch (e) {
        console.error(e);
        setBulkRobots([]);
      } finally {
        setLoadingRobots(false);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (category === "overunder") setContract("over");
    else if (category === "matches") setContract("matches");
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
    if (category === "matches") return `${contract === "matches" ? "Matches" : "Differs"} ${barrier}`;
    return contract === "even" ? "Even" : "Odd";
  }, [category, contract, barrier]);

  /** Opens the real market-wide scanner. */
  const handleScanAndTrade = () => {
    if (!selectedRobot) {
      toast.error("Select a bulk robot first");
      return;
    }
    if (!markets.length) {
      toast.error("No markets available");
      return;
    }
    if (stake <= 0 || numTrades <= 0) {
      toast.error("Invalid stake or trade count");
      return;
    }
    setPhase("scanning");
  };

  /** Fired by MarketScannerPanel once the user confirms the winning signal. */
  const handleExecuteWinner = (winner: MarketScanResult) => {
    if (!selectedRobot) return;
    setExecuting(true);

    const kind = winner.kind as ContractKind;
    const useBarrier = ["over", "under", "matches", "differs"].includes(kind)
      ? winner.barrier
      : undefined;

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
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-slate-950 border border-slate-800 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-lg leading-tight">
                Bulk Scanner AI
              </div>
              <div className="text-xs text-slate-400">
                Scans markets, robot fires the batch
              </div>
            </div>
            {isSashi && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                <ShieldCheck className="w-3 h-3" /> SASHI
              </span>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loadingRobots ? (
            <div className="p-10 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              Loading your robots…
            </div>
          ) : bulkRobots.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center">
                <Rocket className="w-7 h-7 text-slate-500" />
              </div>
              <div className="text-white font-medium">
                No bulk robots in your account
              </div>
              <div className="text-sm text-slate-400">
                Purchase a Bulk Trading Robot from the Store to unlock the AI Bulk
                Scanner.
              </div>
            </div>
          ) : phase === "scanning" ? (
            <div className="p-4">
              <MarketScannerPanel
                markets={markets}
                autoStart
                executing={executing}
                executeLabel={`Fire ${numTrades} contracts`}
                restrict={
                  autoPick
                    ? undefined
                    : {
                        kinds: [contract],
                        barrier:
                          category === "evenodd" ? undefined : barrier,
                      }
                }
                targetLabel={autoPick ? undefined : contractLabel}
                onExecute={handleExecuteWinner}
              />
              <button
                onClick={() => setPhase("idle")}
                className="mt-4 w-full h-11 rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-300 hover:text-white"
              >
                Back to settings
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Robot picker */}
              <section>
                <Label icon={<Rocket className="w-3.5 h-3.5" />}>Bulk Robot</Label>
                <select
                  value={selectedRobot?.id ?? ""}
                  onChange={(e) => {
                    const robot = bulkRobots.find((r) => r.id === Number(e.target.value));
                    setSelectedRobot(robot ?? null);
                  }}
                  className="w-full h-12 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none text-white px-4 text-sm appearance-none"
                >
                  {bulkRobots.length === 0 && (
                    <option value="">No bulk robots found</option>
                  )}
                  {bulkRobots.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · Max {r.max_bulk_trades ?? 50} trades
                    </option>
                  ))}
                </select>
              </section>

              {/* Category */}
              <section>
                <Label icon={<Target className="w-3.5 h-3.5" />}>Market Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "overunder", label: "Over / Under" },
                      { id: "matches", label: "Matches / Differs" },
                      { id: "evenodd", label: "Even / Odd" },
                    ] as { id: Category; label: string }[]
                  ).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`
                        relative px-2 py-2.5 rounded-xl text-[11px] font-medium border transition-all
                        ${
                          category === c.id
                            ? "drop-on-top border-indigo-500 bg-indigo-500/20 text-indigo-200"
                            : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                        }
                      `}
                    >
                      <span className="relative z-[1]">{c.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Direction */}
              {category === "overunder" && (
                <PairPicker
                  left={{ label: `Over ${barrier}`, value: "over" }}
                  right={{ label: `Under ${barrier}`, value: "under" }}
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
                  <div className="grid grid-cols-10 gap-1.5">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                      <button
                        key={d}
                        onClick={() => setBarrier(d)}
                        className={`
                          relative h-9 rounded-lg text-sm font-semibold border transition-all
                          ${
                            barrier === d
                              ? "drop-on-top border-indigo-500 bg-indigo-500/20 text-indigo-200"
                              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                          }
                        `}
                      >
                        <span className="relative z-[1]">{d}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Stake */}
              <section>
                <Label>Stake per Trade (USD)</Label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={stake}
                  onChange={(e) => setStake(Math.max(0.5, Number(e.target.value) || 0))}
                  className="w-full h-11 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none text-white px-4 text-base"
                />
              </section>

              {/* Number of trades */}
              <section>
                <Label>Number of Trades (max {maxTrades})</Label>
                <div className="grid grid-cols-6 gap-1.5 mb-2">
                  {NUM_PRESETS.filter((n) => n <= maxTrades).map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumTrades(n)}
                      className={`
                        relative h-9 rounded-lg text-sm font-medium border transition-all
                        ${
                          numTrades === n
                            ? "drop-on-top border-indigo-500 bg-indigo-500/20 text-indigo-200"
                            : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                        }
                      `}
                    >
                      <span className="relative z-[1]">{n}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={maxTrades}
                  value={numTrades}
                  onChange={(e) =>
                    setNumTrades(
                      Math.min(maxTrades, Math.max(1, Number(e.target.value) || 1)),
                    )
                  }
                  className="w-full h-10 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none text-white px-4 text-sm"
                />
              </section>

              {/* Summary */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 text-xs text-slate-400 space-y-1">
                <Row label="Robot" value={selectedRobot?.name ?? "—"} />
                <Row label="Contract" value={contractLabel} />
                <Row label="Stake × Trades" value={`$${stake.toFixed(2)} × ${numTrades}`} />
                <Row
                  label="Total Deployed"
                  value={`$${(stake * numTrades).toFixed(2)}`}
                  strong
                />
                <div className="pt-1 text-[10px] text-slate-500 italic">
                  Results will stream into the Robot Run Panel.
                </div>
              </div>

              {/* Scan mode */}
              <section>
                <Label icon={<Target className="w-3.5 h-3.5" />}>Scan Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAutoPick(false)}
                    className={`relative px-2 py-2.5 rounded-xl text-[11px] font-medium border transition-all ${
                      !autoPick
                        ? "drop-on-top border-indigo-500 bg-indigo-500/20 text-indigo-200"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="relative z-[1]">My prediction ({contractLabel})</span>
                  </button>
                  <button
                    onClick={() => setAutoPick(true)}
                    className={`relative px-2 py-2.5 rounded-xl text-[11px] font-medium border transition-all ${
                      autoPick
                        ? "drop-on-top border-indigo-500 bg-indigo-500/20 text-indigo-200"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="relative z-[1]">Auto · best contract</span>
                  </button>
                </div>
                <div className="mt-1.5 text-[10px] text-slate-500">
                  {autoPick
                    ? "AI sweeps every market and every contract type, then fires the strongest signal."
                    : "AI sweeps every market looking for the one that best favours your prediction."}
                </div>
              </section>

              {/* CTA with liquid glass */}
              <button
                onClick={handleScanAndTrade}
                className="
                  drop-on-top
                  relative w-full h-14 rounded-2xl
                  bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
                  text-white font-semibold text-base
                  flex items-center justify-center gap-2
                  shadow-lg shadow-indigo-900/40 hover:brightness-110
                  transition-all active:scale-[0.98]
                "
              >
                <span className="relative z-[1] flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Scan &amp; Fire Batch
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Sub-components                                                            */
/* ========================================================================== */
function Label({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
      {icon}
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={strong ? "text-white font-semibold" : "text-slate-200"}>
        {value}
      </span>
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
        className={`
          relative h-11 rounded-xl font-semibold border transition-all
          ${
            active === left.value
              ? "drop-on-top border-emerald-500 bg-emerald-500/20 text-emerald-200"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
          }
        `}
      >
        <span className="relative z-[1]">{left.label}</span>
      </button>
      <button
        onClick={() => onPick(right.value)}
        className={`
          relative h-11 rounded-xl font-semibold border transition-all
          ${
            active === right.value
              ? "drop-on-top border-rose-500 bg-rose-500/20 text-rose-200"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
          }
        `}
      >
        <span className="relative z-[1]">{right.label}</span>
      </button>
    </div>
  );
}
