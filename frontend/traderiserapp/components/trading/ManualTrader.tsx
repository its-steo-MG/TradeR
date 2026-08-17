"use client";

import { useEffect, useState } from "react";
import type { DigitContractKind } from "@/lib/types/positions";

type Props = {
  pct: number[];
  maxIdx: number;
  minIdx: number;
  currentDigit: number | null;
  price?: number | null;
  selected?: number | null;
  kind?: DigitContractKind;
  marketName?: string;
  windowSize?: number;
  lastResult?: { digit: number; isWin: boolean; id: string } | null;
  onSelect?: (d: number) => void;
};

function isTargeted(kind: DigitContractKind | undefined, selected: number | null | undefined, d: number) {
  if (selected == null || !kind) return false;
  switch (kind) {
    case "over":
      return d > selected;
    case "under":
      return d < selected;
    case "matches":
      return d === selected;
    case "differs":
      return d !== selected;
    case "even":
      return d % 2 === 0;
    case "odd":
      return d % 2 === 1;
    default:
      return false;
  }
}

export default function ManualTrader({
  pct,
  maxIdx,
  minIdx,
  currentDigit,
  price,
  selected,
  kind,
  marketName,
  windowSize = 100,
  lastResult,
  onSelect,
}: Props) {
  const digits = Array.from({ length: 10 }, (_, i) => i);
  const [flash, setFlash] = useState<{ digit: number; isWin: boolean } | null>(null);

  useEffect(() => {
    if (!lastResult) return;
    setFlash({ digit: lastResult.digit, isWin: lastResult.isWin });
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [lastResult?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Live price header */}
      <div className="pt-8 sm:pt-12 pb-1 text-center">
        <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-slate-500">
          {marketName || "Live market"}
        </div>
        <div className="mt-0.5 sm:mt-1 flex items-center justify-center gap-2">
          <span className="font-mono text-xl sm:text-2xl lg:text-3xl font-bold text-white tabular-nums">
            {price != null ? price.toFixed(3) : "--.---"}
          </span>
          {currentDigit != null && (
            <span
              className={
                "inline-flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl font-mono text-sm sm:text-base font-bold " +
                (flash
                  ? flash.isWin
                    ? "bg-emerald-500 text-white"
                    : "bg-rose-500 text-white"
                  : "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40")
              }
            >
              {currentDigit}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[9px] sm:text-[10px] text-slate-500">
          Last-digit distribution · last {windowSize} ticks
        </div>
      </div>

      {/* Digit circles — always 2 rows of 5, perfectly circular */}
      <div className="flex-1 flex items-center justify-center px-2 sm:px-4">
        <div className="grid w-full max-w-2xl grid-cols-5 gap-2 sm:gap-3 lg:gap-4 justify-items-center">
          {digits.map((d) => {
            const p = pct[d] ?? 0;
            const isHot = d === maxIdx;
            const isCold = d === minIdx;
            const isCur = d === currentDigit;
            const isSel = selected === d;
            const inTrade = isTargeted(kind, selected, d);
            const isFlash = flash?.digit === d;

            const ringColor = isHot ? "#34d399" : isCold ? "#fb7185" : "#60a5fa";

            return (
              <button
                key={d}
                type="button"
                onClick={() => onSelect?.(d)}
                className="group relative flex flex-col items-center gap-0.5 focus:outline-none"
              >
                <span
                  className="relative flex h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 lg:h-20 lg:w-20 xl:h-24 xl:w-24 items-center justify-center rounded-full transition-transform duration-200 group-active:scale-95"
                  style={{
                    background: `conic-gradient(${ringColor} ${Math.min(100, p * 4)}%, rgba(30,41,59,0.9) 0)`,
                  }}
                >
                  <span
                    className={
                      "flex h-[78%] w-[78%] flex-col items-center justify-center rounded-full transition-colors " +
                      (isFlash
                        ? flash?.isWin
                          ? "bg-emerald-500 text-white"
                          : "bg-rose-500 text-white"
                        : isCur
                          ? "bg-blue-500 text-white"
                          : inTrade
                            ? "bg-slate-800 text-emerald-300 ring-1 ring-emerald-500/50"
                            : "bg-slate-900 text-slate-200")
                    }
                  >
                    <span className="font-mono text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold leading-none">
                      {d}
                    </span>
                    <span className="mt-0.5 text-[8px] sm:text-[9px] lg:text-[10px] text-slate-400 tabular-nums">
                      {p.toFixed(1)}%
                    </span>
                  </span>

                  {isSel && (
                    <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/80" />
                  )}
                  {isCur && (
                    <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-blue-400 animate-ping opacity-40" />
                  )}
                </span>

                <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wide">
                  {isHot ? (
                    <span className="text-emerald-400">hot</span>
                  ) : isCold ? (
                    <span className="text-rose-400">cold</span>
                  ) : (
                    <span className="text-transparent">-</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pb-2 sm:pb-3 text-center text-[9px] sm:text-[10px] text-slate-500">
        Tap a circle to set your barrier, then buy from the panel below.
      </div>
    </div>
  );
}
