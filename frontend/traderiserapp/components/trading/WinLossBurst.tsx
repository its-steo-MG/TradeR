"use client";

import { useEffect, useState } from "react";

/**
 * Deriv-style win/loss flag marker.
 * Pins a small flag at the right edge of the chart (where the latest tick / "tip"
 * of the price line sits) showing the settled digit, plus a colored pulse so the
 * win/loss is obvious. Place inside the chart's `relative` container — it
 * absolutely fills the parent.
 *
 *  - WIN  → blue flag (Deriv blue)
 *  - LOSS → red flag
 *
 * Replay by passing a new `trigger.id`.
 */
type Props = {
  trigger:
    | { kind: "win" | "loss"; id: number; digit?: number | null }
    | null;
  /** How long the flag stays visible (ms). */
  durationMs?: number;
};

export default function WinLossBurst({ trigger, durationMs = 3200 }: Props) {
  const [active, setActive] = useState<Props["trigger"]>(null);

  useEffect(() => {
    if (!trigger) return;
    setActive(trigger);
    const t = setTimeout(() => setActive(null), durationMs);
    return () => clearTimeout(t);
  }, [trigger, durationMs]);

  if (!active) return null;

  const isWin = active.kind === "win";
  // Deriv-ish palette
  const flagColor = isWin ? "#2563eb" : "#ef4444"; // blue / red
  const ringColor = isWin ? "rgba(37,99,235,0.45)" : "rgba(239,68,68,0.45)";
  const label = isWin ? "WIN" : "LOSS";
  const digit = active.digit ?? null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {/* very subtle tint so the chart area reacts too */}
      <div
        className="absolute inset-0 animate-[wlb-flash_700ms_ease-out_forwards]"
        style={{ backgroundColor: isWin ? "rgba(37,99,235,0.06)" : "rgba(239,68,68,0.06)" }}
      />

      {/* Flag pinned to the tip of the chart line (right edge, vertically centered).
          The leader line + dot mimics Deriv's "current price" marker. */}
      <div
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 animate-[wlb-flag-in_420ms_cubic-bezier(.2,.9,.3,1.2)_forwards]"
        style={{ filter: `drop-shadow(0 4px 10px ${ringColor})` }}
      >
        {/* leader dot pulsing on the price tip */}
        <span className="relative flex h-3 w-3">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
            style={{ backgroundColor: flagColor }}
          />
          <span
            className="relative inline-flex h-3 w-3 rounded-full border-2 border-white"
            style={{ backgroundColor: flagColor }}
          />
        </span>

        {/* short leader line */}
        <span
          className="h-[2px] w-3"
          style={{ backgroundColor: flagColor }}
        />

        {/* the flag */}
        <div className="flex items-stretch">
          <div
            className="px-2.5 py-1 text-[11px] font-bold tracking-wider text-white rounded-l-md flex items-center gap-1.5"
            style={{ backgroundColor: flagColor }}
          >
            <span>{label}</span>
            {digit !== null && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-white/25 text-white text-[11px] font-mono">
                {digit}
              </span>
            )}
          </div>
          {/* triangular flag tail */}
          <div
            className="w-0 h-0"
            style={{
              borderTop: "12px solid transparent",
              borderBottom: "12px solid transparent",
              borderLeft: `10px solid ${flagColor}`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes wlb-flash {
          0% { opacity: 0; }
          25% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes wlb-flag-in {
          0%   { transform: translate(20px, -50%) scale(.7); opacity: 0; }
          60%  { transform: translate(0, -50%)    scale(1.08); opacity: 1; }
          100% { transform: translate(0, -50%)    scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
