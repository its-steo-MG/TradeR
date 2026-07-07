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
      <div className="space-y-3 bg-amber-50 p-4 rounded-lg border border-amber-200">
        <p className="text-sm font-bold text-amber-900">Binance Deposit Details</p>
        {agent.binance_address ? (
          <div className="bg-white p-4 rounded border border-amber-100">
            <p className="text-xs text-amber-700 font-medium mb-1">Send USDT to this Address</p>
            <p className="font-mono text-sm break-all text-amber-800">{agent.binance_address}</p>
            <CopyButton text={agent.binance_address} label="Address" className="mt-2" />
            <p className="text-xs text-amber-600 mt-2">
              • Usually USDT (BEP20) or USDT (ERC20)<br/>
              • Send exact amount and save Tx Hash
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">No Binance address provided</p>
        )}
      </div>
    )
  }

  // PAYPAL
  if (lowerMethod === "paypal") {
    return (
      <div className="space-y-3 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
        <p className="text-sm font-bold text-indigo-900">PayPal Payment Details</p>
        {agent.paypal_email && (
          <div className="flex items-center justify-between gap-2 bg-white p-3 rounded border border-indigo-100">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-indigo-700 font-medium">PayPal Email</p>
              <p className="text-sm font-mono text-indigo-600 truncate">{agent.paypal_email}</p>
            </div>
            <CopyButton text={agent.paypal_email} label="Email" />
          </div>
        )}
        {agent.paypal_link && (
          <div className="flex items-center justify-between gap-2 bg-white p-3 rounded border border-indigo-100">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-indigo-700 font-medium">PayPal Link</p>
              <a href={agent.paypal_link} target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-indigo-600 underline truncate block">
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
      <div className="space-y-3 bg-emerald-50 p-4 rounded-lg border border-emerald-200">
        <p className="text-sm font-bold text-emerald-900">Bank Transfer Details</p>
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
      <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm font-bold text-blue-900">M-Pesa Payment</p>
        {agent.mpesa_phone && (
          <div className="flex items-center justify-between gap-2 bg-white p-3 rounded border border-blue-100">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-700 font-medium">Phone Number</p>
              <p className="text-sm font-mono text-blue-600">{agent.mpesa_phone}</p>
            </div>
            <CopyButton text={agent.mpesa_phone} label="Phone" />
          </div>
        )}
      </div>
    )
  }

  return <p className="text-xs text-gray-500">No payment details available</p>
}

// Reusable components
function InfoRow({ label, value, copy = false }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-white p-3 rounded border border-emerald-100">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-emerald-700 font-medium">{label}</p>
        <p className="text-sm font-mono text-emerald-600 break-all">{value}</p>
      </div>
      {copy && <CopyButton text={value} label={label.split(" ")[0]} />}
    </div>
  )
}