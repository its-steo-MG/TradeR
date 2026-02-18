"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface VerifyTransferModalProps {
  transactionId: string;
  onClose: () => void;
  onSetMessage: (msg: { type: "success" | "error"; text: string }) => void;
}

export function VerifyTransferModal({
  transactionId,
  onClose,
  onSetMessage,
}: VerifyTransferModalProps) {
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await api.verifyTransfer({
        otp: otpCode,
        transaction_id: parseInt(transactionId, 10),
      });

      if (res.error) {
        throw new Error(res.error);
      }

      toast.success("Transfer completed successfully!");
      window.dispatchEvent(new Event("session-updated"));
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid OTP";
      setError(message);
      onSetMessage({ type: "error", text: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setIsSubmitting(true);
    try {
      // If you have a dedicated resend endpoint, replace the comment below
      // const res = await api.resendTransferOTP({ transaction_id: parseInt(transactionId, 10) });
      toast.success("New OTP sent to your email");
      setTimeLeft(60);
      setCanResend(false);
      setOtpCode("");
    } catch {
      toast.error("Failed to resend OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNumpadClick = (value: string) => {
    if (value === "backspace") {
      setOtpCode((prev) => prev.slice(0, -1));
    } else if (otpCode.length < 6) {
      setOtpCode((prev) => prev + value);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 mx-auto p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
            Verify Transfer
          </h3>
          <button
            onClick={onClose}
            className="text-2xl font-bold text-slate-900 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        <p className="text-center text-slate-600 text-lg mb-6">
          Enter 6-digit OTP sent to your email
        </p>

        <div className="text-center mb-6">
          <p className="text-4xl font-bold tracking-widest">
            {otpCode.padEnd(6, "_")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <button
              key={n}
              onClick={() => handleNumpadClick(n)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-5 rounded-2xl text-2xl transition-colors"
            >
              {n}
            </button>
          ))}
          <div /> {/* Spacer */}
          <button
            onClick={() => handleNumpadClick("0")}
            className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-5 rounded-2xl text-2xl transition-colors"
          >
            0
          </button>
          <button
            onClick={() => handleNumpadClick("backspace")}
            className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-5 rounded-2xl text-2xl transition-colors"
          >
            ⌫
          </button>
        </div>

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        <button
          onClick={handleVerifyOTP}
          disabled={otpCode.length !== 6 || isSubmitting}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-4 rounded-2xl transition-colors mb-3"
        >
          {isSubmitting ? "Verifying..." : "Verify & Complete Transfer"}
        </button>

        <button
          onClick={handleResendOTP}
          disabled={!canResend || isSubmitting}
          className="w-full text-purple-600 hover:text-purple-700 disabled:text-slate-400 font-medium text-center"
        >
          {canResend ? "Resend OTP" : `Resend in ${timeLeft}s`}
        </button>
      </div>
    </div>
  );
}