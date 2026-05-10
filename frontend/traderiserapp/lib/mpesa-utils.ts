// lib/mpesa-utils.ts

interface TransactionForMpesaId {
  created_at: string;
  reference_id?: string;
  reference?: string;
  id?: string | number;
}

export function generateFakeMpesaReceipt(transaction: TransactionForMpesaId): string {
  if (!transaction?.created_at) {
    return "MPESA-UNKNOWN";
  }

  const createdDate = new Date(transaction.created_at);

  // Year letter: A=2006, B=2007, ..., U=2026, ...
  const yearOffset = createdDate.getFullYear() - 2005;
  const yearChar =
    yearOffset >= 1 && yearOffset <= 26
      ? String.fromCharCode(64 + yearOffset)
      : "Z";

  // Month letter: A=Jan, B=Feb, C=Mar, ...
  const monthChar = String.fromCharCode(64 + createdDate.getMonth() + 1);

  // Day part: 1-9 → digit, 10-31 → A-V
  const dayNum = createdDate.getDate();
  let dayChar: string;
  if (dayNum >= 1 && dayNum <= 9) {
    dayChar = dayNum.toString();
  } else if (dayNum >= 10 && dayNum <= 31) {
    dayChar = String.fromCharCode(64 + dayNum - 9);
  } else {
    dayChar = "A";
  }

  const datePrefix = yearChar + monthChar + dayChar;

  // Deterministic suffix from reference_id or reference
  const seed =
    transaction.reference_id ||
    transaction.reference ||
    transaction.id?.toString() ||
    "default";

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 7; i++) {
    hash = (hash * 31 + i) >>> 0;
    suffix += chars[hash % chars.length];
  }

  return datePrefix + suffix;
}