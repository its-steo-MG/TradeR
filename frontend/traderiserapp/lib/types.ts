import type { ContractKind } from "./contracts";

export type Transaction = {
  id: string;
  contractKind: ContractKind;
  barrier?: number;
  market: string;
  entrySpot: number;
  exitSpot: number;
  buyPrice: number;
  payout: number; // gross payout if win
  pnl: number;   // net P/L (negative = loss)
  isWin: boolean;
  runIndex: number;
  martingaleLevel: number;
  timestamp: number;
  /** True while the trade is open (entry shown, awaiting exit/settlement). */
  isOpen?: boolean;
  /** Last digit revealed at settlement (for digit contracts). */
  exitDigit?: number;
};

export type RobotConfig = {
  market: string;
  contractKind: ContractKind;
  barrier?: number;
  initialStake: number;
  multiplier: number;
  targetProfit: number;
  stopLoss: number;
  maxRuns: number;
};
