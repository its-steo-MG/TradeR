"use client";

import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { AlertCircle, X, Phone, PhoneOff } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface User {
  kyc_status?: "pending" | "approved" | "rejected";
  is_staff?: boolean;
  username?: string;
}

interface IncomingCall {
  call_id: number;
  user: {
    id: number;
    username: string;
  };
}

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isGradientPage = ["/", "/login", "/signup"].includes(pathname);
  const isAuthPage = ["/login", "/signup", "/"].includes(pathname);

  const [kycStatus, setKycStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [showNotice, setShowNotice] = useState(true);

  // ==================== GLOBAL INCOMING CALL (for staff) ====================
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isAnsweringGlobal, setIsAnsweringGlobal] = useState(false);
  const callWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load user from localStorage
  useEffect(() => {
    const rawSession = localStorage.getItem("user_session");
    if (rawSession) {
      try {
        const session = JSON.parse(rawSession);
        setCurrentUser(session);
      } catch {}
    }
  }, []);

  const isStaff = currentUser?.is_staff === true;

  // ==================== GLOBAL CALL WEBSOCKET (Staff only) ====================
  const connectGlobalCallSocket = useCallback(() => {
    const token = localStorage.getItem("access_token")?.replace(/^"|"$/g, "");
    if (!token || !isStaff) return;

    const WS_BASE = "ws://localhost:8000"; // Change to wss:// in production
    const wsUrl = `${WS_BASE}/ws/call/?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[GlobalCall] Staff connected to call WebSocket");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "new_incoming_call" && data.call_id) {
          // Only show if we're not already in a call
          setIncomingCall({
            call_id: data.call_id,
            user: data.user || { id: 0, username: "User" },
          });
        }

        if (data.type === "call_ended") {
          setIncomingCall(null);
        }
      } catch (e) {
        console.error("[GlobalCall] Parse error", e);
      }
    };

    ws.onclose = () => {
      console.log("[GlobalCall] Disconnected, reconnecting...");
      reconnectTimeoutRef.current = setTimeout(connectGlobalCallSocket, 4000);
    };

    ws.onerror = (err) => {
      console.error("[GlobalCall] WebSocket error", err);
    };

    callWsRef.current = ws;
  }, [isStaff]);

  // Connect global call socket for staff
  useEffect(() => {
    if (isStaff) {
      connectGlobalCallSocket();
    }

    return () => {
      if (callWsRef.current) callWsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [isStaff, connectGlobalCallSocket]);

  // ==================== KYC CHECK ====================
  useEffect(() => {
    if (isAuthPage) return;

    const checkKYC = async () => {
      try {
        const res = await api.getAccount();
        const user = (res.data as any)?.user as User | undefined;

        if (user?.kyc_status) {
          setKycStatus(user.kyc_status);

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

  const shouldShowBanner =
    !isAuthPage &&
    kycStatus &&
    (kycStatus === "pending" || kycStatus === "rejected") &&
    showNotice;

  // ==================== GLOBAL INCOMING CALL HANDLERS ====================
  const handleAnswerGlobalCall = async () => {
    if (!incomingCall) return;

    setIsAnsweringGlobal(true);

    // Store the call_id so CustomerCarePage can pick it up
    localStorage.setItem("pending_incoming_call_id", incomingCall.call_id.toString());

    // Close the global modal
    setIncomingCall(null);

    // Navigate to customer care page (where full WebRTC logic lives)
    router.push("/customer-care");

    setIsAnsweringGlobal(false);
  };

  const handleDeclineGlobalCall = () => {
    setIncomingCall(null);
    // Optionally notify backend that call was declined
  };

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

      {/* ==================== GLOBAL INCOMING CALL MODAL (Staff) ==================== */}
      {incomingCall && isStaff && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-green-500/30 rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                <Phone className="h-10 w-10 text-green-400 animate-pulse" />
              </div>

              <h2 className="text-3xl font-bold text-white mb-2">Incoming Support Call</h2>
              <p className="text-xl text-white/80 mb-1">
                from <span className="font-semibold text-white">{incomingCall.user.username}</span>
              </p>
              <p className="text-sm text-white/50 mb-8">Call ID: #{incomingCall.call_id}</p>

              <div className="flex gap-4">
                <button
                  onClick={handleDeclineGlobalCall}
                  disabled={isAnsweringGlobal}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-4 text-lg font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <PhoneOff className="h-5 w-5" />
                  Decline
                </button>

                <button
                  onClick={handleAnswerGlobalCall}
                  disabled={isAnsweringGlobal}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-lg font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Phone className="h-5 w-5" />
                  {isAnsweringGlobal ? "Connecting..." : "Answer Call"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
