"use client";

import { DropRipple, useDropRipple } from "@/components/ui/button";

type Side = {
  label: string;
  payout: number;
  pct: number;
  tone: "green" | "red";
  onClick: () => void;
  disabled?: boolean;
  isStopButton?: boolean;
  /** shows the water-drop-landing animation on the selected side */
  selected?: boolean;
};

/* Original colours are untouched — the liquid look is only the
   clear water drop overlay (.drop-on-top) sitting on top of them. */
const styles = {
  green:
    "bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500",
  red: "bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500",
  stop: "bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 border border-amber-400",
};

export default function TradeButtons({ left, right }: { left: Side; right: Side }) {
  const Btn = ({ s }: { s: Side }) => {
    const isStop = s.isStopButton === true;
    const ripple = useDropRipple(s.selected);

    return (
      <button
        onClick={s.onClick}
        disabled={s.disabled || false}
        aria-pressed={s.selected || undefined}
        className={`drop-on-top ${s.selected ? "drop-selected" : ""} flex flex-1 rounded-[1.75rem] px-5 py-4 text-left text-white
          disabled:opacity-60 disabled:cursor-not-allowed
          ${isStop ? styles.stop : styles[s.tone]}`}
      >
        <div className="relative z-[1] flex w-full items-start justify-between">
          <div>
            <div className="text-xl font-bold leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
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
        {s.selected ? <DropRipple trigger={ripple} /> : null}
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
