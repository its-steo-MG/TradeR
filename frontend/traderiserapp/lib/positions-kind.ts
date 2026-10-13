// Add "rise" | "fall" to DigitContractKind in lib/types/positions.ts

export type DigitContractKind =
  | "matches"
  | "differs"
  | "even"
  | "odd"
  | "over"
  | "under"
  | "rise"
  | "fall";
