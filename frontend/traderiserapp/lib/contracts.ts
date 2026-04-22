// Mirrors backend payouts (Django views.py)
export type ContractKind =
  | "matches"
  | "differs"
  | "even"
  | "odd"
  | "over"
  | "under";

export function getPayout(kind: ContractKind, barrier?: number): number {
  if (kind === "matches") return 8.5;
  if (kind === "differs") return 1.12;
  if (kind === "even" || kind === "odd") return 1.92;

  if (kind === "over" && barrier !== undefined) {
    const overPayouts: Record<number, number> = {
      0: 1.096, 1: 1.232, 2: 1.35, 3: 1.404, 4: 1.65,
      5: 2.10, 6: 2.95, 7: 4.80, 8: 8.50, 9: 12.0,
    };
    return overPayouts[barrier] ?? 1.1;
  }

  if (kind === "under" && barrier !== undefined) {
    const underPayouts: Record<number, number> = {
      9: 1.096, 8: 1.18, 7: 1.40, 6: 1.85, 5: 2.70,
      4: 4.20, 3: 4.717, 2: 9.80, 1: 8.929, 0: 15.5,
    };
    return underPayouts[barrier] ?? 1.1;
  }

  return 1.92;
}

export function contractLabel(kind: ContractKind, barrier?: number): string {
  switch (kind) {
    case "matches": return `Matches ${barrier ?? 0}`;
    case "differs": return `Differs ${barrier ?? 0}`;
    case "even": return "Even";
    case "odd": return "Odd";
    case "over": return `Over ${barrier ?? 0}`;
    case "under": return `Under ${barrier ?? 0}`;
  }
}

// ✅ NEW: Accurate win condition checker for all digit contracts
// This ensures Over/Under, Matches/Differs, Even/Odd work correctly
export function isWinningDigit(
  kind: ContractKind,
  barrier: number | undefined,
  lastDigit: number
): boolean {
  if (kind === "even") return lastDigit % 2 === 0;
  if (kind === "odd") return lastDigit % 2 === 1;

  if (kind === "matches") return lastDigit === barrier;
  if (kind === "differs") return lastDigit !== barrier;

  if (kind === "over" && barrier !== undefined) {
    return lastDigit > barrier;           // e.g. Over 5 → 6,7,8,9 win
  }
  if (kind === "under" && barrier !== undefined) {
    return lastDigit < barrier;           // e.g. Under 5 → 0,1,2,3,4 win
  }

  return false;
}