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
import { apiRequest } from "@/lib/api"; // we will use this

type Ctx = {
  popNotification: (n: MpesaNotification) => void;
};

const NotificationCtx = createContext<Ctx>({ popNotification: () => {} });

export const useNotificationPopup = () => useContext(NotificationCtx);

// =============== VAPID PUBLIC KEY ===============
const VAPID_PUBLIC_KEY =
  "BEwC0S-EtHz3M4BrnH80kkO9PQWxx_56-FvdZi48_7LkdJ-Ywcl71fOPAXwJ3LLiTh9PKoES4DfWbJ4LtMOAf1Q";

// Helper: convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

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

async function saveSubscriptionToBackend(subscription: PushSubscription) {
  const raw = subscription.toJSON();

  try {
    await apiRequest("/notifications/subscribe/", {
      method: "POST",
      body: JSON.stringify({
        endpoint: raw.endpoint,
        keys: {
          p256dh: raw.keys?.p256dh,
          auth: raw.keys?.auth,
        },
      }),
    });
    console.log("✅ Push subscription saved to backend");
  } catch (err) {
    console.error("Failed to save push subscription:", err);
  }
}

async function subscribeUserToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push messaging is not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log("✅ New push subscription created");
    } else {
      console.log("ℹ️ Already subscribed to push");
    }

    // Always send to backend (in case user logged in on new device)
    await saveSubscriptionToBackend(subscription);
  } catch (err) {
    console.error("Push subscription failed:", err);
  }
}

async function showSystemNotification(notif: MpesaNotification) {
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) return;

  const title = notif.caller_id || "MPESA";
  const body = stripHtml(notif.message);

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
      });
      return;
    } catch (err) {
      console.warn("Service Worker notification failed, falling back:", err);
    }
  }

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
    installSoundUnlock();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(async (reg) => {
          console.log("✅ Service Worker registered:", reg.scope);

          // After SW is ready → ask permission + subscribe
          const granted = await ensureNotificationPermission();
          if (granted) {
            await subscribeUserToPush();
          }
        })
        .catch((err) => {
          console.error("❌ Service Worker registration failed:", err);
        });
    }
  }, []);

  const popNotification = useCallback((n: MpesaNotification) => {
    // 1. In-app popup
    setQueue((q) => [...q, n]);

    // 2. Local system notification (when app is open)
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

      <div className="fixed top-0 inset-x-0 z-[9999] flex flex-col items-center pointer-events-none">
        {queue.map((n) => (
          <CallerPopup key={n.id} notif={n} onDone={() => dismiss(n.id)} />
        ))}
      </div>
    </NotificationCtx.Provider>
  );
}