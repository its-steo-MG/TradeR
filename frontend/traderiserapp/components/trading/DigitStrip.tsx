"use client";

type Props = {
  pct: number[];
  maxIdx: number;
  minIdx: number;
  currentDigit: number | null;
  selected?: number | null;
  onSelect?: (d: number) => void;
  highlight?: { digit: number; color: "green" | "red" } | null;
  windowSize?: number;
  onWindowChange?: (n: number) => void;
  isRefreshing?: boolean;
};

const WINDOW_OPTIONS = [50, 100, 500, 1000];

/* one straight line of 10 circles, sized so they always fit the row */
const CIRCLE =
  "relative flex flex-col items-center justify-center rounded-full aspect-square w-full min-w-0 max-w-[54px] sm:max-w-[64px] lg:max-w-[76px]";

export default function DigitStrip({
  pct,
  maxIdx,
  minIdx,
  currentDigit,
  selected,
  onSelect,
  highlight,
  windowSize = 100,
  onWindowChange,
  isRefreshing,
}: Props) {
  const digits = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div className="space-y-2">
      {onWindowChange && (
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>Last digit stats</span>
          <div className="flex gap-1">
            {WINDOW_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => onWindowChange(n)}
                disabled={isRefreshing}
                className={
                  "px-2 py-0.5 rounded-md border transition-colors disabled:opacity-50 " +
                  (windowSize === n
                    ? "bg-slate-700 text-white border-slate-500"
                    : "bg-transparent text-slate-400 border-slate-700 hover:border-slate-500")
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Single row of 10 circles on every screen size */}
      <div
        className={
          "grid grid-cols-10 items-center justify-items-center gap-1 sm:gap-2 px-0.5 transition-all duration-300 " +
          (isRefreshing ? "opacity-60" : "opacity-100")
        }
      >
        {isRefreshing
          ? digits.map((i) => (
              <div
                key={i}
                className={CIRCLE + " border border-slate-700 bg-slate-800/40 overflow-hidden animate-pulse"}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="relative text-slate-500 text-[10px] sm:text-xs font-semibold">{i}</span>
                <span className="relative text-[7px] sm:text-[9px] text-slate-600">--%</span>
              </div>
            ))
          : pct.map((p, i) => {
              const isMax = i === maxIdx;
              const isMin = i === minIdx;
              const isCur = i === currentDigit;
              const isSel = i === selected;
              const isHighlighted = highlight?.digit === i;
              const highlightColor = highlight?.color;

              const cls = [
                CIRCLE,
                "transition-all duration-300 border hover:bg-slate-800",
                isSel ? "ring-2 ring-orange-400" : "",
                isCur ? "bg-slate-700/70" : "bg-transparent",
                isMax ? "border-emerald-400" : isMin ? "border-rose-400" : "border-slate-700",
                isHighlighted
                  ? highlightColor === "green"
                    ? "ring-4 ring-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_#10b981] scale-110"
                    : "ring-4 ring-rose-400 bg-rose-500/20 shadow-[0_0_25px_#ef4444] scale-110"
                  : "",
              ].join(" ");

              return (
                <button key={i} onClick={() => onSelect?.(i)} className={cls}>
                  <span className="text-white font-semibold text-[11px] sm:text-sm lg:text-base leading-none">
                    {i}
                  </span>
                  <span
                    className={
                      "mt-0.5 text-[7px] sm:text-[9px] leading-none " +
                      (isMax ? "text-emerald-400" : isMin ? "text-rose-400" : "text-slate-400")
                    }
                  >
                    {p.toFixed(1)}%
                  </span>

                  {isSel && (
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-orange-400 text-[10px]">
                      ▼
                    </span>
                  )}

                  {isHighlighted && (
                    <div
                      className={
                        "absolute inset-0 rounded-full animate-ping-once " +
                        (highlightColor === "green" ? "bg-emerald-400/30" : "bg-rose-400/30")
                      }
                    />
                  )}
                </button>
              );
            })}
      </div>
    </div>
  );
}
