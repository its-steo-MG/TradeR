"use client";
import { useEffect, useState } from "react";

type Props = { stake: number; setStake: (v: number) => void; };
const PRESETS = [1, 5, 10, 25, 50, 100];

export default function StakePanel({ stake, setStake }: Props) {
  const [text, setText] = useState(stake.toString());
  useEffect(() => setText(stake.toString()), [stake]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStake(Math.max(1, stake - 1))}
          className="w-12 h-14 rounded-md bg-slate-800 text-slate-300 text-xl hover:bg-slate-700"
        >−</button>
        <div className="flex-1 h-14 rounded-md border border-blue-500/60 bg-slate-900 px-4 flex flex-col justify-center">
          <div className="text-[10px] text-blue-400 tracking-wider text-center">STAKE</div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-blue-400">$</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ""))}
              onBlur={() => setStake(Math.max(1, parseFloat(text) || 1))}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              className="bg-transparent text-white text-center text-2xl font-semibold w-24 outline-none"
            />
          </div>
        </div>
        <button
          onClick={() => setStake(stake + 1)}
          className="w-12 h-14 rounded-md bg-slate-800 text-slate-300 text-xl hover:bg-slate-700"
        >+</button>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {PRESETS.map((v) => (
          <button
            key={v}
            onClick={() => setStake(v)}
            className={`h-9 rounded-md text-sm border ${
              stake === v
                ? "border-blue-500 text-blue-400 bg-blue-500/10"
                : "border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >${v}</button>
        ))}
      </div>
    </div>
  );
}
