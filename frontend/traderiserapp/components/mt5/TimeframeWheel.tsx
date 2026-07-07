"use client";

import { TIMEFRAMES, type Timeframe } from "@/lib/mt5-store";

export default function TimeframeWheel({ value, onChange, onClose }: { value: Timeframe; onChange: (t: Timeframe) => void; onClose: () => void }) {
  const r = 110, cx = 140, cy = 140;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative h-[280px] w-[280px]" onClick={(e) => e.stopPropagation()}>
        <div className="absolute inset-0 rounded-full border border-white/10 bg-[#111]/90 shadow-2xl" />
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-white/40">Timeframe</div>
            <div className="mt-1 text-3xl font-bold text-sky-400">{value}</div>
          </div>
        </div>
        {TIMEFRAMES.map((tf, i) => {
          const a = (i / TIMEFRAMES.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(a) * r - 22;
          const y = cy + Math.sin(a) * r - 22;
          const active = tf === value;
          return (
            <button key={tf} onClick={() => { onChange(tf); onClose(); }} style={{ left: x, top: y }} className={`absolute grid h-11 w-11 place-items-center rounded-full text-xs font-bold transition-all ${active ? "bg-sky-500 text-white scale-110 shadow-lg shadow-sky-500/40" : "bg-white/5 text-white/80 hover:bg-white/15"}`}>{tf}</button>
          );
        })}
      </div>
    </div>
  );
}