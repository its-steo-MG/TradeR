import { useEffect, useRef, useState } from "react";
import type { MpesaNotification } from "@/lib/api";

export default function CallerPopup({
  notif,
  onDone,
}: {
  notif: MpesaNotification;
  onDone: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (expanded) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = setTimeout(onDone, 6500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [expanded, onDone]);

  return (
    <div
      className="caller-pop pointer-events-auto mt-[max(env(safe-area-inset-top),10px)] mx-3 w-[min(94vw,420px)]"
      role="alert"
      aria-live="assertive"
    >
      <div
        className="relative overflow-hidden transition-all active:scale-[0.98] cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        style={{
          background: "rgba(50, 50, 52, 0.95)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderRadius: expanded ? "1.5rem" : "2rem",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
        }}
      >
        <div className="relative flex items-start gap-3 px-3.5 py-2.5">
          {/* Avatar */}
          <div className="relative h-10 w-10 flex-shrink-0 mt-0.5">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#6ba3d8] to-[#3d6fa0] flex items-center justify-center overflow-hidden">
              <svg
                viewBox="0 0 24 24"
                className="h-5.5 w-5.5 text-white/95"
                fill="currentColor"
              >
                <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6Z" />
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-[5px] bg-[#34c759] flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-white" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-white tracking-tight">
                {notif.caller_id || "MPESA"}
              </span>
              <span className="text-[12px] text-white/45 ml-auto flex-shrink-0">
                now
              </span>
            </div>

            <div
              className={`text-[13px] leading-[1.35] text-white/90 mt-0.5 ${
                expanded ? "" : "line-clamp-2"
              }`}
              dangerouslySetInnerHTML={{ __html: notif.message }}
            />
          </div>
        </div>

        {/* Dismiss only when expanded */}
        {expanded && (
          <div
            className="relative px-3.5 pb-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onDone}
              className="drop-on-top relative w-full rounded-full bg-white/10 py-1.5 text-[12px] font-semibold text-white/90"
            >
              <span className="relative z-[1]">Dismiss</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}