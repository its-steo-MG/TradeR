"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
  useEffect,
} from "react";
import type { MpesaNotification } from "@/lib/api";
import CallerPopup from "./CallerPopup";
import {
  installSoundUnlock,
  playNotificationSound,
} from "@/lib/notification-sound";

type Ctx = {
  popNotification: (n: MpesaNotification) => void;
};

const NotificationCtx = createContext<Ctx>({ popNotification: () => {} });

export const useNotificationPopup = () => useContext(NotificationCtx);

// Remove HTML tags for the system notification
function stripHtml(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, "");
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

async function ensureNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

async function showSystemNotification(notif: MpesaNotification) {
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) return;

  const title = notif.caller_id || "MPESA";
  const body = stripHtml(notif.message);

  // Prefer Service Worker (works on lock screen + background)
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: "/images/notification-icon.png",
        badge: "/images/notification-icon.png",
        tag: `mpesa-${notif.id}`,
        requireInteraction: false,
        data: { notificationId: notif.id },
        silent: false,
      });
      return;
    } catch (err) {
      console.warn("Service Worker notification failed, falling back:", err);
    }
  }

  // Fallback
  new Notification(title, {
    body,
    icon: "/images/notification-icon.png",
    tag: `mpesa-${notif.id}`,
  });
}

export default function NotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [queue, setQueue] = useState<MpesaNotification[]>([]);

  useEffect(() => {
    // Unlock sound
    installSoundUnlock();

    // Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("✅ Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.error("❌ Service Worker registration failed:", err);
        });
    }

    // Ask for notification permission early
    ensureNotificationPermission();
  }, []);

  const popNotification = useCallback((n: MpesaNotification) => {
    // 1. Keep original in-app popup (unchanged)
    setQueue((q) => [...q, n]);

    // 2. Real system notification (Notification Center + Lock Screen)
    void showSystemNotification(n);

    // 3. Sound + vibration
    void playNotificationSound();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([60, 30, 60]);
    }
  }, []);

  const dismiss = useCallback((id: number) => {
    setQueue((q) => q.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationCtx.Provider value={{ popNotification }}>
      {children}

      {/* Original in-app popup - completely unchanged */}
      <div className="fixed top-0 inset-x-0 z-[9999] flex flex-col items-center pointer-events-none">
        {queue.map((n) => (
          <CallerPopup key={n.id} notif={n} onDone={() => dismiss(n.id)} />
        ))}
      </div>
    </NotificationCtx.Provider>
  );
}