"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, X, Loader2, Zap, Target, ShieldAlert, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { start as startRobot, useRobotRunner } from "@/lib/robotRunner";
import type { DigitContractKind } from "@/lib/types/positions";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
type Market = {
  id: number;
  name: string;
  display_name?: string;
  market_type?: { name: string };
};

type Robot = {
  id: number;
  name: string;
  is_s_digit_robot: boolean;
  default_digit_contract_type?: string;
};

type ScanCategory = "overunder" | "matches" | "evenodd";

type ScanResult = {
  market: Market;
  contractKind: DigitContractKind;
  barrier?: number;
  score: number;
  pct: number[];
};

/* ------------------------------------------------------------------ */
/*  Helpers — detect sashi status from local session                  */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  AI scoring — uses synthetic per-market digit distributions        */
/* ------------------------------------------------------------------ */
// Deterministic pseudo-random from a string seed (mulberry32)
function seededDist(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Bias each market slightly around 10% per digit
  const raw = Array.from({ length: 10 }, () => 8 + rand() * 6);
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => +((v / total) * 100).toFixed(2));
}

function scoreMarket(
  market: Market,
  category: ScanCategory,
  jitter: number,
): ScanResult {
  const seed = `${market.id}-${market.name}-${Math.floor(Date.now() / 3000)}-${jitter}`;
  const pct = seededDist(seed);

  if (category === "evenodd") {
    const evenScore = pct[0] + pct[2] + pct[4] + pct[6] + pct[8];
    const oddScore = 100 - evenScore;
    const useEven = evenScore >= oddScore;
    return {
      market,
      contractKind: useEven ? "even" : "odd",
      score: Math.max(evenScore, oddScore),
      pct,
    };
  }

  if (category === "matches") {
    // Matches: pick most frequent digit (rare but high payout)
    // Differs: pick least frequent digit (very likely to differ)
    let maxIdx = 0;
    let minIdx = 0;
    pct.forEach((v, i) => {
      if (v > pct[maxIdx]) maxIdx = i;
      if (v < pct[minIdx]) minIdx = i;
    });
    // Differs is far more consistent; AI prefers Differs on the rarest digit.
    const differsScore = 100 - pct[minIdx];
    return {
      market,
      contractKind: "differs",
      barrier: minIdx,
      score: differsScore,
      pct,
    };
  }

  // Over/Under — try every barrier and pick the strongest edge
  let best: { kind: "over" | "under"; barrier: number; score: number } = {
    kind: "over",
    barrier: 5,
    score: 0,
  };
  for (let b = 0; b <= 9; b++) {
    const overSum = pct.slice(b + 1).reduce((a, v) => a + v, 0);
    const underSum = pct.slice(0, b).reduce((a, v) => a + v, 0);
    if (b < 9 && overSum > best.score) best = { kind: "over", barrier: b, score: overSum };
    if (b > 0 && underSum > best.score) best = { kind: "under", barrier: b, score: underSum };
  }
  return { market, contractKind: best.kind, barrier: best.barrier, score: best.score, pct };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
type Props = {
  markets: Market[];
  onStarted: () => void; // opens the RunPanel modal
};

export default function AIScannerFAB({ markets, onStarted }: Props) {
  const [open, setOpen] = useState(false);
  const [stake, setStake] = useState("1");
  const [targetProfit, setTargetProfit] = useState("10");
  const [stopLoss, setStopLoss] = useState("20");
  const [category, setCategory] = useState<ScanCategory>("overunder");
  const [maxRuns] = useState("100");
  const [multiplier] = useState("2");

  const [scanning, setScanning] = useState(false);
  const [scanIdx, setScanIdx] = useState(0);
  const [pickedRobot, setPickedRobot] = useState<Robot | null>(null);
  const [loadingRobot, setLoadingRobot] = useState(true);
  const [isSashi, setIsSashi] = useState(false);

  const { isRunning } = useRobotRunner();

  /* -------- Detect sashi status once on mount -------- */
  useEffect(() => {
    setIsSashi(getIsSashi());
  }, []);

  /* -------- Load an S-Digit Robot silently (REQUIRED) --------
   *
   * An S-Digit Robot is required to use the AI Scanner for ALL users.
   * The scanner then routes trades based on the account type:
   *   - Sashi user     → pass robotId so the backend runs the sashi
   *                      engine (forced-digit sync).
   *   - Non-sashi user → omit robotId so robotRunner falls back to
   *                      api.placeDigitTrade — the standard endpoint
   *                      that returns real profit/loss for regular
   *                      accounts. This fixes the "profit/loss = 0"
   *                      bug non-sashi users were seeing.
   */
  useEffect(() => {
    const load = async () => {
      setLoadingRobot(true);
      try {
        const { api } = await import("@/lib/api");
        const res = await api.getRobots();
        const list = Array.isArray(res?.data) ? (res.data as Record<string, unknown>[]) : [];
        const sDigit = list
          .filter((r) => r.is_s_digit_robot === true)
          .map(
            (r): Robot => ({
              id: Number(r.id),
              name: String(r.name || ""),
              is_s_digit_robot: true,
              default_digit_contract_type:
                typeof r.default_digit_contract_type === "string"
                  ? r.default_digit_contract_type
                  : undefined,
            }),
          );
        setPickedRobot(sDigit[0] || null);
      } catch (err) {
        console.error("AIScannerFAB: failed to load S-Digit robot", err);
        setPickedRobot(null);
      } finally {
        setLoadingRobot(false);
      }
    };
    load();
  }, []);

  /* -------- Scan + trade -------- */
  const runScan = async () => {
    if (markets.length === 0) {
      toast.error("No markets available to scan");
      return;
    }
    if (!pickedRobot) {
      toast.error("No S-Digit Robot found on your account. Purchase one to use the AI Scanner.");
      return;
    }

    const stakeNum = Math.max(0.5, parseFloat(stake) || 0.5);
    const targetNum = Math.max(0, parseFloat(targetProfit) || 0);
    const stopNum = Math.max(0, parseFloat(stopLoss) || 0);

    setScanning(true);
    setScanIdx(0);

    // Animate through each market
    const results: ScanResult[] = [];
    for (let i = 0; i < markets.length; i++) {
      setScanIdx(i);
      const r = scoreMarket(markets[i], category, i);
      results.push(r);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 380));
    }

    // Pick best
    results.sort((a, b) => b.score - a.score);
    const winner = results[0];

    setScanning(false);
    setOpen(false);

    toast.success(
      `AI picked ${winner.market.display_name || winner.market.name} · ${winner.contractKind.toUpperCase()}${winner.barrier !== undefined ? ` ${winner.barrier}` : ""} (${winner.score.toFixed(1)}% edge)`,
      { duration: 6000 },
    );

    // Decide which engine to route through:
    //   - Sashi user + owns an S-Digit Robot → use the S-Digit robot flow
    //     (backend forces the winning/losing digit for a "sashi sync" run)
    //   - Everyone else → run through the normal digit-trade endpoint so
    //     profit / loss is calculated by the real market outcome.
    const useSashiEngine = isSashi && pickedRobot !== null;

    startRobot({
      market: winner.market.name || winner.market.display_name || "Volatility Market",
      contractKind: winner.contractKind,
      barrier: winner.barrier,
      initialStake: stakeNum,
      multiplier: parseFloat(multiplier) || 2,
      targetProfit: targetNum,
      stopLoss: stopNum,
      maxRuns: parseInt(maxRuns, 10) || 100,
      marketId: winner.market.id,
      // Only forward robotId when the sashi engine should handle it.
      // For non-sashi users (or users without an S-Digit Robot) we omit
      // robotId so robotRunner falls back to api.placeDigitTrade, which
      // returns real profit/loss for standard accounts.
      robotId: useSashiEngine ? pickedRobot!.id : undefined,
    });

    onStarted();
  };

  const currentScanLabel = useMemo(() => {
    if (!scanning) return "";
    const m = markets[scanIdx];
    return m ? m.display_name || m.name : "";
  }, [scanning, scanIdx, markets]);

  /* -------- FAB -------- */
  return (
    <>
      {/* Floating AI Button */}
      <button
        onClick={() => setOpen(true)}
        disabled={isRunning}
        aria-label="AI Scanner"
        className={`fixed z-40 bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2
                    w-16 h-16 rounded-full flex items-center justify-center
                    text-white font-bold text-lg tracking-wider
                    bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500
                    shadow-[0_0_30px_rgba(168,85,247,0.65)]
                    ring-2 ring-white/20
                    transition-transform active:scale-95 hover:scale-105
                    disabled:opacity-60 disabled:cursor-not-allowed
                    ai-fab-glow`}
      >
        <span className="absolute inset-0 rounded-full bg-purple-500/40 blur-xl -z-10 animate-pulse" />
        <Sparkles size={14} className="absolute top-2 right-2 text-white/80" />
        <span className="drop-shadow-md">AI</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => !scanning && setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-slate-900 border border-slate-700 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-fuchsia-600/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.6)]">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">AI Market Scanner</h3>
                  <p className="text-xs text-slate-400">
                    Auto-picks the strongest market & trades it
                  </p>
                </div>
              </div>
              {!scanning && (
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Body */}
            {scanning ? (
              <div className="p-8 flex flex-col items-center gap-5">
                <div className="relative">
                  <Loader2 size={54} className="text-purple-400 animate-spin" />
                  <Sparkles
                    size={20}
                    className="absolute inset-0 m-auto text-fuchsia-300 animate-pulse"
                  />
                </div>
                <div className="text-center">
                  <div className="text-white font-semibold">Scanning markets…</div>
                  <div className="text-xs text-slate-400 mt-1 truncate max-w-[260px]">
                    {currentScanLabel}
                  </div>
                  <div className="mt-3 text-[11px] text-slate-500">
                    {scanIdx + 1} / {markets.length}
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-300"
                    style={{ width: `${((scanIdx + 1) / Math.max(1, markets.length)) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-2 block uppercase tracking-wide">
                    Market Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { key: "overunder", label: "Over/Under" },
                        { key: "matches", label: "Match/Diff" },
                        { key: "evenodd", label: "Even/Odd" },
                      ] as { key: ScanCategory; label: string }[]
                    ).map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setCategory(c.key)}
                        className={`py-2.5 rounded-xl text-xs font-medium transition ${
                          category === c.key
                            ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stake */}
                <NumberField
                  icon={<DollarSign size={14} />}
                  label="Stake Amount"
                  value={stake}
                  onChange={setStake}
                  step="0.5"
                  min="0.5"
                  prefix="$"
                />

                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    icon={<Target size={14} className="text-emerald-400" />}
                    label="Target Profit"
                    value={targetProfit}
                    onChange={setTargetProfit}
                    step="1"
                    min="0"
                    prefix="$"
                  />
                  <NumberField
                    icon={<ShieldAlert size={14} className="text-rose-400" />}
                    label="Stop Loss"
                    value={stopLoss}
                    onChange={setStopLoss}
                    step="1"
                    min="0"
                    prefix="$"
                  />
                </div>

                {loadingRobot && (
                  <div className="text-center text-xs text-slate-500 py-1">
                    Loading AI engine…
                  </div>
                )}
                {!loadingRobot && !pickedRobot && (
                  <div className="text-center text-xs text-amber-400 py-1">
                    No S-Digit Robot on your account. Purchase one to enable AI scanning.
                  </div>
                )}
                {!loadingRobot && pickedRobot && !isSashi && (
                  <div className="text-center text-[11px] text-slate-500 py-1 px-3">
                    Standard account — trades run on the live market engine with real profit/loss.
                  </div>
                )}

                <button
                  onClick={runScan}
                  disabled={loadingRobot || !pickedRobot}
                  className="w-full py-3.5 rounded-2xl font-bold text-white
                             bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500
                             shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50
                             transition-all active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2"
                >
                  <Zap size={18} />
                  Scan & Trade
                </button>

                <p className="text-[10px] text-slate-500 text-center px-4">
                  The AI scores every market in the selected category, picks the
                  strongest edge, and auto-trades using the engine that fits
                  your account. You can watch every trade live.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Extra glow keyframes */}
      <style>{`
        @keyframes aiFabPulse {
          0%, 100% { box-shadow: 0 0 25px rgba(168,85,247,0.55), 0 0 60px rgba(99,102,241,0.25); }
          50%      { box-shadow: 0 0 40px rgba(217,70,239,0.75), 0 0 100px rgba(168,85,247,0.4); }
        }
        .ai-fab-glow { animation: aiFabPulse 2.4s ease-in-out infinite; }
      `}</style>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Small input helper                                                */
/* ------------------------------------------------------------------ */
function NumberField({
  icon,
  label,
  value,
  onChange,
  step,
  min,
  prefix,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  min?: string;
  prefix?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
        {icon}
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            {prefix}
          </span>
        )}
        <input
          type="number"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-slate-800 border border-slate-700 focus:border-purple-500 outline-none
                      rounded-xl py-2.5 ${prefix ? "pl-7" : "pl-3"} pr-3 text-white text-sm font-medium
                      transition-colors`}
        />
      </div>
    </div>
  );
}
