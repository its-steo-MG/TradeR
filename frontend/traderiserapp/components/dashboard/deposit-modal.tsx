"use client";

interface DepositModalProps {
  isOpen: boolean;
  amount: string;
  onAmountChange: (amount: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function DepositModal({ isOpen, amount, onAmountChange, onClose, onSubmit, isLoading }: DepositModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
      <div className="liquid-glass w-full max-w-md rounded-[1.6rem] p-6">
        <h2 className="mb-5 text-xl font-bold">Deposit Funds</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Amount ($)</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="w-full rounded-xl border border-white/40 bg-white/60 px-4 py-3 text-foreground backdrop-blur-md dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <div className="rounded-xl border border-white/30 bg-white/40 p-3 text-sm dark:border-white/10 dark:bg-white/5">
            <span className="text-muted-foreground">Transaction fee</span>
            <p className="font-bold text-emerald-500">Free</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-liquid h-11 flex-1 text-sm">Cancel</button>
            <button onClick={onSubmit} disabled={isLoading || !amount} className="btn-liquid-primary h-11 flex-1 text-sm disabled:opacity-50">
              {isLoading ? "Processing..." : "Deposit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
