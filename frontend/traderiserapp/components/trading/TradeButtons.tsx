"use client";

type Side = {
  label: string;
  payout: number;
  pct: number;
  tone: "green" | "red";
  onClick: () => void;
  disabled?: boolean;
  isStopButton?: boolean;   // ← New: to show "Stop" instead of normal button
};

const styles = {
  green: "bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500",
  red: "bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500",
  stop: "bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 border border-amber-400",
};

export default function TradeButtons({ left, right }: { left: Side; right: Side }) {
  const Btn = ({ s }: { s: Side }) => {
    const isStop = s.isStopButton === true;

    return (
      <button
        onClick={s.onClick}
        disabled={s.disabled || false}
        className={`flex-1 rounded-xl px-5 py-4 text-left text-white shadow-lg transition active:scale-[.98] 
          disabled:opacity-60 disabled:cursor-not-allowed 
          ${isStop ? styles.stop : styles[s.tone]}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-bold leading-tight">
              {isStop ? "STOP AUTO" : s.label}
            </div>
            {!isStop && (
              <div className="text-xs opacity-90 mt-0.5">{s.pct.toFixed(1)}%</div>
            )}
          </div>
          <div className="text-right">
            {!isStop && (
              <>
                <div className="text-base font-bold">${s.payout.toFixed(2)}</div>
                <div className="text-[10px] opacity-90">Payout</div>
              </>
            )}
            {isStop && (
              <div className="text-sm font-semibold mt-1">Click to stop auto-trading</div>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex gap-2">
      <Btn s={left} />
      <Btn s={right} />
    </div>
  );
}