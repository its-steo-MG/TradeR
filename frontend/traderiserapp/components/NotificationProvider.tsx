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
import { apiRequest } from "@/lib/api";

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

    await saveSubscriptionToBackend(subscription);
  } catch (err) {
    console.error("Push subscription failed:", err);
  }
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
    // 1. Show beautiful in-app popup only
    setQueue((q) => [...q, n]);

    // 2. Sound + vibration
    void playNotificationSound();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([60, 30, 60]);
    }

    // ❌ We no longer call showSystemNotification()
    // The real Web Push from the backend handles the system notification centre
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