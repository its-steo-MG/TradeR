// components/wallet/transaction-detail-modal.tsx
"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format-currency";
import { type WalletTransaction } from "@/lib/api";
import Image from "next/image";
import { generateFakeMpesaReceipt } from "@/lib/mpesa-utils";

interface TransactionDetailModalProps {
  transaction: WalletTransaction;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  const txType = transaction.transaction_type.toLowerCase();

  const flagSrc = (() => {
    if (txType === "deposit") return "/real-account-icon.png";
    if (txType === "withdrawal") return "/transaction-icon.png";
    if (txType === "transfer_in" || txType === "transfer_out") return "/transfer-in-icon.png";
    return "/transaction-icon.png";
  })();

  const title =
    txType === "deposit" ? "DEPOSIT"
    : txType === "withdrawal" ? "WITHDRAW"
    : txType === "transfer_in" ? "RECEIVED"
    : txType === "transfer_out" ? "SENT"
    : "TRANSACTION";

  let primaryAmount: string;
  let secondaryAmount: string = "";

  const formatAmount = (amount: number | string, currencyCode: string = "USD") => {
    const num = Number(amount);
    if (currencyCode.toUpperCase() === "KES" || currencyCode.toUpperCase() === "KSH") {
      return `KSH ${num.toLocaleString("en-US")}`;
    }
    return `$${num.toLocaleString("en-US")}`;
  };

  if (txType === "transfer_in" || txType === "transfer_out") {
    const amount = transaction.amount || transaction.converted_amount || 0;
    const sign = txType === "transfer_in" ? "+" : "-";
    primaryAmount = `${sign}$${formatCurrency(amount)}`;
  } else {
    if (txType === "deposit") {
      primaryAmount = formatAmount(transaction.amount, transaction.currency?.code || "KES");
    } else {
      primaryAmount = `$${formatCurrency(transaction.amount)}`;
    }

    if (txType === "deposit" && transaction.converted_amount) {
      secondaryAmount = `$${formatCurrency(transaction.converted_amount)} USD`;
    } else if (txType === "withdrawal" && transaction.converted_amount) {
      secondaryAmount = `KSH ${formatCurrency(transaction.converted_amount)}`;
    }
  }

  const derivId = transaction.reference_id
    ? transaction.reference_id.replace("WT-", "").replace("TR-", "")
    : "N/A";

  const mpesaId = transaction.checkout_request_id
    ? transaction.checkout_request_id
    : generateFakeMpesaReceipt(transaction);

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
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <span className="text-2xl font-bold text-slate-900">&lt;</span>
          </button>

          <p className="text-sm font-medium text-slate-600">{formattedDate}</p>
          <div className="w-10 h-10" />
        </div>

        <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>
          
          <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden">
            <Image src={flagSrc} alt="Flag" width={64} height={64} className="object-cover" />
          </div>

          {/* Primary Amount - Bold & Large */}
          <p className="text-3xl font-bold text-slate-900 mb-1 tracking-tight">
            {primaryAmount}
          </p>
          
          {/* Secondary Amount - Semibold */}
          {secondaryAmount && (
            <p className="text-xl font-semibold text-slate-600 mb-6">
              {secondaryAmount}
            </p>
          )}

          <p className="text-sm text-slate-600">TRADERISER ID: {derivId}</p>
          
          {(txType === "deposit" || txType === "withdrawal") && (
            <p className="text-sm text-green-600 bg-green-50 inline-block px-3 py-1 rounded-full mt-3">
              M-PESA ID: {mpesaId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}