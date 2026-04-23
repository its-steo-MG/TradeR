import { cn } from "@/lib/utils";
import type { ContractKind } from "@/lib/contracts";

/**
 * Deriv-style contract identifier badge.
 *
 * Even/Odd  -> E / O chip (no arrows — arrows imply direction which is wrong here)
 * Over      -> ▲ {n}  (digit must be GREATER than n)
 * Under     -> ▼ {n}  (digit must be LESS than n)
 * Matches   -> = {n}
 * Differs   -> ≠ {n}
 */
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
  // Make it smaller on mobile / tight spaces
  const dim = size === "sm" 
    ? "h-7 w-7 text-[10px]" 
    : "h-9 w-9 text-xs";   // ← was h-10 w-10 text-sm

  const config = (() => {
    switch (kind) {
      case "even":
        return { label: "E", bg: "bg-contract-even/15 text-contract-even ring-contract-even/40", title: "Even" };
      case "odd":
        return { label: "O", bg: "bg-contract-odd/15 text-contract-odd ring-contract-odd/40", title: "Odd" };
      case "over":
        return {
          label: (
            <span className="flex items-center gap-0.5 leading-none">
              <span className="text-[0.65em]">▲</span>
              <span className="font-mono">{barrier ?? 0}</span>
            </span>
          ),
          bg: "bg-contract-over/15 text-contract-over ring-contract-over/40",
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
          bg: "bg-contract-under/15 text-contract-under ring-contract-under/40",
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
          bg: "bg-contract-matches/15 text-contract-matches ring-contract-matches/40",
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
          bg: "bg-contract-differs/15 text-contract-differs ring-contract-differs/40",
          title: `Differs ${barrier ?? 0}`,
        };
      default:
        return { label: "?", bg: "bg-muted text-muted-foreground ring-border", title: String(kind) };
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