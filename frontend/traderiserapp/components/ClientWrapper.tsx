"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface User {
  kyc_status?: "pending" | "approved" | "rejected";
}

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isGradientPage = ["/", "/login", "/signup"].includes(pathname);
  const isAuthPage = ["/login", "/signup", "/"].includes(pathname);

  const [kycStatus, setKycStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [showNotice, setShowNotice] = useState(true);

  useEffect(() => {
    if (isAuthPage) return;

    const checkKYC = async () => {
      try {
        // Always fetch fresh status from backend
        const res = await api.getAccount();
        const user = (res.data as any)?.user as User | undefined;

        if (user?.kyc_status) {
          setKycStatus(user.kyc_status);

          // Keep localStorage in sync
          const current = localStorage.getItem("user_session");
          if (current) {
            const parsed = JSON.parse(current);
            parsed.kyc_status = user.kyc_status;
            localStorage.setItem("user_session", JSON.stringify(parsed));
          }
        }
      } catch {}
    };

    checkKYC();
  }, [pathname, isAuthPage]);

  // Show notice for pending (after submission) and rejected
  const shouldShowBanner =
    !isAuthPage &&
    kycStatus &&
    (kycStatus === "pending" || kycStatus === "rejected") &&
    showNotice;

  return (
    <div className={isGradientPage ? "gradient-bg min-h-screen" : "min-h-screen"}>
      {/* Floating KYC Notice Card */}
      {shouldShowBanner && (
        <div className="fixed top-4 right-4 z-[99999] w-full max-w-sm">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl shadow-2xl p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-amber-400 mb-1">
                  {kycStatus === "rejected" ? "KYC Rejected" : "KYC Under Review"}
                </h4>

                <p className="text-sm text-white/80 leading-relaxed">
                  {kycStatus === "rejected"
                    ? "Your previous KYC submission was rejected. Please resubmit your Proof of Identity."
                    : "Your Proof of Identity has been submitted and is currently under review. You will receive an email once it is approved."}
                </p>

                <div className="mt-4 flex gap-3">
                  <Link
                    href="/kyc"
                    className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {kycStatus === "rejected" ? "Resubmit KYC" : "View Status"}
                  </Link>

                  <button
                    onClick={() => setShowNotice(false)}
                    className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowNotice(false)}
                className="text-white/50 hover:text-white p-1 -mr-1 -mt-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}