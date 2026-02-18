"use client"

interface WithdrawModalProps {
  isOpen: boolean
  amount: string
  onAmountChange: (amount: string) => void
  onClose: () => void
  onSubmit: () => void
  isLoading: boolean
}

export function WithdrawModal({ isOpen, amount, onAmountChange, onClose, onSubmit, isLoading }: WithdrawModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6">Withdraw Funds</h2>
        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {isLoading ? "Processing..." : "Withdraw"}
          </button>
        </div>
      </div>
    </div>
  )
}