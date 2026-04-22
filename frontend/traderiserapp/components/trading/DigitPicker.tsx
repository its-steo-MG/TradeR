"use client";

type Props = { digits: number[]; selected: number; onSelect: (d: number) => void; };

export default function DigitPicker({ digits, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {digits.map((d) => (
        <button
          key={d}
          onClick={() => onSelect(d)}
          className={`h-10 rounded-md text-sm font-medium transition ${
            selected === d
              ? "bg-blue-500 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >{d}</button>
      ))}
    </div>
  );
}
