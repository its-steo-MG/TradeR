// lib/positionsStore.ts
// Client-only persistence layer for Open / Closed / Statement.
// Stores per-account-type in localStorage so demo and standard stay separate.

"use client";

import type {
  OpenPosition,
  ClosedPosition,
  StatementEntry,
} from "@/lib/types/positions";

const OPEN_KEY = "dgt_open_positions";
const CLOSED_KEY = "dgt_closed_positions";
const STATEMENT_KEY = "dgt_statement";
const MAX_CLOSED = 500;
const MAX_STATEMENT = 1000;

// ---------- helpers ----------

const read = <T,>(key: string): T[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
};

const write = <T,>(key: string, value: T[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("positions-updated"));
  } catch (e) {
    console.error("positionsStore write failed:", e);
  }
};

export const newRefId = () =>
  "DGT-" + Math.floor(100000 + Math.random() * 900000).toString();

export const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ---------- OPEN ----------

export const getOpen = (): OpenPosition[] => read<OpenPosition>(OPEN_KEY);

export const addOpen = (p: OpenPosition) => {
  const list = getOpen();
  list.unshift(p);
  write(OPEN_KEY, list);
};

export const removeOpen = (id: string): OpenPosition | null => {
  const list = getOpen();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const [removed] = list.splice(idx, 1);
  write(OPEN_KEY, list);
  return removed;
};

export const clearOpen = () => write(OPEN_KEY, []);

// ---------- CLOSED ----------

export const getClosed = (): ClosedPosition[] =>
  read<ClosedPosition>(CLOSED_KEY);

export const addClosed = (p: ClosedPosition) => {
  const list = getClosed();
  list.unshift(p);
  if (list.length > MAX_CLOSED) list.length = MAX_CLOSED;
  write(CLOSED_KEY, list);
};

// ---------- STATEMENT ----------

export const getStatement = (): StatementEntry[] =>
  read<StatementEntry>(STATEMENT_KEY);

export const addStatement = (entry: StatementEntry) => {
  const list = getStatement();
  list.unshift(entry);
  if (list.length > MAX_STATEMENT) list.length = MAX_STATEMENT;
  write(STATEMENT_KEY, list);
};

// ---------- high-level helpers ----------

/**
 * Record a trade being placed: adds an Open position AND a Buy statement row.
 */
export function recordBuy(args: {
  open: OpenPosition;
  balanceAfter: number;
}): StatementEntry {
  addOpen(args.open);
  const entry: StatementEntry = {
    id: newId(),
    refId: args.open.refId,
    action: "buy",
    description: descFor(args.open.contractKind, args.open.barrier, args.open.marketName),
    credit: 0,
    debit: args.open.stake,
    balance: args.balanceAfter,
    timestamp: args.open.createdAt,
    contractKind: args.open.contractKind,
    barrier: args.open.barrier,
    accountType: args.open.accountType,
  };
  addStatement(entry);
  return entry;
}

/**
 * Settle an open position: remove from Open, add to Closed.
 * If win, also add a Sell statement row (payout credit).
 */
export function recordSettlement(args: {
  openId: string;
  exitSpot: number;
  exitDigit: number;
  outcome: "W" | "L";
  payout: number;       // credited on win (stake * multiplier), 0 on loss
  profit: number;       // net P/L
  balanceAfter: number; // running balance AFTER this settlement
}): { closed: ClosedPosition | null; sellEntry: StatementEntry | null } {
  const open = removeOpen(args.openId);
  if (!open) return { closed: null, sellEntry: null };

  const closed: ClosedPosition = {
    ...open,
    exitSpot: args.exitSpot,
    exitDigit: args.exitDigit,
    outcome: args.outcome,
    profit: args.profit,
    payout: args.payout,
    closedAt: Date.now(),
  };
  addClosed(closed);

  let sellEntry: StatementEntry | null = null;
  if (args.outcome === "W" && args.payout > 0) {
    sellEntry = {
      id: newId(),
      refId: open.refId,
      action: "sell",
      description:
        descFor(open.contractKind, open.barrier, open.marketName) + " · Won",
      credit: args.payout,
      debit: 0,
      balance: args.balanceAfter,
      timestamp: closed.closedAt,
      contractKind: open.contractKind,
      barrier: open.barrier,
      accountType: open.accountType,
    };
    addStatement(sellEntry);
  }
  return { closed, sellEntry };
}

export function descFor(
  kind: string,
  barrier: number | undefined,
  market: string,
): string {
  const label =
    kind === "over" ? `Over ${barrier}` :
    kind === "under" ? `Under ${barrier}` :
    kind === "matches" ? `Matches ${barrier}` :
    kind === "differs" ? `Differs ${barrier}` :
    kind === "even" ? "Even" :
    kind === "odd" ? "Odd" : kind;
  return `${label} · ${market}`;
}

export function clearAll() {
  write(OPEN_KEY, []);
  write(CLOSED_KEY, []);
  write(STATEMENT_KEY, []);
}

// ==================== NEW: Account Type Helper ====================
// This was missing, causing the "getAccountType is not a function" error
export const getAccountType = (): string => {
  if (typeof window === "undefined") {
    return "standard"; // safe fallback on server
  }
  return localStorage.getItem("account_type") || "standard";
};