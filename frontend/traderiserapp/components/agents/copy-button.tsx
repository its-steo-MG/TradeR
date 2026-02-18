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
    } catch (err) {
      toast.error("Failed to copy. Please try manually.");
    }
  };

  // Hide button if no text (prevents empty divs)
  if (!text.trim()) {
    return null;
  }

  return (
    <button
      onClick={handleCopy}
      disabled={copied}
      className={`p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors flex items-center justify-center ${className} ${copied ? 'cursor-default' : ''}`}
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4 text-slate-600" />
      )}
    </button>
  );
}