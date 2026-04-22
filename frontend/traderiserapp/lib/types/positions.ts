// lib/types/positions.ts
// Shared types for the Positions panel (Open / Closed / Statement).

export type DigitContractKind =
  | "over"
  | "under"
  | "matches"
  | "differs"
  | "even"
  | "odd";

export type PositionOutcome = "W" | "L";

export interface OpenPosition {
  id: string;                    // client-generated uuid
  refId: string;                 // short ref shown in table, e.g. "DGT-284913"
  contractKind: DigitContractKind;
  barrier?: number;              // undefined for even/odd
  stake: number;
  potentialPayout: number;       // stake * multiplier
  multiplier: number;
  entrySpot: number;             // price at entry
  entryDigit: number;            // last digit at entry
  marketId: number | null;
  marketName: string;
  accountType: string;           // "demo" | "standard"
  createdAt: number;             // Date.now()
  isAuto: boolean;               // part of an auto-trade run
}

export interface ClosedPosition extends Omit<OpenPosition, "potentialPayout"> {
  exitSpot: number;
  exitDigit: number;
  outcome: PositionOutcome;
  profit: number;                // +payout-stake (win) or -stake (loss)
  payout: number;                // amount credited back (0 on loss)
  closedAt: number;
}

export type StatementAction =
  | "buy"          // stake debited
  | "sell"         // payout credited (win only; losses show no sell row)
  | "adjustment";  // reserved

export interface StatementEntry {
  id: string;
  refId: string;
  action: StatementAction;
  description: string;           // e.g. "Over 5 · Volatility 10 (1s)"
  credit: number;                // +amount credited
  debit: number;                 // +amount debited
  balance: number;               // running balance AFTER this row
  timestamp: number;
  contractKind?: DigitContractKind;
  barrier?: number;
  accountType: string;
}
