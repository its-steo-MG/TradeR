// components/agents/copy-button.tsx
"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export default function CopyButton({ text, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy. Please try manually.");
    }
  };

  if (!text.trim()) return null;

  return (
    <button
      onClick={handleCopy}
      disabled={copied}
      className={`
        drop-on-top relative p-1.5 rounded-md
        bg-white/40 dark:bg-white/10 backdrop-blur-md hover:bg-white/50 dark:hover:bg-white/10 dark:bg-zinc-700 active:bg-slate-300
        transition-colors flex items-center justify-center
        ${className} ${copied ? "cursor-default" : ""}
      `}
      aria-label={`Copy ${label}`}
    >
      <span className="relative z-[1]">
        {copied ? (
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-300 dark:text-emerald-400" />
        ) : (
          <Copy className="w-4 h-4 text-slate-600 dark:text-zinc-300" />
        )}
      </span>
    </button>
  );
}