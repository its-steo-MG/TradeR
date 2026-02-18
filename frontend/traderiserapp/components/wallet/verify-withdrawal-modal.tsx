// components/wallet/verify-withdrawal-modal.tsx
"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

interface VerifyWithdrawalModalProps {
  transactionId: string
  onClose: () => void
  onSuccess?: () => void
  onSetMessage: (msg: { type: 'success' | 'error', text: string }) => void
}

export function VerifyWithdrawalModal({ transactionId, onClose, onSuccess, onSetMessage }: VerifyWithdrawalModalProps) {
  const [otpCode, setOtpCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [timeLeft, setTimeLeft] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true)
      return
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft])

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      setError("Please enter OTP code")
      return
    }

    if (otpCode.length !== 6) {
      setError("OTP must be 6 digits")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const res = await api.verifyWithdrawal({
        code: otpCode,
        transaction_id: Number(transactionId),
      })
      if (res.error) throw new Error(res.error)

      setShowSuccess(true)
    } catch (err) {
      onSetMessage({ type: 'error', text: (err as Error).message || "Failed to verify OTP" })
    } finally {
      setIsSubmitting(false)
    }
  }

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
    onSetMessage({ type: "error", text: (err as Error).message || "Failed to resend OTP" });
  } finally {
    setIsSubmitting(false);
  }
}

  const handleNumpadClick = (value: string) => {
    if (value === "backspace") {
      setOtpCode(otpCode.slice(0, -1))
    } else if (otpCode.length < 6) {
      setOtpCode(otpCode + value)
    }
  }

  const handleOkay = () => {
  setShowSuccess(false);

  // Close modal BEFORE refreshing session
  onClose();

  // Tell layout & page to refresh session
  setTimeout(() => {
    window.dispatchEvent(new Event("session-updated"));
  }, 100);

  // ❌ Do NOT reload — causes production logout
};


  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 sm:p-8">
          <div className="text-center">
            <p className="text-xl font-bold text-green-600 mb-4">Withdrawal Successful!</p>
            <p className="text-sm text-gray-600 mb-6">Withdrawal request received. Funds will be sent shortly.</p>
            <button
              onClick={handleOkay}
              className="bg-purple-600 text-white py-2 px-4 rounded-lg"
            >
              Okay
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom mx-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <button onClick={onClose} className="text-2xl font-bold text-slate-900">✕</button>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Enter OTP Code</h2>
          <div className="w-6" />
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <p className="text-center text-slate-600 text-sm sm:text-base">
            Enter the 6-digit code sent to your email
          </p>

          {/* OTP Input */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-slate-200 rounded-xl text-2xl font-bold text-slate-900 flex items-center justify-center bg-white"
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
                className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:opacity-50 text-slate-900 font-semibold py-3 sm:py-4 rounded-xl transition-colors text-base sm:text-lg"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleNumpadClick("0")}
              disabled={otpCode.length >= 6}
              className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:opacity-50 text-slate-900 font-semibold py-3 sm:py-4 rounded-xl transition-colors text-base sm:text-lg col-span-2"
            >
              0
            </button>
            <button
              onClick={() => handleNumpadClick("backspace")}
              className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 sm:py-4 rounded-xl transition-colors text-base sm:text-lg"
            >
              ⌫
            </button>
          </div>

          {/* Error Message */}
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          {/* Verify Button */}
          <button
            onClick={handleVerifyOTP}
            disabled={otpCode.length !== 6 || isSubmitting}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 sm:py-4 rounded-xl transition-colors"
          >
            {isSubmitting ? "Verifying..." : "Verify and Withdraw"}
          </button>

          {/* Resend Button */}
          <button
            onClick={handleResendOTP}
            disabled={!canResend || isSubmitting}
            className="w-full text-purple-600 hover:text-purple-700 disabled:text-slate-400 font-semibold py-2 transition-colors text-sm"
          >
            {canResend ? "Resend Code" : `Resend in ${timeLeft}s`}
          </button>
        </div>
      </div>
    </div>
  )
}