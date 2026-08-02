"use client";

type Field = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  tone: "emerald" | "rose" | "amber";
};

const tones: Record<Field["tone"], string> = {
  emerald: "text-emerald-400",
  rose: "text-rose-400",
  amber: "text-amber-400",
};

type Props = {
  targetProfit: number;
  stopLoss: number;
  multiplier: number;
  onChange: (k: "targetProfit" | "stopLoss" | "multiplier", v: number) => void;
};

export default function RiskRow({ targetProfit, stopLoss, multiplier, onChange }: Props) {
  const fields: (Field & { key: "targetProfit" | "stopLoss" | "multiplier" })[] = [
    { key: "targetProfit", label: "TARGET PROFIT", value: targetProfit, prefix: "$", tone: "emerald" },
    { key: "stopLoss", label: "STOP LOSS", value: stopLoss, prefix: "$", tone: "rose" },
    { key: "multiplier", label: "MULTIPLIER", value: multiplier, prefix: "x", tone: "amber" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {fields.map((f) => (
        <div
          key={f.key}
          className="relative rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 overflow-hidden"
        >
          {/* Soft liquid glass layer */}
          <div
            className="absolute inset-0 pointer-events-none rounded-xl"
            style={{
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-[1]">
            <div className={`text-[10px] font-semibold tracking-wider ${tones[f.tone]}`}>
              {f.label}
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-xs ${tones[f.tone]}`}>{f.prefix}</span>
              <input
                value={f.value}
                onChange={(e) => onChange(f.key, Math.max(0, parseFloat(e.target.value) || 0))}
                className="bg-transparent text-white font-semibold text-lg w-full outline-none"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}