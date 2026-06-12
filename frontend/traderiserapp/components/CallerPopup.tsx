"use client";

import { useEffect } from "react";
import type { MpesaNotification } from "@/lib/api";

export default function CallerPopup({
  notif,
  onDone,
}: {
  notif: MpesaNotification;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 6500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="caller-pop pointer-events-auto mt-[max(env(safe-area-inset-top),12px)] mx-3 w-[min(92vw,360px)]"
      onClick={onDone}
      role="alert"
      aria-live="assertive"
    >
      <div className="ios-notification-card transition-all active:scale-[0.985]">
        
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#3a2a5c] to-[#1a1230] flex items-center justify-center flex-shrink-0 ring-1 ring-white/10 avatar">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-white/90" fill="currentColor">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6Z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-title">
                {notif.caller_id || "MPESA"}
              </div>
              <div className="text-time">now</div>
            </div>
          </div>
        </div>

        {/* Message body */}
        <div 
          className="px-4 pb-5 text-body line-clamp-4"
          dangerouslySetInnerHTML={{
            __html: notif.message
          }}
        />

        {/* Bottom indicator */}
        <div className="h-1 w-9 bg-white/30 rounded-full mx-auto mb-3.5" />
      </div>
    </div>
  );
}