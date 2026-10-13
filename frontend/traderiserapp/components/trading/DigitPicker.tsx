"use client";

type Props = {
  digits: number[];
  selected: number;
  onSelect: (d: number) => void;
  currentDigit?: number | null;
};

export default function DigitPicker({ digits, selected, onSelect, currentDigit = null }: Props) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {digits.map((d) => {
        const isCur = d === currentDigit;
        const isSel = selected === d;
        return (
          <button
            key={d}
            onClick={() => onSelect(d)}
            className={
              "relative h-10 rounded-md text-sm font-medium transition " +
              (isSel
                ? "bg-blue-600 text-white"
                : isCur
                  ? "bg-blue-100 text-blue-700 border-2 border-blue-600 shadow-[0_0_0_3px_rgba(37,99,235,0.25)] dark:bg-blue-950 dark:text-blue-200 dark:border-blue-400"
                  : "bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200 dark:bg-zinc-800 dark:text-white dark:border-zinc-700")
            }
          >
            <span className="relative z-[1]">{d}</span>
            {isCur && (
              <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-blue-600 dark:bg-blue-300" />
            )}
          </button>
        );
      })}
    </div>
  );
}
