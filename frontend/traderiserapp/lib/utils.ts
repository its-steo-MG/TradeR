 import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
function generateFakeMpesaReceipt(now: Date = new Date()): string {
  // Year letter: A=2006, B=2007, ..., T=2025, U=2026, ...
  const yearOffset = now.getFullYear() - 2005;
  const yearChar = yearOffset >= 1 && yearOffset <= 26 
    ? String.fromCharCode(64 + yearOffset)   // 65=A → 85=U for 2026
    : 'Z';

  // Month letter: A=Jan, B=Feb, ..., C=Mar, ...
  const monthChar = String.fromCharCode(64 + now.getMonth() + 1);

  // Day part: 1-9 → '1'-'9', 10-31 → 'A' to 'V'
  const dayNum = now.getDate();
  let dayChar: string;
  if (dayNum >= 1 && dayNum <= 9) {
    dayChar = dayNum.toString();
  } else if (dayNum >= 10 && dayNum <= 31) {
    dayChar = String.fromCharCode(64 + dayNum - 9);  // 10→A, 11→B, ..., 31→V
  } else {
    dayChar = 'A';
  }

  const datePrefix = yearChar + monthChar + dayChar;

  // 7 random uppercase alphanumeric chars
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 7; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return datePrefix + suffix;  // e.g. "UCA7K9P2M" today
}