// components/wallet/transaction-detail-modal.tsx
"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format-currency";
import { type WalletTransaction } from "@/lib/api";
import Image from "next/image";

interface TransactionDetailModalProps {
  transaction: WalletTransaction;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const txType = transaction.transaction_type.toLowerCase();

  // Determine icon based on transaction type (keeps your original for deposit/withdrawal)
  const flagSrc = (() => {
    if (txType === "deposit") return "/real-account-icon.png";
    if (txType === "withdrawal") return "/transaction-icon.png";
    if (txType === "transfer_in") return "/transfer-in-icon.png";   // New icon for received transfer
    if (txType === "transfer_out") return "/transfer-in-icon.png"; // New icon for sent transfer
    return "/transaction-icon.png"; // fallback
  })();

  // Determine title
  const title = txType === "deposit" 
    ? "DEPOSIT" 
    : txType === "withdrawal" 
    ? "WITHDRAW" 
    : txType === "transfer_in" 
    ? "RECEIVED" 
    : txType === "transfer_out" 
    ? "SENT" 
    : "TRANSACTION";

  // Amount logic - unchanged for deposit/withdrawal, adapted for transfers (USD only, with sign)
  let primaryAmount: string;
  let secondaryAmount: string = "";

  if (txType === "transfer_in" || txType === "transfer_out") {
    const amount = transaction.amount || transaction.converted_amount || 0;
    const sign = txType === "transfer_in" ? "+" : "-";
    primaryAmount = `${sign}$${formatCurrency(amount)}`;
  } else {
    primaryAmount = txType === "deposit" 
      ? `${formatCurrency(transaction.amount)} ${transaction.currency.code}` 
      : `$${formatCurrency(transaction.amount)}`;

    secondaryAmount = txType === "deposit" 
      ? `$${formatCurrency(transaction.converted_amount || 0)}` 
      : `- ${formatCurrency(transaction.converted_amount || 0)} ${transaction.target_currency?.code || "KSH"}`;
  }

  const derivId = transaction.reference_id 
    ? transaction.reference_id.replace("WT-", "").replace("TR-", "") 
    : "N/A";
  const mpesaId = transaction.checkout_request_id || "UB..";

  const formattedDate = new Date(transaction.created_at).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 mx-4">
        
        {/* Header - unchanged */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
            aria-label="Go back"
          >
            <span className="text-2xl font-bold text-slate-900">&lt;</span>
          </button>

          <p className="text-sm font-medium text-slate-600">{formattedDate}</p>

          <div className="w-10 h-10" />
        </div>

        {/* Detail Card - design unchanged */}
        <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            {title}
          </h3>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden">
            <Image src={flagSrc} alt="Flag" width={64} height={64} className="object-cover" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mb-2">{primaryAmount}</p>
          {secondaryAmount && (
            <p className="text-xl font-bold text-slate-900 mb-6">{secondaryAmount}</p>
          )}
          <p className="text-sm text-slate-600">TRADERISER ID: {derivId}</p>
          {(txType === "deposit" || txType === "withdrawal") && (
            <p className="text-sm text-green-600 bg-green-50 inline-block px-3 py-1 rounded-full mt-2">
              M-PESA ID: {mpesaId}
            </p>
          )}
        </div>

        {message && (
          <p className={message.type === "error" ? "text-red-600" : "text-green-600"}>{message.text}</p>
        )}
      </div>
    </div>
  );
}