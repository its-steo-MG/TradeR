"use client";

import type { StatementEntry } from "@/lib/types/positions";

type Props = { entries: StatementEntry[] };

function fmtDateTime(ts: number) {
  const d = new Date(ts);
  const date = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  return { date, time };
}

function actionLabel(a: StatementEntry["action"]) {
  if (a === "buy") return "Buy";
  if (a === "sell") return "Sell";
  return "Adjustment";
}

function actionClass(a: StatementEntry["action"]) {
  if (a === "buy") return "bg-rose-500/15 text-rose-400 border-rose-500/30";
  if (a === "sell")
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  return "bg-slate-700/40 text-slate-300 border-slate-700";
}

export default function Statement({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 py-12 text-center">
        <div className="text-slate-500 text-sm">No transactions yet</div>
        <div className="text-slate-600 text-xs mt-1">
          Every buy and sell will appear here
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header row (table-like) */}
      <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-[10px] tracking-wider font-semibold text-slate-500 uppercase border-b border-slate-800">
        <div className="col-span-2">Date</div>
        <div className="col-span-2">Ref</div>
        <div className="col-span-1">Action</div>
        <div className="col-span-3">Description</div>
        <div className="col-span-1 text-right">Credit</div>
        <div className="col-span-1 text-right">Debit</div>
        <div className="col-span-2 text-right">Balance</div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 divide-y divide-slate-800">
        {entries.map((e) => {
          const { date, time } = fmtDateTime(e.timestamp);
          return (
            <div
              key={e.id}
              className="px-3 py-2.5 md:grid md:grid-cols-12 md:gap-2 md:items-center"
            >
              {/* Mobile card */}
              <div className="md:hidden flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${actionClass(e.action)}`}
                    >
                      {actionLabel(e.action)}
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      {e.refId}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 truncate mt-1">
                    {e.description}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {date} {time}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {e.credit > 0 && (
                    <div className="text-sm font-semibold tabular-nums text-emerald-400">
                      +${e.credit.toFixed(2)}
                    </div>
                  )}
                  {e.debit > 0 && (
                    <div className="text-sm font-semibold tabular-nums text-rose-400">
                      -${e.debit.toFixed(2)}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 tabular-nums">
                    Bal ${e.balance.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Desktop row */}
              <div className="hidden md:block col-span-2 text-xs text-slate-400 font-mono">
                <div>{date}</div>
                <div className="text-slate-500">{time}</div>
              </div>
              <div className="hidden md:block col-span-2 text-xs text-slate-300 font-mono truncate">
                {e.refId}
              </div>
              <div className="hidden md:block col-span-1">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${actionClass(e.action)}`}
                >
                  {actionLabel(e.action)}
                </span>
              </div>
              <div className="hidden md:block col-span-3 text-xs text-slate-200 truncate">
                {e.description}
              </div>
              <div className="hidden md:block col-span-1 text-right text-xs tabular-nums text-emerald-400">
                {e.credit > 0 ? `+$${e.credit.toFixed(2)}` : "—"}
              </div>
              <div className="hidden md:block col-span-1 text-right text-xs tabular-nums text-rose-400">
                {e.debit > 0 ? `-$${e.debit.toFixed(2)}` : "—"}
              </div>
              <div className="hidden md:block col-span-2 text-right text-xs font-semibold tabular-nums text-slate-200">
                ${e.balance.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
