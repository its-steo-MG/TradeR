"use client";

type Props = { history: ("T" | "W" | "L")[]; netPnl: number };

export default function HistoryStrip({ history, netPnl }: Props) {
  const total = history.length;
  const w = history.filter((x) => x === "W").length;
  const l = history.filter((x) => x === "L").length;
  const winRate = total > 0 ? Math.round((w / total) * 100) : 0;

  return (
    <div className="flex items-center justify-between rounded-lg bg-card border border-border px-4 py-3">
      <div className="flex items-center gap-3 text-xs">
        <span className="font-semibold text-foreground tracking-wider">
          LAST {total}
        </span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
          {w}W
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-rose-600 dark:text-rose-400 font-semibold">
          {l}L
        </span>
        {total > 0 && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{winRate}%</span>
          </>
        )}
      </div>
      <div
        className={`text-base font-semibold tabular-nums ${
          netPnl >= 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}
      >
        {netPnl >= 0 ? "+" : ""}${netPnl.toFixed(2)}
      </div>
    </div>
  );
}