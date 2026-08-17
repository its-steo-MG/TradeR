"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Radar,
  Loader2,
  Target,
  TrendingUp,
  AlertTriangle,
  Rocket,
  RefreshCw,
} from "lucide-react";
import {
  scanAllMarkets,
  pickWinner,
  contractName,
  baseProbability,
  MIN_CONFIDENCE,
  MIN_ADVANTAGE,
  SCAN_PHRASES,
  type ScanMarket,
  type ScanRestriction,
  type MarketScanReport,
  type MarketScanResult,
} from "@/lib/marketScan";

type Props = {
  markets: ScanMarket[];
  autoStart?: boolean;
  executing?: boolean;
  executeLabel?: string;
  /** Hunt only for this prediction across every market. */
  restrict?: ScanRestriction;
  /** Shown in the header, e.g. "Over 4". */
  targetLabel?: string;
  onExecute?: (winner: MarketScanResult) => void;
};

function kindLabel(r: MarketScanResult): string {
  return contractName(r);
}

export default function MarketScannerPanel({
  markets,
  autoStart = false,
  executing = false,
  executeLabel = "Execute signal",
  restrict,
  targetLabel,
  onExecute,
}: Props) {
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");
  const [phrase, setPhrase] = useState(SCAN_PHRASES[0]);
  const [progress, setProgress] = useState(0);
  const [reports, setReports] = useState<MarketScanReport[]>([]);
  const [winner, setWinner] = useState<MarketScanResult | null>(null);
  const [currentMarket, setCurrentMarket] = useState<string>("");
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  // Stable key so the scan restarts when the user changes their prediction.
  const restrictKey = useMemo(
    () => `${restrict?.kinds?.join(",") ?? "all"}|${restrict?.barrier ?? "-"}`,
    [restrict?.kinds, restrict?.barrier],
  );

  const runScan = useCallback(async () => {
    if (!markets.length) return;
    cancelRef.current.cancelled = true;
    cancelRef.current = { cancelled: false };
    const signal = cancelRef.current;

    setPhase("scanning");
    setReports([]);
    setWinner(null);
    setProgress(0);

    const result = await scanAllMarkets(markets, {
      sampleSize: 240,
      delayMs: 240,
      restrict,
      signal,
      onProgress: (report, i, total) => {
        if (signal.cancelled) return;
        setCurrentMarket(report.marketName);
        setProgress(Math.round(((i + 1) / total) * 100));
        setPhrase(SCAN_PHRASES[(i + 1) % SCAN_PHRASES.length]);
        setReports((prev) => [...prev, report].sort((a, b) => b.best.score - a.best.score));
      },
    });

    if (signal.cancelled) return;
    setReports(result);
    setWinner(pickWinner(result));
    setPhase("done");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markets, restrictKey]);

  useEffect(() => {
    if (autoStart && markets.length) void runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, markets.length, restrictKey]);

  useEffect(() => {
    return () => {
      cancelRef.current.cancelled = true;
    };
  }, []);

  const scanning = phase === "scanning";

  const gateText = useMemo(() => {
    if (!restrict?.kinds?.length) return `${MIN_CONFIDENCE}% confidence gate`;
    const fair =
      baseProbability(restrict.kinds[0], restrict.barrier) * 100 + MIN_ADVANTAGE * 100;
    return `needs > ${Math.min(MIN_CONFIDENCE, fair).toFixed(0)}% hit rate`;
  }, [restrict?.kinds, restrict?.barrier]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 overflow-hidden">
      {/* Radar head */}
      <div className="relative px-4 sm:px-5 py-5 sm:py-6 bg-gradient-to-br from-indigo-600/15 via-slate-900 to-purple-600/15">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full border border-indigo-500/40 bg-slate-950 overflow-hidden">
            <div className="absolute inset-2 rounded-full border border-indigo-500/20" />
            <div className="absolute inset-5 rounded-full border border-indigo-500/20" />
            {scanning && (
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(99,102,241,0.55),transparent_35%)] animate-spin" />
            )}
            <Radar className="absolute inset-0 m-auto w-6 h-6 text-indigo-300" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-white font-semibold text-sm sm:text-base leading-tight">
              Market Signal Scanner
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-slate-400 truncate">
              {scanning
                ? phrase
                : phase === "done"
                  ? `Scanned ${reports.length} markets · ${gateText}`
                  : targetLabel
                    ? `Hunting ${targetLabel} across every market`
                    : "Sweeps every market for the strongest digit edge"}
            </div>
            {targetLabel && (
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-200">
                <Target className="w-3 h-3" /> Target: {targetLabel}
              </div>
            )}
            {scanning && (
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-slate-500 truncate">
                  {currentMarket ? `Analysing ${currentMarket}...` : "Preparing feeds..."}
                </div>
              </div>
            )}
          </div>

          {!scanning && (
            <button
              type="button"
              onClick={() => void runScan()}
              className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {phase === "done" ? "Rescan" : "Scan"}
            </button>
          )}
        </div>
      </div>

      {/* Winner / no-signal */}
      {phase === "done" && (
        <div className="px-4 sm:px-5 pt-5">
          {winner ? (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-bold tracking-wide">
                <Target className="w-3.5 h-3.5" /> STRONGEST MARKET
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-white font-semibold truncate">{winner.marketName}</div>
                  <div className="text-sm text-emerald-300 font-medium">{kindLabel(winner)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-white leading-none">
                    {winner.confidence.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    +{(winner.advantage * 100).toFixed(1)}% vs fair · x{winner.payout.toFixed(2)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={executing}
                onClick={() => onExecute?.(winner)}
                className="mt-4 w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {executing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                {executeLabel}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-center">
              <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
              <div className="mt-2 text-sm font-semibold text-amber-300">
                No strong market signal found
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {targetLabel
                  ? `No market is currently favouring ${targetLabel}. Wait for conditions to shift, change your prediction, then rescan.`
                  : "Nothing cleared the confidence gate. Wait for conditions to shift, then rescan."}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ranked feed */}
      <div className="p-4 sm:p-5 space-y-2">
        {reports.length === 0 && !scanning && (
          <div className="py-8 text-center text-xs text-slate-500">
            Press Scan to sweep {markets.length} markets.
          </div>
        )}

        {reports.map((r, idx) => {
          const strong = r.best.advantage >= MIN_ADVANTAGE && r.best.edge > 0;
          return (
            <div
              key={`${r.marketId}-${idx}`}
              className={
                "flex items-center gap-2 sm:gap-3 rounded-xl border px-2.5 sm:px-3 py-2.5 " +
                (strong
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-slate-800 bg-slate-950/60")
              }
            >
              <div className="w-5 text-[11px] font-mono text-slate-500">{idx + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] sm:text-[13px] text-white font-medium truncate">
                  {r.marketName}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400">
                  {kindLabel(r.best)}
                </div>
              </div>
              <div className="hidden xs:flex items-end gap-0.5 h-8 sm:flex">
                {r.pct.map((p, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-sm bg-slate-600"
                    style={{ height: `${Math.max(3, Math.min(32, p * 1.7))}px` }}
                  />
                ))}
              </div>
              <div className="text-right shrink-0 w-14 sm:w-16">
                <div
                  className={
                    "text-sm font-bold " + (strong ? "text-emerald-400" : "text-slate-300")
                  }
                >
                  {r.best.confidence.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 inline-flex items-center gap-0.5 justify-end">
                  <TrendingUp className="w-3 h-3" />
                  {(r.best.advantage * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}

        {scanning && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {phrase}
          </div>
        )}
      </div>
    </div>
  );
}
