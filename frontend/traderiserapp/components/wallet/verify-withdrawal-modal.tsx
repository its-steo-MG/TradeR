// components/wallet/verify-withdrawal-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface VerifyWithdrawalModalProps {
  transactionId: string;
  onClose: () => void;
  onSuccess?: () => void;
  onSetMessage: (msg: { type: "success" | "error"; text: string }) => void;
}

export function VerifyWithdrawalModal({
  transactionId,
  onClose,
  onSuccess,
  onSetMessage,
}: VerifyWithdrawalModalProps) {
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      setError("Please enter OTP code");
      return;
    }

    if (otpCode.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await api.verifyWithdrawal({
        code: otpCode,
        transaction_id: Number(transactionId),
      });
      if (res.error) throw new Error(res.error);

      setShowSuccess(true);
    } catch (err) {
      onSetMessage({
        type: "error",
        text: (err as Error).message || "Failed to verify OTP",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await api.resendOTP(transactionId);
      if (res.error) throw new Error(res.error);
      onSetMessage({ type: "success", text: "New OTP sent to your email" });
      setTimeLeft(60);
      setCanResend(false);
    } catch (err) {
      onSetMessage({
        type: "error",
        text: (err as Error).message || "Failed to resend OTP",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNumpadClick = (value: string) => {
    if (value === "backspace") {
      setOtpCode(otpCode.slice(0, -1));
    } else if (otpCode.length < 6) {
      setOtpCode(otpCode + value);
    }
  };

  const handleOkay = () => {
    setShowSuccess(false);
    onClose();
    setTimeout(() => {
      window.dispatchEvent(new Event("session-updated"));
    }, 100);
  };

  // ========== SUCCESS CARD (solid opaque) ==========
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
        <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700">
          <div className="text-center space-y-5">
            {/* Success Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                Withdrawal Successful!
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 sm:text-base">
                Withdrawal request received. Funds will be sent shortly.
              </p>
            </div>

            <button
              onClick={handleOkay}
              className="w-full rounded-xl bg-purple-600 py-3.5 font-semibold text-white transition-colors hover:bg-purple-700"
            >
              Okay
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== OTP CARD ==========
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-t-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in slide-in-from-bottom mx-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="text-2xl font-bold text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-zinc-400"
          >
            ✕
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Enter OTP Code
          </h2>
          <div className="w-6" />
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <p className="text-center text-slate-600 dark:text-zinc-400 text-sm sm:text-base">
            Enter the 6-digit code sent to your email
          </p>

          {/* OTP Boxes */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center bg-white dark:bg-zinc-800"
              >
                {otpCode[i] || ""}
              </div>
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                onClick={() => handleNumpadClick(num)}
                disabled={otpCode.length >= 6}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-50 text-slate-900 dark:text-white font-semibold py-3 sm:py-4 rounded-xl transition-colors text-base sm:text-lg"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleNumpadClick("0")}
              disabled={otpCode.length >= 6}
              className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-50 text-slate-900 dark:text-white font-semibold py-3 sm:py-4 rounded-xl transition-colors text-base sm:text-lg col-span-2"
            >
              0
            </button>
            <button
              onClick={() => handleNumpadClick("backspace")}
              className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white font-semibold py-3 sm:py-4 rounded-xl transition-colors text-base sm:text-lg"
            >
              ⌫
            </button>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            onClick={handleVerifyOTP}
            disabled={otpCode.length !== 6 || isSubmitting}
            className="drop-on-top relative w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 sm:py-4 rounded-xl transition-all disabled:opacity-50"
          >
            <span className="relative z-[1]">
              {isSubmitting ? "Verifying..." : "Verify and Withdraw"}
            </span>
          </button>

          <button
            onClick={handleResendOTP}
            disabled={!canResend || isSubmitting}
            className="w-full text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 disabled:text-slate-400 dark:disabled:text-zinc-600 font-semibold py-2 transition-colors text-sm"
          >
            {canResend ? "Resend Code" : `Resend in ${timeLeft}s`}
          </button>
        </div>
      </div>
    </div>
  );
}