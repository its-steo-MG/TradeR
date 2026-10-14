"use client";

import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { AlertCircle, X, Phone, PhoneOff } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { TraderPulseWidget } from "@/components/traderpulse/TraderPulseWidget";
import UpdateAvailable from "@/components/UpdateAvailable";

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

  // ==================== GLOBAL INCOMING CALL (Staff) ====================
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const callWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load user session
  useEffect(() => {
    const rawSession = localStorage.getItem("user_session");
    if (rawSession) {
      try {
        setCurrentUser(JSON.parse(rawSession));
      } catch {}
    }
  }, []);

  const isStaff = currentUser?.is_staff === true;

  // ==================== PERSISTENCE: Restore pending call on load ====================
  useEffect(() => {
    if (!isStaff) return;

    const savedCallId = localStorage.getItem("pending_incoming_call_id");
    if (savedCallId && !incomingCall) {
      setIncomingCall({
        call_id: Number(savedCallId),
        user: { id: 0, username: "Support User" },
      });
    }
  }, [isStaff]);

  // ==================== GLOBAL CALL WEBSOCKET ====================
  const connectGlobalCallSocket = useCallback(() => {
    const token = localStorage.getItem("access_token")?.replace(/^"|"$/g, "");
    if (!token || !isStaff) return;

    const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const wsUrl = `${WS_BASE}/ws/call/?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[GlobalCallWS] Staff connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "new_incoming_call" && data.call_id) {
          const callInfo: IncomingCall = {
            call_id: data.call_id,
            user: data.user || { id: 0, username: "User" },
          };

          localStorage.setItem("pending_incoming_call_id", data.call_id.toString());
          setIncomingCall(callInfo);
        }

        if (data.type === "call_ended" || data.type === "call_answered") {
          const endedId = data.call_id;
          if (endedId && incomingCall?.call_id === endedId) {
            setIncomingCall(null);
            localStorage.removeItem("pending_incoming_call_id");
          }
        }
      } catch (e) {
        console.error("[GlobalCallWS] Parse error", e);
      }
    };

    ws.onclose = () => {
      reconnectTimeoutRef.current = setTimeout(connectGlobalCallSocket, 4000);
    };

    callWsRef.current = ws;
  }, [isStaff, incomingCall?.call_id]);

  useEffect(() => {
    if (isStaff) {
      connectGlobalCallSocket();
    }
    return () => {
      callWsRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [isStaff, connectGlobalCallSocket]);

  // ==================== KYC BANNER ====================
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

  const shouldShowKycBanner =
    !isAuthPage &&
    kycStatus &&
    (kycStatus === "pending" || kycStatus === "rejected") &&
    showNotice;

  // ==================== GLOBAL INCOMING CALL ACTIONS ====================
  const handleAnswerFromAnywhere = () => {
    if (!incomingCall) return;

    setIsAnswering(true);
    router.push("/customer-care");
    setIsAnswering(false);
  };

  const handleDeclineFromAnywhere = () => {
    if (!incomingCall) return;

    localStorage.removeItem("pending_incoming_call_id");
    setIncomingCall(null);
  };

  return (
    <div className={isGradientPage ? "gradient-bg min-h-screen" : "min-h-screen"}>
      {/* ==================== KYC Floating Banner ==================== */}
      {shouldShowKycBanner && (
        <div className="fixed top-4 right-4 z-[99999] w-full max-w-sm">
          <div className="bg-card border border-amber-500/30 rounded-[1.8rem] shadow-2xl p-5 text-card-foreground backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-amber-500 dark:text-amber-400 mb-1">
                  {kycStatus === "rejected" ? "KYC Rejected" : "KYC Under Review"}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {kycStatus === "rejected"
                    ? "Your previous KYC submission was rejected. Please resubmit your Proof of Identity."
                    : "Your Proof of Identity has been submitted and is currently under review."}
                </p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href="/kyc"
                    className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
                  >
                    {kycStatus === "rejected" ? "Resubmit KYC" : "View Status"}
                  </Link>
                  <button
                    onClick={() => setShowNotice(false)}
                    className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowNotice(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== GLOBAL PERSISTENT INCOMING CALL CARD (Staff) ==================== */}
      {incomingCall && isStaff && (
        <div className="fixed bottom-6 right-6 z-[999999] w-full max-w-sm">
          <div className="rounded-[2.2rem] border border-green-500/40 bg-card/95 p-5 shadow-2xl backdrop-blur-xl text-card-foreground">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[1.8rem] bg-green-500/10">
                <Phone className="h-6 w-6 animate-pulse text-green-500 dark:text-green-400" />
              </div>

              <div className="flex-1">
                <div className="font-semibold text-foreground">Incoming Support Call</div>
                <div className="text-sm text-muted-foreground">
                  from{" "}
                  <span className="font-medium text-foreground">
                    {incomingCall.user.username}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Call #{incomingCall.call_id}
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleDeclineFromAnywhere}
                    disabled={isAnswering}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[1.8rem] border border-border bg-secondary/60 py-2.5 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
                  >
                    <PhoneOff className="h-4 w-4" /> Decline
                  </button>

                  <button
                    onClick={handleAnswerFromAnywhere}
                    disabled={isAnswering}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[1.8rem] bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    {isAnswering ? "Opening..." : "Answer Call"}
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  localStorage.removeItem("pending_incoming_call_id");
                  setIncomingCall(null);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {children}
      {!isAuthPage && <TraderPulseWidget />}
    </div>
  );
}