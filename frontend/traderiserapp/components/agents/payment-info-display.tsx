"use client"

import CopyButton from "./copy-button"

interface PaymentInfoDisplayProps {
  method: string
  agent: {
    paypal_email?: string
    paypal_link?: string
    bank_name?: string
    bank_account_name?: string
    bank_account_number?: string
    bank_swift?: string
    mpesa_phone?: string
    binance_address?: string          // ← NEW
  }
}

export default function PaymentInfoDisplay({ method, agent }: PaymentInfoDisplayProps) {
  const lowerMethod = method.toLowerCase()

  // BINANCE - NEW
  if (lowerMethod === "binance") {
    return (
      <div className="space-y-3 bg-amber-500/10 dark:bg-amber-500/15 backdrop-blur-md p-4 rounded-lg border border-amber-200 dark:border-amber-800">
        <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Binance Deposit Details</p>
        {agent.binance_address ? (
          <div className="bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl p-4 rounded border border-amber-100 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Send USDT to this Address</p>
            <p className="font-mono text-sm break-all text-amber-800 dark:text-amber-200">{agent.binance_address}</p>
            <CopyButton text={agent.binance_address} label="Address" className="mt-2" />
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-2">
              • Usually USDT (BEP20) or USDT (ERC20)<br/>
              • Send exact amount and save Tx Hash
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-zinc-400 italic">No Binance address provided</p>
        )}
      </div>
    )
  }

  // PAYPAL
  if (lowerMethod === "paypal") {
    return (
      <div className="space-y-3 bg-indigo-500/10 dark:bg-indigo-500/15 backdrop-blur-md p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">PayPal Payment Details</p>
        {agent.paypal_email && (
          <div className="flex items-center justify-between gap-2 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl p-3 rounded border border-indigo-100 dark:border-indigo-800">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">PayPal Email</p>
              <p className="text-sm font-mono text-indigo-600 dark:text-indigo-300 truncate">{agent.paypal_email}</p>
            </div>
            <CopyButton text={agent.paypal_email} label="Email" />
          </div>
        )}
        {agent.paypal_link && (
          <div className="flex items-center justify-between gap-2 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl p-3 rounded border border-indigo-100 dark:border-indigo-800">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">PayPal Link</p>
              <a href={agent.paypal_link} target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-indigo-600 dark:text-indigo-300 underline truncate block">
                {agent.paypal_link}
              </a>
            </div>
            <CopyButton text={agent.paypal_link} label="Link" />
          </div>
        )}
      </div>
    )
  }

  // BANK TRANSFER
  if (lowerMethod === "bank_transfer" || lowerMethod === "bank") {
    return (
      <div className="space-y-3 bg-emerald-500/10 dark:bg-emerald-500/15 backdrop-blur-md p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Bank Transfer Details</p>
        {agent.bank_name && <InfoRow label="Bank Name" value={agent.bank_name} />}
        {agent.bank_account_name && <InfoRow label="Account Name" value={agent.bank_account_name} />}
        {agent.bank_account_number && <InfoRow label="Account Number" value={agent.bank_account_number} copy />}
        {agent.bank_swift && <InfoRow label="SWIFT Code" value={agent.bank_swift} copy />}
      </div>
    )
  }

  // M-PESA
  if (lowerMethod === "mpesa") {
    return (
      <div className="space-y-3 bg-blue-500/10 dark:bg-blue-500/15 backdrop-blur-md p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm font-bold text-blue-900 dark:text-blue-100">M-Pesa Payment</p>
        {agent.mpesa_phone && (
          <div className="flex items-center justify-between gap-2 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl p-3 rounded border border-blue-100 dark:border-blue-800">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Phone Number</p>
              <p className="text-sm font-mono text-blue-600 dark:text-blue-300">{agent.mpesa_phone}</p>
            </div>
            <CopyButton text={agent.mpesa_phone} label="Phone" />
          </div>
        )}
      </div>
    )
  }

  return <p className="text-xs text-slate-500 dark:text-zinc-400">No payment details available</p>
}

// Reusable components
function InfoRow({ label, value, copy = false }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl p-3 rounded border border-emerald-100 dark:border-emerald-800">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">{label}</p>
        <p className="text-sm font-mono text-emerald-600 dark:text-emerald-300 break-all">{value}</p>
      </div>
      {copy && <CopyButton text={value} label={label.split(" ")[0]} />}
    </div>
  )
}