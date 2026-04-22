"use client";
import type { Tick } from "./ticks";

/**
 * Compute % occurrence of each digit (0-9) over the last `window` ticks.
 * Default 100; supported windows shown in DigitStrip selector: 50/100/500/1000.
 */
export function digitStats(ticks: Tick[], window = 100) {
  const slice = ticks.slice(-window);
  const counts = new Array(10).fill(0);
  slice.forEach((t) => counts[t.lastDigit]++);
  const total = slice.length || 1;
  const pct = counts.map((c) => +((c / total) * 100).toFixed(1));
  let maxIdx = 0;
  let minIdx = 0;
  pct.forEach((v, i) => {
    if (v > pct[maxIdx]) maxIdx = i;
    if (v < pct[minIdx]) minIdx = i;
  });
  return { pct, maxIdx, minIdx };
}
