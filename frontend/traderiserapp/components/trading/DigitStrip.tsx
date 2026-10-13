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
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 dark:text-zinc-400">
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
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-950 dark:border-white"
                    : "bg-white text-slate-500 border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700")
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

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
                className={CIRCLE + " border border-slate-200 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 overflow-hidden animate-pulse"}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="relative text-slate-400 text-[10px] sm:text-xs font-semibold">{i}</span>
                <span className="relative text-[7px] sm:text-[9px] text-slate-400">--%</span>
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
                "transition-all duration-300 border",
                isCur
                  ? "z-10 scale-110 border-blue-600 bg-blue-600 text-white shadow-[0_0_0_4px_rgba(37,99,235,0.35)] dark:border-blue-400 dark:bg-blue-500 dark:shadow-[0_0_0_4px_rgba(96,165,250,0.45)]"
                  : "bg-white text-slate-900 hover:bg-slate-50 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800",
                !isCur && isSel ? "ring-2 ring-orange-500" : "",
                !isCur && isMax ? "border-emerald-500" : !isCur && isMin ? "border-rose-500" : !isCur ? "border-slate-200 dark:border-zinc-700" : "",
                isHighlighted
                  ? highlightColor === "green"
                    ? "ring-4 ring-emerald-400 bg-emerald-500 text-white scale-110"
                    : "ring-4 ring-rose-400 bg-rose-500 text-white scale-110"
                  : "",
              ].join(" ");

              return (
                <button key={i} onClick={() => onSelect?.(i)} className={cls}>
                  {isCur && (
                    <span className="pointer-events-none absolute inset-[-6px] rounded-full border-2 border-blue-500 animate-ping opacity-60 dark:border-blue-300" />
                  )}
                  <span className={"font-semibold text-[11px] sm:text-sm lg:text-base leading-none " + (isCur ? "text-white" : "text-slate-900 dark:text-white")}>
                    {i}
                  </span>
                  <span
                    className={
                      "mt-0.5 text-[7px] sm:text-[9px] leading-none " +
                      (isCur
                        ? "text-white/90"
                        : isMax
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isMin
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-500 dark:text-zinc-400")
                    }
                  >
                    {p.toFixed(1)}%
                  </span>
                  {isCur && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-blue-600 dark:text-blue-300">
                      LIVE
                    </span>
                  )}
                  {isSel && !isCur && (
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-orange-500 text-[10px]">▼</span>
                  )}
                </button>
              );
            })}
      </div>
    </div>
  );
}
