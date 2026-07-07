"use client";

type Props = { history: ("T" | "W" | "L")[]; netPnl: number };

export default function HistoryStrip({ history, netPnl }: Props) {
  const total = history.length;
  const w = history.filter((x) => x === "W").length;
  const l = history.filter((x) => x === "L").length;
  const winRate = total > 0 ? Math.round((w / total) * 100) : 0;

  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 px-4 py-3">
      <div className="flex items-center gap-3 text-xs">
        <span className="font-semibold text-slate-300 tracking-wider">
          LAST {total}
        </span>
        <span className="text-emerald-400 font-semibold">{w}W</span>
        <span className="text-slate-600">·</span>
        <span className="text-rose-400 font-semibold">{l}L</span>
        {total > 0 && (
          <>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{winRate}%</span>
          </>
        )}
      </div>
      <div
        className={`text-base font-semibold tabular-nums ${
          netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {netPnl >= 0 ? "+" : ""}${netPnl.toFixed(2)}
      </div>
    </div>
  );
}
