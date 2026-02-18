// components/agents/payment-info-display.tsx
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
  }
}

export default function PaymentInfoDisplay({ method, agent }: PaymentInfoDisplayProps) {
  const lowerMethod = method.toLowerCase()

  // PAYPAL
  if (lowerMethod === "paypal") {
    return (
      <div className="space-y-3 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
        <p className="text-sm font-bold text-indigo-900">PayPal Payment Details</p>

        {/* PayPal Email */}
        {agent.paypal_email ? (
          <div className="flex items-center justify-between gap-2 bg-white p-3 rounded border border-indigo-100">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-indigo-700 font-medium">PayPal Email</p>
              <p className="text-sm font-mono text-indigo-600 truncate">{agent.paypal_email}</p>
            </div>
            <CopyButton text={agent.paypal_email} label="Email" />
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">No PayPal email provided</p>
        )}

        {/* PayPal Link (if any) */}
        {agent.paypal_link && (
          <div className="flex items-center justify-between gap-2 bg-white p-3 rounded border border-indigo-100">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-indigo-700 font-medium">PayPal Link</p>
              <a
                href={agent.paypal_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-indigo-600 underline truncate block"
              >
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

        {/* Bank Name */}
        {agent.bank_name ? (
          <InfoRow label="Bank Name" value={agent.bank_name} />
        ) : (
          <MissingField label="Bank Name" />
        )}

        {/* Account Name */}
        {agent.bank_account_name ? (
          <InfoRow label="Account Name" value={agent.bank_account_name} />
        ) : (
          <MissingField label="Account Name" />
        )}

        {/* Account Number */}
        {agent.bank_account_number ? (
          <InfoRow label="Account Number" value={agent.bank_account_number} copy />
        ) : (
          <MissingField label="Account Number" />
        )}

        {/* SWIFT Code */}
        {agent.bank_swift ? (
          <InfoRow label="SWIFT Code" value={agent.bank_swift} copy />
        ) : (
          <MissingField label="SWIFT Code" />
        )}
      </div>
    )
  }

  // M-PESA
  if (lowerMethod === "mpesa") {
    return (
      <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm font-bold text-blue-900">M-Pesa Payment</p>

        {agent.mpesa_phone ? (
          <div className="flex items-center justify-between gap-2 bg-white p-3 rounded border border-blue-100">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-700 font-medium">Payment Details</p>
              <p className="text-sm font-mono text-blue-600">{agent.mpesa_phone}</p>
            </div>
            <CopyButton text={agent.mpesa_phone} label="Phone" />
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">No M-Pesa number provided</p>
        )}
      </div>
    )
  }

  return <p className="text-xs text-gray-500">No payment details available</p>
}

// Reusable Row Component
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

// Missing Field Fallback
function MissingField({ label }: { label: string }) {
  return (
    <p className="text-xs text-gray-500 italic p-2 bg-white rounded border border-emerald-100">
      {label}: Not provided
    </p>
  )
}