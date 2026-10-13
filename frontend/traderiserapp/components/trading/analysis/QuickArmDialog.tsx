"use client";

import { useState } from "react";
import type { Signal } from "@/lib/analysisEngine";
import { getRobotDraft, saveRobotDraft, markConfigured } from "@/lib/robotConfigStore";

export type QuickArmConfig = {
  market: string;
  contractKind: string;
  barrier: number | null;
  initialStake: number;
  multiplier: number;
  targetProfit: number;
  stopLoss: number;
  maxRuns: number;
  marketId: number | null;
  robotId: number | null;
  robotName?: string;
  marketLabel?: string;
};

type Props = {
  signal: Signal;
  marketLabel: string;
  onCancel: () => void;
  onArm: (cfg: QuickArmConfig, signal: Signal) => void;
};

export default function QuickArmDialog({ signal, marketLabel, onCancel, onArm }: Props) {
  const draft = getRobotDraft();
  const [stake, setStake] = useState(draft.initialStake || "1");
  const [target, setTarget] = useState(draft.targetProfit || "10");
  const [stop, setStop] = useState(draft.stopLoss || "10");

  const submit = () => {
    const cfg: QuickArmConfig = {
      market: signal.market,
      contractKind: signal.kind,
      barrier: typeof signal.barrier === "number" ? signal.barrier : null,
      initialStake: Number(stake),
      multiplier: Number(draft.multiplier || 2),
      targetProfit: Number(target),
      stopLoss: Number(stop),
      maxRuns: Number(draft.maxRuns || 10),
      marketId: draft.marketId ?? null,
      robotId: draft.robotId ?? null,
      robotName: draft.robotName,
      marketLabel,
    };
    saveRobotDraft({
      ...draft,
      contractKind: signal.kind,
      barrier: cfg.barrier === null ? "" : String(cfg.barrier),
      initialStake: stake,
      targetProfit: target,
      stopLoss: stop,
    });
    markConfigured();
    onArm(cfg, signal);
  };

  const field = (label: string, v: string, set: (s: string) => void) => (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-zinc-400">{label}</span>
      <input
        value={v}
        inputMode="decimal"
        onChange={(e) => set(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
        <p className="text-sm font-bold">Arm robot · {signal.label}</p>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">{marketLabel}</p>
        <div className="mt-3 space-y-3">
          {field("Stake", stake, setStake)}
          {field("Target profit", target, setTarget)}
          {field("Stop loss", stop, setStop)}
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-lg bg-slate-100 py-2 text-xs font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
            Cancel
          </button>
          <button onClick={submit} className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white">
            Load into robot
          </button>
        </div>
      </div>
    </div>
  );
}
