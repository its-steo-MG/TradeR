"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  ChevronUp,
  ChevronDown,
  Square,
  Settings2,
  Activity,
} from "lucide-react";
import { useRobotRunner, stop } from "@/lib/robotRunner";
import { RunPanel } from "./RunPanel";

type Props = {
  onConfigure?: () => void;
  hidden?: boolean;
  defaultExpanded?: boolean;
};

export default function RobotDock({ onConfigure, hidden, defaultExpanded }: Props) {
  const { isRunning, transactions, sessionPnl, runs, config } = useRobotRunner();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);

  const hasSession = isRunning || transactions.length > 0;
  if (!hasSession || hidden) return null;

  const wins = transactions.filter((t) => t.isWin).length;
  const losses = transactions.filter((t) => !t.isWin && t.pnl !== 0).length;
  const positive = sessionPnl >= 0;

  return (
    <>
      {/* Collapsed dock — chart stays fully visible behind it */}
      <div className="fixed inset-x-0 bottom-14 lg:bottom-0 z-40 px-2 sm:px-4 pb-2 pointer-events-none">
        <div className="pointer-events-auto mx-auto w-full max-w-md md:max-w-2xl lg:max-w-4xl rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-md shadow-2xl ring-1 ring-black/40">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                <Bot className="h-4.5 w-4.5 text-white" />
              </div>
              {isRunning && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse ring-2 ring-slate-900" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-white">
                  {config?.market || "Robot session"}
                </span>
                <span
                  className={
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide " +
                    (isRunning
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                      : "bg-slate-700/60 text-slate-300 border border-slate-600")
                  }
                >
                  {isRunning ? "RUNNING" : "IDLE"}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {runs} runs
                </span>
                <span className="text-emerald-400">{wins}W</span>
                <span className="text-rose-400">{losses}L</span>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div
                className={
                  "font-mono text-sm font-bold tabular-nums " +
                  (positive ? "text-emerald-400" : "text-rose-400")
                }
              >
                {positive ? "+" : "-"}${Math.abs(sessionPnl).toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500">session P/L</div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {onConfigure && (
                <button
                  type="button"
                  onClick={onConfigure}
                  title="Configure robot"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              )}
              {isRunning && (
                <button
                  type="button"
                  onClick={() => stop()}
                  title="Stop robot"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                >
                  <Square className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                title={expanded ? "Minimise" : "Expand trades"}
                className="flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-[11px] font-semibold text-white hover:bg-blue-500"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
                {expanded ? "Hide" : "Trades"}
              </button>
            </div>
          </div>

          {/* Mini ticker of the last contracts, visible while minimised */}
          {!expanded && transactions.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-800 px-3 py-2 no-scrollbar">
              {transactions.slice(0, 14).map((t) => (
                <span
                  key={t.id}
                  title={`${t.market} · ${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}`}
                  className={
                    "flex h-6 min-w-[28px] shrink-0 items-center justify-center rounded-md px-1.5 font-mono text-[10px] font-bold " +
                    (t.isWin
                      ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30")
                  }
                >
                  {t.isWin ? "W" : "L"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expanded — full run panel sheet */}
      <RunPanel open={expanded} onClose={() => setExpanded(false)} />
    </>
  );
}
