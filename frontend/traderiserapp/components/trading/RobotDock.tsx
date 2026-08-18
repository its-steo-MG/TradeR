"use client";

import { useEffect, useState } from "react";
import { ChevronUp, Square, Pause, Play } from "lucide-react";
import * as robotRunner from "@/lib/robotRunner";
import { useRobotRunner, stop } from "@/lib/robotRunner";
import { RunPanel } from "./RunPanel";

type Props = {
  onConfigure?: () => void;
  hidden?: boolean;
  defaultExpanded?: boolean;
};

export default function RobotDock({ hidden, defaultExpanded }: Props) {
  const { isRunning, transactions } = useRobotRunner();
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);

  const hasSession = isRunning || transactions.length > 0;
  if (!hasSession || hidden) return null;

  const openCount = transactions.filter((t) => t.isOpen).length;
  const closedCount = transactions.filter((t) => !t.isOpen).length;
  const total = transactions.length || 1;
  const progress = openCount > 0 ? 45 : Math.min(100, Math.round((closedCount / total) * 100));

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    const r = robotRunner as unknown as Record<string, (...args: unknown[]) => void>;
    if (next) r["pause"]?.();
    else (r["resume"] ?? r["start"])?.();
  };

  const barWrap =
    "fixed inset-x-0 bottom-3 z-50 px-3 sm:px-4 pointer-events-none";
  const barInner =
    "pointer-events-auto mx-auto w-full rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-md shadow-2xl ring-1 ring-black/40";
  const pauseBtn =
    "flex h-10 w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-bl-2xl bg-amber-500 text-[12px] font-bold text-white transition-colors hover:bg-amber-400 disabled:opacity-50";
  const stopBtn =
    "flex h-10 w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-br-2xl bg-rose-600 text-[12px] font-bold text-white transition-colors hover:bg-rose-500 disabled:opacity-50";
  const centerCell =
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-3";
  const chevBtn =
    "mx-auto flex h-7 w-full items-center justify-center rounded-t-2xl border-x border-t border-slate-800 bg-slate-900/95 text-slate-400 backdrop-blur-md hover:text-white";

  return (
    <>
      {!expanded && (
        <div className={barWrap}>
          <div className={barInner}>
            {/* expand arrow */}
            <button
              onClick={() => setExpanded(true)}
              title="Open run panel"
              className={chevBtn}
            >
              <ChevronUp className="h-4 w-4" />
            </button>

            {/* Deriv-style minimised bar: Pause | Contract + progress | Stop */}
            <div className="flex items-center justify-between px-2 py-2">
              <button onClick={togglePause} className={pauseBtn}>
                {paused ? (
                  <Play className="h-4 w-4 fill-current" />
                ) : (
                  <Pause className="h-4 w-4 fill-current" />
                )}
                {paused ? "Resume" : "Pause"}
              </button>

              <div className={centerCell}>
                <span className="text-[11px] font-semibold text-white">Contract</span>
                <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => stop()}
                disabled={!isRunning}
                className={stopBtn}
              >
                <Square className="h-4 w-4 fill-current" />
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

      <RunPanel open={expanded} onClose={() => setExpanded(false)} />
    </>
  );
}
