"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createMarketFeeds, marketLabel, MARKETS, type DigitStore } from "@/lib/marketFeeds";
import { isWinningDigit } from "@/lib/contracts";
import {
  entryAdvice,
  isTradeable,
  pct,
  scanAll,
  type Family,
  type Signal,
} from "@/lib/analysisEngine";

import QuickArmDialog, { type QuickArmConfig } from "./QuickArmDialog";

type Props = {
  /** The market currently selected in the terminal — mirrored 1:1 from your tickFeed. */
  activeMarket?: string;
  /** Fired after the user fills stake / target / stop. Pass cfg to armRobot(). */
  onUseSignal?: (cfg: QuickArmConfig, signal: Signal) => void;
  className?: string;
};

const FAMILIES: { id: Family; label: string }[] = [
  { id: "evenodd", label: "Even / Odd" },
  { id: "overunder", label: "Over / Under" },
  { id: "matchdiff", label: "Matches / Differs" },
];

const WINDOWS = [50, 100, 200, 500];
const COUNTDOWN_FROM = 10;

export default function AnalysisTool({
  activeMarket = "volatility-10-1s",
  onUseSignal,
  className = "",
}: Props) {
  const [store, setStore] = useState<DigitStore>({});
  const [family, setFamily] = useState<Family>("matchdiff");
  const [windowSize, setWindowSize] = useState(200);
  const [focus, setFocus] = useState<string | null>(null); // locked market, null = auto best
  const [armSignal, setArmSignal] = useState<Signal | null>(null);
  const [armedCfg, setArmedCfg] = useState<QuickArmConfig | null>(null);

  useEffect(() => {
    const feeds = createMarketFeeds({ activeMarket });
    const off = feeds.subscribe((s: DigitStore) => setStore({ ...s }));
    return () => {
      off();
      feeds.destroy();
    };
  }, [activeMarket]);

  const scan = useMemo(() => scanAll(store, family, windowSize), [store, family, windowSize]);

  const active: Signal | null = focus ? (scan.perMarket[focus]?.[0] ?? null) : scan.best;

  // ---------- countdown ----------
  const [count, setCount] = useState<number | null>(null);
  const keyRef = useRef<string>("");
  const key = active ? `${active.market}|${active.kind}|${active.barrier ?? ""}` : "";
  const armed = isTradeable(active);

  useEffect(() => {
    if (!armed) {
      keyRef.current = "";
      setCount(null);
      return;
    }
    if (keyRef.current !== key) {
      keyRef.current = key;
      setCount(COUNTDOWN_FROM);
    }
  }, [key, armed]);

  useEffect(() => {
    if (count === null) return;
    const t = setTimeout(() => setCount((c) => (c === null ? null : c > 0 ? c - 1 : 0)), 1000);
    return () => clearTimeout(t);
  }, [count]);

  const fire = count === 0;

  // ---------- digit strip ----------
  const stripMarket = active?.market ?? activeMarket ?? MARKETS[0]!.id;
  const strip = (store[stripMarket] ?? []).slice(-30);

  const renderCell = (d: number, i: number) => {
    if (family === "evenodd") {
      const even = d % 2 === 0;
      return (
        <span
          key={i}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-bold ${
            even ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
          }`}
        >
          {even ? "E" : "O"}
        </span>
      );
    }
    const hit = active ? isWinningDigit(active.kind, active.barrier, d) : false;
    return (
      <span
        key={i}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-bold ${
          hit ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/10 text-rose-400/80"
        }`}
      >
        {d}
      </span>
    );
  };

  return (
    <div
      className={`flex h-full w-full flex-col gap-3 overflow-y-auto p-3 text-slate-100 ${className}`}
    >
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wide">MULTI-MARKET DIGIT SCANNER</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-slate-400">
            {Object.keys(store).length} markets · live: {marketLabel(activeMarket)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setWindowSize(w)}
              className={`rounded px-2 py-1 text-[11px] font-medium ${
                windowSize === w ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {w}t
            </button>
          ))}
        </div>
      </div>

      {/* family tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-800/60 p-1">
        {FAMILIES.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFamily(f.id);
              setFocus(null);
            }}
            className={`flex-1 rounded-md px-2 py-2 text-xs font-semibold transition ${
              family === f.id ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* best signal */}
      <div
        className={`rounded-xl border p-3 ${
          fire && armed ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-slate-900/60"
        }`}
      >
        {!active ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Collecting ticks from all volatility markets…
          </p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400">
                  {focus ? "Locked market" : "Best market right now"}
                </p>
                <p className="text-lg font-bold">
                  {marketLabel(active.market)} · {active.label}
                </p>
                <p className="text-[11px] text-slate-400">
                  hit {pct(active.observed)} ({active.hits}/{active.samples}) · need{" "}
                  {pct(active.breakeven)} · payout {active.payout.toFixed(2)}x · streak{" "}
                  {active.streak}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-2xl font-black tabular-nums ${
                    active.edge > 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {active.edge > 0 ? "+" : ""}
                  {(active.edge * 100).toFixed(1)}%
                </p>
                <p className="text-[10px] uppercase text-slate-400">expected edge</p>
              </div>
            </div>

            {/* countdown */}
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-950/60 p-2">
              {armed ? (
                fire ? (
                  <span className="animate-pulse text-sm font-black text-emerald-400">
                    ▶ RUN THE ROBOT NOW — {active.label} on {marketLabel(active.market)}
                  </span>
                ) : (
                  <>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-base font-black tabular-nums text-white">
                      {count}
                    </span>
                    <span className="text-xs text-slate-400">
                      Get ready — run <b className="text-slate-100">{active.label}</b> on{" "}
                      <b className="text-slate-100">{marketLabel(active.market)}</b> in {count}s
                    </span>
                  </>
                )
              ) : (
                <span className="text-xs text-slate-400">
                  No confident edge on this family yet — waiting for a setup. Do not trade.
                </span>
              )}
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{entryAdvice(active)}</p>

            {armedCfg && (
              <p className="mt-3 rounded-lg bg-emerald-500/10 px-2 py-1.5 text-[11px] font-semibold text-emerald-400">
                Robot armed · {armedCfg.contractKind}
                {armedCfg.barrier !== null ? ` ${armedCfg.barrier}` : ""} · stake{" "}
                {armedCfg.initialStake} — hit RUN on the dock when the countdown fires.
              </p>
            )}

            <button
              disabled={!armed}
              onClick={() => setArmSignal(active)}
              className="mt-3 w-full rounded-lg bg-blue-500 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              Use this signal in the robot
            </button>
          </>
        )}
      </div>

      {/* last digits */}
      <div>
        <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">
          Last 30 ticks · {marketLabel(stripMarket)}
        </p>
        <div className="flex flex-wrap gap-1">{strip.map(renderCell)}</div>
      </div>

      {/* ranking */}
      <div>
        <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">
          All volatility markets · best {FAMILIES.find((f) => f.id === family)?.label} setup
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-700">
          {scan.ranked.map((s, i) => {
            const selected = focus === s.market || (!focus && i === 0);
            return (
              <button
                key={s.market}
                onClick={() => setFocus(focus === s.market ? null : s.market)}
                className={`flex w-full items-center justify-between gap-2 border-b border-slate-800 px-2 py-2 text-left last:border-0 ${
                  selected ? "bg-blue-500/10" : "hover:bg-slate-800/60"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-4 text-[10px] text-slate-500">{i + 1}</span>
                  <span className="text-xs font-semibold">{marketLabel(s.market)}</span>
                  {s.market === activeMarket && (
                    <span className="rounded bg-slate-700 px-1 text-[9px] uppercase text-slate-300">
                      live
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs font-medium">{s.label}</span>
                  <span className="text-[11px] tabular-nums text-slate-400">{pct(s.observed)}</span>
                  <span
                    className={`w-14 text-right text-xs font-bold tabular-nums ${
                      s.edge > 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {s.edge > 0 ? "+" : ""}
                    {(s.edge * 100).toFixed(1)}%
                  </span>
                </span>
              </button>
            );
          })}
          {!scan.ranked.length && (
            <p className="px-2 py-4 text-center text-xs text-slate-500">Warming up…</p>
          )}
        </div>
      </div>

      {armSignal && (
        <QuickArmDialog
          signal={armSignal}
          marketLabel={marketLabel(armSignal.market)}
          onCancel={() => setArmSignal(null)}
          onArm={(cfg, sig) => {
            setArmedCfg(cfg);
            setArmSignal(null);
            onUseSignal?.(cfg, sig);
          }}
        />
      )}
    </div>
  );
}
