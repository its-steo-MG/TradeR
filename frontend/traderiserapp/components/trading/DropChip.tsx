"use client";

import { DropRipple, useDropRipple } from "@/components/ui/button";

/**
 * Selectable digit / option chip.
 * Keeps whatever colour you pass in `toneClass`; the selection is shown
 * as a clear water drop landing on top of it.
 */
export function DropChip({
  children,
  selected,
  onClick,
  toneClass = "bg-slate-700/80 text-white",
  className = "",
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  toneClass?: string;
  className?: string;
}) {
  const ripple = useDropRipple(selected);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected || undefined}
      className={`drop-on-top ${selected ? "drop-selected" : ""} inline-flex items-center justify-center h-12 min-w-12 rounded-2xl px-3 text-sm font-bold ${toneClass} ${className}`}
    >
      <span className="relative z-[1]">{children}</span>
      {selected ? <DropRipple trigger={ripple} /> : null}
    </button>
  );
}

export default DropChip;
