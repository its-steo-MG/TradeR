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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 max-w-md w-full border border-slate-700/50 shadow-2xl animate-in fade-in scale-in duration-300">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6m0 0L7 12m6-6l6 6" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Withdraw Funds</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Amount ($)</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition placeholder:text-slate-500"
            />
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Minimum Withdrawal</p>
            <p className="text-red-400 font-bold">$50.00</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg font-semibold text-slate-300 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={isLoading || !amount}
              className="flex-1 px-4 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing...
                </>
              ) : (
                "Withdraw"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
