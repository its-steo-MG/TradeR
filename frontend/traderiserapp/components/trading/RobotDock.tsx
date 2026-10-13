"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, Square, Pause, Play } from "lucide-react";
import * as robotRunner from "@/lib/robotRunner";
import { useRobotRunner, stop, start } from "@/lib/robotRunner";
import { disarmRobot, restoreConfigPanel, setRunPanelOpen, useRobotArm } from "@/lib/robotArm";
import { RunPanel } from "./RunPanel";

type Props = {
  onConfigure?: () => void;
  hidden?: boolean;
  defaultExpanded?: boolean;
  onClose?: () => void;
};

type Phase = "idle" | "open" | "won" | "lost";

export default function RobotDock({ hidden, defaultExpanded, onClose }: Props) {
  const { isRunning, transactions } = useRobotRunner();
  const { armed, minimized } = useRobotArm();
  const isArmed = !!armed && minimized && !isRunning;
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [pnl, setPnl] = useState(0);
  const [progress, setProgress] = useState(0);
  const lastSettledId = useRef<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latest = transactions[0];
  const latestOpen = latest?.isOpen === true;
  const lastSettled = useMemo(
    () => transactions.find((t) => !t.isOpen),
    [transactions],
  );

  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);

  useEffect(() => {
    setRunPanelOpen(expanded);
    return () => setRunPanelOpen(false);
  }, [expanded]);

  useEffect(() => {
    if (isArmed) setExpanded(false);
  }, [isArmed]);

  useEffect(() => {
    if (!latestOpen) return;
    setPhase("open");
    setProgress(8);
    const iv = setInterval(() => {
      setProgress((p) => (p < 92 ? p + Math.max(1, (92 - p) * 0.12) : p));
    }, 180);
    return () => clearInterval(iv);
  }, [latestOpen, latest?.id]);

  useEffect(() => {
    if (!lastSettled || lastSettled.id === lastSettledId.current) return;
    lastSettledId.current = lastSettled.id;
    setPhase(lastSettled.isWin ? "won" : "lost");
    setPnl(Number(lastSettled.pnl ?? 0));
    setProgress(100);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setPhase("idle");
      setProgress(0);
    }, 4000);
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, [lastSettled]);

  const hasSession = isRunning || transactions.length > 0;
  if ((!hasSession && !isArmed) || hidden) return null;

  const runArmed = () => {
    if (!armed) return;
    const { robotName: _rn, marketLabel: _ml, ...cfg } = armed;
    (start as unknown as (c: unknown) => void)(cfg);
    disarmRobot();
    setPaused(false);
  };

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    const r = robotRunner as unknown as Record<string, (...args: unknown[]) => void>;
    if (next) r["pause"]?.();
    else (r["resume"] ?? r["start"])?.();
  };

  const money = `${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toFixed(2)}`;
  const label =
    phase === "won"
      ? `Won ${money}`
      : phase === "lost"
        ? `Lost ${money}`
        : phase === "open"
          ? paused
            ? "Contract paused"
            : "Contract running"
          : isRunning
            ? "Waiting for contract"
            : isArmed
              ? `Ready`
              : "Contract";

  const labelColor =
    phase === "won"
      ? "text-emerald-600 dark:text-emerald-400"
      : phase === "lost"
        ? "text-rose-600 dark:text-rose-400"
        : "text-slate-900 dark:text-white";

  const barColor =
    phase === "won"
      ? "bg-emerald-500"
      : phase === "lost"
        ? "bg-rose-500"
        : "bg-blue-500";

  const barWrap = "fixed inset-x-0 bottom-3 z-50 px-3 sm:px-4 pointer-events-none";
  const barInner =
    "pointer-events-auto mx-auto w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl";
  const runBtn =
    "flex h-10 w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-bl-2xl bg-emerald-600 text-[12px] font-bold text-white transition-colors hover:bg-emerald-500";
  const pauseBtn =
    "flex h-10 w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-bl-2xl bg-amber-500 text-[12px] font-bold text-white transition-colors hover:bg-amber-400 disabled:opacity-50";
  const stopBtn =
    "flex h-10 w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-br-2xl bg-rose-600 text-[12px] font-bold text-white transition-colors hover:bg-rose-500 disabled:opacity-50";
  const centerCell = "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-3";
  const chevBtn =
    "mx-auto flex h-7 w-full items-center justify-center rounded-t-2xl border-x border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white";

  return (
    <>
      {!expanded && (
        <div className={barWrap}>
          <div className={barInner}>
            <button
              onClick={() => (isArmed ? restoreConfigPanel() : setExpanded(true))}
              title={isArmed ? "Edit robot settings" : "Open run panel"}
              className={chevBtn}
            >
              <ChevronUp className="h-4 w-4" />
            </button>

            <div className="flex items-center justify-between px-2 py-2">
              {isArmed ? (
                <button onClick={runArmed} className={runBtn} title="Start the robot">
                  <Play className="h-4 w-4 fill-current" />
                  Run
                </button>
              ) : (
                <button onClick={togglePause} className={pauseBtn}>
                  {paused ? (
                    <Play className="h-4 w-4 fill-current" />
                  ) : (
                    <Pause className="h-4 w-4 fill-current" />
                  )}
                  {paused ? "Resume" : "Pause"}
                </button>
              )}

              <div className={centerCell}>
                <span className={`truncate text-[11px] font-semibold transition-colors ${labelColor}`}>
                  {label}
                </span>
                <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => (isArmed ? disarmRobot() : stop())}
                disabled={!isRunning && !isArmed}
                className={stopBtn}
              >
                <Square className="h-4 w-4 fill-current" />
                {isArmed ? "Cancel" : "Stop"}
              </button>
            </div>
          </div>
        </div>
      )}

      <RunPanel open={expanded} onClose={() => { setExpanded(false); onClose?.(); }} />
    </>
  );
}
