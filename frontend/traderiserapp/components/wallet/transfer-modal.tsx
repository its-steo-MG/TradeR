"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/format-currency";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface TransferModalProps {
  onClose: () => void;
  onSuccess: (txId?: string) => void;
  onSetMessage: (msg: { type: "success" | "error"; text: string }) => void;
}

export function TransferModal({ onClose, onSuccess, onSetMessage }: TransferModalProps) {
  const [step, setStep] = useState<"sender" | "recipient" | "amount" | "confirmation">("sender");
  const [senderType, setSenderType] = useState<"standard" | "pro-fx">(
    (localStorage.getItem("account_type") as "standard" | "pro-fx") || "standard"
  );
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientType, setRecipientType] = useState<"standard" | "pro-fx">("standard");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hasProFx, setHasProFx] = useState(false);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const res = await api.getWallets();
        if (res.error || !res.data?.wallets) {
          setHasProFx(false);
          return;
        }

        // Safely check without defining conflicting types
        const hasPro = (res.data.wallets as Array<{ account_type?: string }>).some(
          (wallet) => wallet.account_type === "pro-fx"
        );
        setHasProFx(hasPro);
      } catch {
        console.error("Failed to load accounts");
        setHasProFx(false);
      }
    };
    fetchWallets();
  }, []);

  const handleNumpadClick = (value: string) => {
    if (value === "backspace") {
      setAmount((prev) => prev.slice(0, -1));
    } else if (value === "." && !amount.includes(".")) {
      setAmount((prev) => prev + ".");
    } else if (/^\d$/.test(value) && amount.length < 12) {
      setAmount((prev) => prev + value);
    }
  };

  const handleInitiate = async () => {
    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await api.initiateTransfer({
        amount: numericAmount,
        sender_account_type: senderType,
        recipient_email: recipientEmail.trim(),
        recipient_account_type: recipientType,
      });

      if (res.error) {
        throw new Error(res.error);
      }

      toast.success("Transfer initiated! Check your email for OTP.");
      onSuccess(res.data?.transaction_id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Transfer failed. Please try again.";
      setError(message);
      onSetMessage({ type: "error", text: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <button onClick={onClose} className="text-2xl font-bold text-slate-900">
            ✕
          </button>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Transfer Funds</h3>
          <div className="w-6" />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[90vh] overflow-y-auto pb-20">
          {/* Sender Step */}
          {step === "sender" && (
            <div className="space-y-4">
              <p className="text-center text-slate-600 text-lg">Select source account</p>
              <button
                onClick={() => {
                  setSenderType("standard");
                  setStep("recipient");
                }}
                className="w-full bg-purple-600 text-white py-6 rounded-2xl text-xl font-semibold hover:bg-purple-700 transition-colors"
              >
                TradeR Account
              </button>
              {hasProFx && (
                <button
                  onClick={() => {
                    setSenderType("pro-fx");
                    setStep("recipient");
                  }}
                  className="w-full bg-slate-200 text-slate-900 py-6 rounded-2xl text-xl font-semibold hover:bg-slate-300 transition-colors"
                >
                  ProFX Account
                </button>
              )}
            </div>
          )}

          {/* Recipient Step */}
          {step === "recipient" && (
            <div className="space-y-6">
              <p className="text-center text-slate-600 text-lg">Enter recipient details</p>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Recipient Email"
                className="w-full px-6 py-4 border border-slate-300 rounded-2xl text-lg focus:outline-none focus:border-purple-600"
              />
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setRecipientType("standard")}
                  className={`py-4 rounded-2xl text-lg font-semibold transition-colors ${
                    recipientType === "standard"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-200 text-slate-900 hover:bg-slate-300"
                  }`}
                >
                  TradeR
                </button>
                <button
                  onClick={() => setRecipientType("pro-fx")}
                  className={`py-4 rounded-2xl text-lg font-semibold transition-colors ${
                    recipientType === "pro-fx"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-200 text-slate-900 hover:bg-slate-300"
                  }`}
                >
                  ProFX
                </button>
              </div>
              <button
                onClick={() => setStep("amount")}
                disabled={!recipientEmail.includes("@")}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-3"
              >
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Amount Step */}
          {step === "amount" && (
            <div className="space-y-6">
              <p className="text-center text-slate-600 text-lg">Enter transfer amount (USD)</p>
              <div className="text-center">
                <p className="text-4xl font-bold text-slate-900">${amount || "0.00"}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleNumpadClick(n)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-5 rounded-2xl text-2xl transition-colors"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => handleNumpadClick(".")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-5 rounded-2xl text-2xl"
                >
                  .
                </button>
                <button
                  onClick={() => handleNumpadClick("0")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-5 rounded-2xl text-2xl"
                >
                  0
                </button>
                <button
                  onClick={() => handleNumpadClick("backspace")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-5 rounded-2xl text-2xl"
                >
                  ⌫
                </button>
              </div>

              <button
                onClick={() => setStep("confirmation")}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-3"
              >
                Review Transfer
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Confirmation Step */}
          {step === "confirmation" && (
            <div className="space-y-6 text-center">
              <p className="text-lg text-slate-600">Please confirm transfer details</p>
              <div className="space-y-3 text-left bg-slate-50 p-6 rounded-2xl">
                <p>
                  <span className="font-semibold">From:</span>{" "}
                  {senderType === "standard" ? "TradeR" : "ProFX"} Account
                </p>
                <p>
                  <span className="font-semibold">To:</span> {recipientEmail}
                </p>
                <p>
                  <span className="font-semibold">Account Type:</span>{" "}
                  {recipientType === "standard" ? "TradeR" : "ProFX"}
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  Amount: ${formatCurrency(parseFloat(amount || "0"))}
                </p>
              </div>

              {error && <p className="text-red-600 text-center">{error}</p>}

              <button
                onClick={handleInitiate}
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-4 rounded-2xl transition-colors"
              >
                {isSubmitting ? "Processing..." : "Confirm & Send"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}