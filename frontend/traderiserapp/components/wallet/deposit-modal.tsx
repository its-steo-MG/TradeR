// components/wallet/deposit-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/format-currency";
import { type Wallet, api } from "@/lib/api";
import { toast } from "sonner";

interface DepositModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  onSetMessage: (msg: { type: "success" | "error"; text: string }) => void;
}

export function DepositModal({ onClose, onSuccess, onSetMessage }: DepositModalProps) {
  const [step, setStep] = useState<"account" | "amount" | "confirmation">("account");
  const [selectedAccountType, setSelectedAccountType] = useState<"standard" | "pro-fx">(
    (localStorage.getItem("account_type") as "standard" | "pro-fx") || "standard"
  );
  const [kesAmount, setKesAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [hasProFx, setHasProFx] = useState(false);

  const conversionRate = 130.0;
  const usdAmount = (Number.parseFloat(kesAmount) / conversionRate).toFixed(2);
  const minimumDeposit = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletsRes, mpesaRes] = await Promise.all([api.getWallets(), api.getMpesaNumber()]);
        if (walletsRes.error) throw new Error(walletsRes.error);
        const normalizedWallets = walletsRes.data?.wallets.map((w: Wallet) => ({
          ...w,
          balance: Number(w.balance) || 0,
        })) || [];
        setWallets(normalizedWallets);
        setPhoneNumber(mpesaRes.data?.phone_number || "");
        setHasProFx(normalizedWallets.some((w: Wallet) => w.account_type === "pro-fx"));
      } catch (error) {
        console.error("Failed to fetch deposit data:", error);
        toast.error("Failed to load deposit data");
      }
    };
    fetchData();

    const handleSessionUpdate = () => {
      const newType = (localStorage.getItem("account_type") as "standard" | "pro-fx") || "standard";
      setSelectedAccountType(newType);
      fetchData();
    };
    window.addEventListener("session-updated", handleSessionUpdate);
    return () => window.removeEventListener("session-updated", handleSessionUpdate);
  }, []);

  const handleNumpadClick = (value: string) => {
    if (value === "backspace") {
      setKesAmount(kesAmount.slice(0, -1));
    } else if (value === ".") {
      if (!kesAmount.includes(".")) {
        setKesAmount(kesAmount + value);
      }
    } else {
      setKesAmount(kesAmount + value);
    }
  };

  const handleProceed = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    console.log("Deposit proceed clicked, step:", step);
    if (selectedAccountType === "pro-fx" && !hasProFx) {
      onSetMessage({ type: "error", text: "You do not have a ProFX account. Please create one first." });
      return;
    }

    const usd = Number.parseFloat(usdAmount);
    if (usd < minimumDeposit) {
      setError(`Minimum deposit is $${minimumDeposit}`);
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Calling api.deposit with:", {
        amount: Number(kesAmount),
        account_type: selectedAccountType,
        wallet_type: "main",
        currency: "KSH",
        mpesa_phone: phoneNumber,
      });
      const res = await api.deposit({
        amount: Number(kesAmount),
        account_type: selectedAccountType,
        wallet_type: "main",
        currency: "KSH",
        mpesa_phone: phoneNumber,
      });
      if (res.error) throw new Error(res.error);
      console.log("Deposit API success, response:", res.data);
      setStep("confirmation");
      onSetMessage({ type: "success", text: "STK has been sent to your phone" });
      // Delay session-updated to avoid immediate redirect
      setTimeout(() => window.dispatchEvent(new Event("session-updated")), 100);
    } catch (err: unknown) {
      console.error("Deposit failed:", err);
      setError((err as Error).message || "Deposit failed");
      onSetMessage({ type: "error", text: (err as Error).message || "Deposit failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOkay = () => {
    console.log("Deposit confirmation Okay clicked");
    onClose();
    if (onSuccess) onSuccess();
    window.location.reload(); // Refresh only after acknowledgment
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom mx-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <button onClick={onClose} className="text-2xl font-bold text-slate-900">✕</button>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Deposit</h2>
          <div className="w-6" />
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto pb-20">
          {step === "account" ? (
            <>
              <div>
                <p className="text-slate-600 text-center mb-3 sm:mb-4 text-sm sm:text-base">To</p>
                <div className="flex gap-2 sm:gap-3 justify-center mb-6 sm:mb-8 flex-wrap">
                  <button
                    onClick={() => setSelectedAccountType("standard")}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-colors ${
                      selectedAccountType === "standard"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    TradeR
                  </button>
                  <button
                    onClick={() => setSelectedAccountType("pro-fx")}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-colors ${
                      selectedAccountType === "pro-fx"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    } ${!hasProFx ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={!hasProFx}
                  >
                    ProFX
                  </button>
                </div>
              </div>
              <button
                onClick={() => setStep("amount")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                Next
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : step === "amount" ? (
            <>
              <div>
                <p className="text-slate-600 text-center mb-2 text-sm sm:text-base">You Pay</p>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-1">
                  {formatCurrency(kesAmount || "0")} KES
                </div>
                <p className="text-center text-slate-500 text-xs sm:text-sm mb-4 sm:mb-6">
                  Conversion rate: 1 USD = {formatCurrency(conversionRate)} KES
                </p>
                <p className="text-slate-600 text-center mb-2 text-sm sm:text-base">You Get</p>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-6 sm:mb-8">
                  {formatCurrency(usdAmount || "0.00")} USD
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <label className="block text-slate-600 text-sm mb-2">M-Pesa Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="254712345678"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:outline-none transition-colors text-slate-900 placeholder-slate-400"
                />
              </div>

              <p className="text-center text-slate-600 text-xs sm:text-base">
                Minimum deposit amount is {minimumDeposit} USD
              </p>

              {error && <p className="text-red-600 text-sm text-center">{error}</p>}

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumpadClick(num)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 sm:py-4 px-2 sm:px-6 rounded-2xl transition-colors text-base sm:text-xl"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => handleNumpadClick(".")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 sm:py-4 px-2 sm:px-6 rounded-2xl transition-colors text-base sm:text-xl"
                >
                  .
                </button>
                <button
                  onClick={() => handleNumpadClick("0")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 sm:py-4 px-2 sm:px-6 rounded-2xl transition-colors text-base sm:text-xl"
                >
                  0
                </button>
                <button
                  onClick={() => handleNumpadClick("backspace")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 sm:py-4 px-2 sm:px-6 rounded-2xl transition-colors text-base sm:text-xl"
                >
                  ⌫
                </button>
              </div>

              <button
                onClick={handleProceed}
                disabled={!kesAmount || isSubmitting}
                className="w-full bg-slate-200 hover:bg-slate-300 disabled:bg-slate-200 text-slate-600 font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isSubmitting ? "Processing..." : "Deposit"}
                {!isSubmitting && (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </>
          ) : (
            <div className="text-center p-6">
              <p className="text-lg font-semibold mb-4">STK has been sent to your phone</p>
              <p className="text-sm text-gray-600 mb-6">Enter your PIN to complete the deposit</p>
              <button
                onClick={handleOkay}
                className="bg-purple-600 text-white py-2 px-4 rounded-lg"
              >
                Okay
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}