import { cn } from "@/lib/utils";
import type { ContractKind } from "@/lib/contracts";

export function ContractBadge({
  kind,
  barrier,
  size = "md",
  pulse = false,
}: {
  kind: ContractKind;
  barrier?: number;
  size?: "sm" | "md";
  pulse?: boolean;
}) {
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  const config = (() => {
    switch (kind) {
      case "even":
        return { label: "E", bg: "bg-sky-100 text-sky-700 ring-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-700", title: "Even" };
      case "odd":
        return { label: "O", bg: "bg-violet-100 text-violet-700 ring-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-700", title: "Odd" };
      case "over":
        return {
          label: (
            <span className="flex items-center gap-0.5 leading-none">
              <span className="text-[0.65em]">▲</span>
              <span className="font-mono">{barrier ?? 0}</span>
            </span>
          ),
          bg: "bg-emerald-100 text-emerald-700 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-700",
          title: `Over ${barrier ?? 0}`,
        };
      case "under":
        return {
          label: (
            <span className="flex items-center gap-0.5 leading-none">
              <span className="text-[0.65em]">▼</span>
              <span className="font-mono">{barrier ?? 0}</span>
            </span>
          ),
          bg: "bg-rose-100 text-rose-700 ring-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-700",
          title: `Under ${barrier ?? 0}`,
        };
      case "matches":
        return {
          label: (
            <span className="flex items-center gap-0.5 leading-none">
              <span className="text-xs">=</span>
              <span className="font-mono">{barrier ?? 0}</span>
            </span>
          ),
          bg: "bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-700",
          title: `Matches ${barrier ?? 0}`,
        };
      case "differs":
        return {
          label: (
            <span className="flex items-center gap-0.5 leading-none">
              <span className="text-xs">≠</span>
              <span className="font-mono">{barrier ?? 0}</span>
            </span>
          ),
          bg: "bg-indigo-100 text-indigo-700 ring-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-700",
          title: `Differs ${barrier ?? 0}`,
        };
      case "rise":
        return { label: "R", bg: "bg-cyan-100 text-cyan-700 ring-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:ring-cyan-700", title: "Rise" };
      case "fall":
        return { label: "F", bg: "bg-orange-100 text-orange-700 ring-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-700", title: "Fall" };
      default:
        return { label: "?", bg: "bg-slate-100 text-slate-600 ring-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700", title: String(kind) };
    }
  })();

  return (
    <div
      title={config.title}
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl ring-1 font-semibold shrink-0",
        dim,
        config.bg,
      )}
    >
      {config.label}
      {pulse && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        </span>
      )}
    </div>
  );
}
